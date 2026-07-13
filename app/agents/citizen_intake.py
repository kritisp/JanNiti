import datetime
import logging
from app.services.gemini_service import GeminiService
from app.services.prompt_loader import PromptLoader
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def citizen_intake_task(request_dict: dict) -> dict:
    """Citizen Intelligence Agent Task"""
    logger.info("[Citizen Intelligence Agent] Starting text validation and cleaning...")
    
    from app.models.schemas import CitizenRequest, CitizenIntelligence
    req = CitizenRequest(**request_dict)
    
    if not req.text or len(req.text.strip()) < 5:
        raise ValueError("Citizen request text is too short or empty.")
        
    prompt = PromptLoader.get_prompt(
        "citizen_intelligence.txt",
        text=req.text,
        language=req.language,
        location=req.location
    )
    
    system_instruction = (
        "You are an AI that extracts and cleans raw citizen complaint text. "
        "You must return a valid JSON object with exactly these keys: "
        "'clean_text' (str), 'language' (str), 'translated_text' (str), 'location' (str)."
    )
    
    gemini = GeminiService()
    ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    request_id = f"REQ-{now.year}-{str(now.timestamp()).replace('.', '')[-6:]}"
    
    attachments = []
    if req.image_url: attachments.append(req.image_url)
    if req.audio_url: attachments.append(req.audio_url)
        
    citizen_intelligence = CitizenIntelligence(
        request_id=request_id,
        original_text=req.text,
        clean_text=ai_response.get("clean_text", req.text),
        translated_text=ai_response.get("translated_text", ""),
        language=ai_response.get("language", "Unknown"),
        location=ai_response.get("location", req.location),
        timestamp=now.isoformat(),
        attachments=attachments
    )
    
    return citizen_intelligence.model_dump()
