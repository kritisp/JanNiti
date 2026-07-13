import json
import os
from typing import List, Optional

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import logger
from app.schemas.citizen import AIStructuredOutput


def process_citizen_request(
    description: str,
    voice_path: Optional[str] = None,
    image_paths: Optional[List[str]] = None,
) -> AIStructuredOutput:
    """Executes the multi-stage AI pipeline via the Google Gemini API.

    Detects input language, translates to English, classifies the category,
    extracts details (urgency, sentiment, village context, population impact),
    and enforces a structured JSON schema outcome.
    """
    # 1. Developer Fallback (for offline testing / missing Gemini credentials)
    if (
        not settings.GEMINI_API_KEY 
        or settings.GEMINI_API_KEY.startswith("test_gemini_api_key")
    ):
        logger.warning(
            "Gemini API key is set to a placeholder. Triggering mock processing fallback."
        )
        return AIStructuredOutput(
            original_text=description,
            translated_text=f"[Translated] {description}",
            language="Auto Detect",
            category="Road",
            issue="Pavement degradation and waterlogging",
            infrastructure_type="Roadway Network",
            urgency="High",
            sentiment="Negative",
            location={
                "village": "Aurangpur",
                "district": "Araria",
                "state": "Bihar"
            },
            keywords=["road", "waterlogging", "transit"],
            confidence=0.95,
            affected_population=1200,
        )

    try:
        # Initialize Google GenAI client
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # 2. Build Multi-modal Prompt Context
        prompt = """
        You are a highly advanced Civic Intelligence Officer and AI Solutions Architect.
        Analyze the citizen development request text, and if provided, the voice audio bytes and reference images showing evidence of infrastructure problems.
        
        Extract and return a single structured JSON response.
        
        Ensure you cover the following pipeline steps:
        1. LANGUAGE DETECTION: Identify what language the request was submitted in (e.g. English, Hindi, Bengali, Tamil, etc.).
        2. TRANSLATION: Translate the raw citizen statement into clear, professional English if it is in another language.
        3. ISSUE CLASSIFICATION: Classify the development request into one of these strict categories:
           Road, Bridge, Drainage, Water Supply, Electricity, Hospital, School, Public Transport, Employment, Agriculture, Environment, Women's Safety, Youth Development, Sports, Skill Development, Others.
        4. ENTITY EXTRACTION: Identify the core issue, village, district, state, infrastructure type, urgency level (Low, Medium, High, Critical), sentiment (Positive, Neutral, Negative), and an estimate of the affected population count based on description metadata.
        5. KEYWORD IDENTIFICATION: List 3 to 5 core keyword tags.
        6. CONFIDENCE INDEX: Assign a probability float (0.0 to 1.0) indicating parsing accuracy.
        
        Your response must ONLY be a valid JSON object matching the following structure:
        {
          "original_text": "...",
          "translated_text": "...",
          "language": "...",
          "category": "...",
          "issue": "...",
          "infrastructure_type": "...",
          "urgency": "...",
          "sentiment": "...",
          "location": {
            "village": "...",
            "district": "...",
            "state": "..."
          },
          "keywords": ["...", "..."],
          "confidence": 0.95,
          "affected_population": 5000
        }
        """

        contents = [prompt, f"Raw Text Description: {description}"]

        # Append voice audio bytes if available
        if voice_path and os.path.exists(voice_path):
            logger.info(f"Appending voice notes file to Gemini payload: {voice_path}")
            mime_type = "audio/wav"
            if voice_path.lower().endswith(".mp3"):
                mime_type = "audio/mp3"
            elif voice_path.lower().endswith(".ogg"):
                mime_type = "audio/ogg"
            elif voice_path.lower().endswith(".m4a"):
                mime_type = "audio/m4a"

            with open(voice_path, "rb") as f:
                audio_data = f.read()

            contents.append(
                types.Part.from_bytes(data=audio_data, mime_type=mime_type)
            )

        # Append images if available
        if image_paths:
            for path in image_paths:
                if os.path.exists(path):
                    logger.info(f"Appending evidence photo to Gemini payload: {path}")
                    mime_type = "image/jpeg"
                    if path.lower().endswith(".png"):
                        mime_type = "image/png"

                    with open(path, "rb") as f:
                        img_data = f.read()

                    contents.append(
                        types.Part.from_bytes(data=img_data, mime_type=mime_type)
                    )

        # 3. Request structured response from Gemini Model
        # We target gemini-2.5-flash which is multimodal and fast
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2, # Lower temperature for stable structural extractions
            ),
        )

        # 4. Parse response text
        raw_json = response.text
        if not raw_json:
            raise ValueError("Gemini API returned an empty response.")

        logger.info(f"Gemini processing pipeline succeeded. Raw outcome: {raw_json}")
        data = json.loads(raw_json)

        # Convert dictionary to strictly typed Pydantic Schema
        return AIStructuredOutput(**data)

    except Exception as e:
        logger.exception(f"Error during Google Gemini AI Pipeline execution: {str(e)}")
        # Raise standard service exception to be handled by global FastAPI exception handler
        raise e
