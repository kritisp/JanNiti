import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationException
from app.core.logging import logger
from app.models.citizen_request import CitizenRequest
from app.schemas.citizen import CitizenRequestResponse
from app.services.gemini import process_citizen_request
from app.utils.storage import save_upload

router = APIRouter()


@router.post(
    "/submit",
    response_model=CitizenRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_citizen_request(
    description: str = Form(..., min_length=5, max_length=2000),
    village: str = Form(..., min_length=2, max_length=100),
    district: str = Form(..., min_length=2, max_length=100),
    state: str = Form(..., min_length=2, max_length=100),
    pin_code: str = Form(..., min_length=6, max_length=10),
    submitted_category: str = Form(..., min_length=2, max_length=50),
    citizen_name: Optional[str] = Form(None, max_length=100),
    phone: Optional[str] = Form(None, max_length=20),
    ward: Optional[str] = Form(None, max_length=50),
    language: Optional[str] = Form("Auto Detect", max_length=50),
    voice: Optional[UploadFile] = None,
    images: Optional[List[UploadFile]] = None,
    db: Session = Depends(get_db),
) -> CitizenRequest:
    """Ingests citizen requests, runs files through local storage, pings Gemini

    for entity classification, and maps duplication status.
    """
    logger.info(
        f"Ingesting citizen request. Category: {submitted_category} | Village: {village}"
    )

    # 1. Save upload assets (images + audio files)
    voice_url = None
    if voice:
        logger.info(f"Ingesting audio file: {voice.filename}")
        voice_url = save_upload(voice, "voice")

    image_urls = []
    if images:
        for img in images:
            if img.filename:  # Avoid empty file listings
                logger.info(f"Ingesting image file: {img.filename}")
                saved_url = save_upload(img, "images")
                image_urls.append(saved_url)

    # 2. Persist Raw Request in Database (Ensures raw data safety first)
    db_request = CitizenRequest(
        citizen_name=citizen_name,
        phone=phone,
        village=village,
        ward=ward,
        district=district,
        state=state,
        pin_code=pin_code,
        submitted_category=submitted_category,
        description=description,
        voice_url=voice_url,
        image_urls=image_urls if image_urls else None,
        processed=False,
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # 3. Resolve file paths on disk for Google Gemini Multimodal processing
    voice_disk_path = voice_url.lstrip("/") if voice_url else None
    image_disk_paths = [url.lstrip("/") for url in image_urls] if image_urls else []

    # 4. Trigger AI Pipeline
    try:
        ai_output = process_citizen_request(
            description=description,
            voice_path=voice_disk_path,
            image_paths=image_disk_paths,
        )

        # 5. Map AI Structured outputs to model
        db_request.processed = True
        db_request.original_text = ai_output.original_text
        db_request.translated_text = ai_output.translated_text
        db_request.detected_language = ai_output.language
        db_request.ai_category = ai_output.category
        db_request.extracted_issue = ai_output.issue
        db_request.infrastructure_type = ai_output.infrastructure_type
        db_request.urgency = ai_output.urgency
        db_request.sentiment = ai_output.sentiment
        db_request.resolved_village = ai_output.location.village
        db_request.resolved_district = ai_output.location.district
        db_request.resolved_state = ai_output.location.state
        db_request.keywords = ai_output.keywords
        db_request.confidence = ai_output.confidence
        db_request.affected_population = ai_output.affected_population

    except Exception as ai_err:
        # Commit raw record as unprocessed but do not halt client response
        logger.error(
            f"AI Pipeline failed for request {db_request.id}. Saving raw record. Details: {str(ai_err)}"
        )
        db_request.processed = False
        db.commit()
        return db_request

    # 6. Duplicate Detection (within same village & category in the last 14 days)
    # Using UTC time with timezone offset support
    cutoff_time = datetime.now(timezone.utc) - timedelta(days=14)
    
    duplicate_query = (
        db.query(CitizenRequest)
        .filter(
            CitizenRequest.id != db_request.id,
            CitizenRequest.village == db_request.village,
            CitizenRequest.submitted_category == db_request.submitted_category,
            CitizenRequest.created_at >= cutoff_time,
            CitizenRequest.is_duplicate == False,
        )
        .order_by(CitizenRequest.created_at.asc())
        .first()
    )

    if duplicate_query:
        logger.info(
            f"Duplicate identified. Linking request {db_request.id} to parent {duplicate_query.id}"
        )
        db_request.is_duplicate = True
        db_request.duplicate_of_id = duplicate_query.id
    else:
        db_request.is_duplicate = False

    # 7. Persist AI updates and Duplication references
    db.commit()
    db.refresh(db_request)

    # 8. Synchronize request with the Neo4j Knowledge Graph database
    if db_request.processed:
        from app.services.graph_service import GraphService
        GraphService.sync_complaint_to_graph(db_request)

    return db_request
