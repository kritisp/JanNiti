import datetime
import logging
import os
import tempfile
import urllib.request
from app.services.sarvam_service import SarvamService, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

class CitizenIntakeAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Citizen Intelligence Agent Task using SarvamService"""
        logger.info("[Citizen Intelligence Agent] Starting Sarvam language processing...")
        
        from app.models.schemas import AgentState, CitizenIntelligence
        state = AgentState(**state_dict)
        req = state.citizen_request
        
        sarvam = SarvamService()
        
        final_original_text = req.text if req.text else ""
        detected_language = "Unknown"
        language_code = "en-IN"
        
        # 1. Process Audio if present
        audio_transcript_en = ""
        if req.audio_url:
            logger.info(f"[Citizen Intelligence Agent] Processing audio attachment: {req.audio_url}")
            is_remote = req.audio_url.startswith("http://") or req.audio_url.startswith("https://")
            audio_path = req.audio_url
            
            try:
                if is_remote:
                    fd, audio_path = tempfile.mkstemp(suffix=".wav")
                    os.close(fd)
                    urllib.request.urlretrieve(req.audio_url, audio_path)
                
                if os.path.exists(audio_path):
                    res = sarvam.speech_to_text_translate(audio_path)
                    language_code = res["original_language"]
                    detected_language = SUPPORTED_LANGUAGES.get(language_code, "Unknown")
                    audio_transcript_en = res["translated_text"]
                    logger.info(f"Audio processed successfully. Language: {detected_language}")
                else:
                    logger.warning("Audio file not found locally.")
            except Exception as e:
                logger.error(f"Failed to process audio: {e}")
            finally:
                if is_remote and os.path.exists(audio_path):
                    os.remove(audio_path)
        
        # 2. Process Text if present
        text_transcript_en = ""
        if req.text and len(req.text.strip()) >= 5:
            detection = sarvam.detect_language(req.text)
            
            # If no audio or failed audio, text language takes precedence
            if not audio_transcript_en:
                detected_language = detection["language"]
                language_code = detection["code"]
            
            if detection["code"] != "en-IN":
                translation = sarvam.translate(req.text, source_language=detection["code"], target_language="en-IN")
                text_transcript_en = translation["translated_text"]
            else:
                text_transcript_en = req.text
                
        # 3. Combine results
        if not text_transcript_en and not audio_transcript_en:
            raise ValueError("Citizen request must have valid text or a valid audio file.")
            
        combined_translation = []
        if text_transcript_en:
            combined_translation.append(text_transcript_en)
        if audio_transcript_en:
            combined_translation.append(f"[Audio Transcript]: {audio_transcript_en}")
            
        final_translated_text = "\n\n".join(combined_translation)
        
        now = datetime.datetime.now(datetime.timezone.utc)
        request_id = f"REQ-{now.year}-{str(now.timestamp()).replace('.', '')[-6:]}"
        
        attachments = []
        if req.image_url: attachments.append(req.image_url)
        if req.audio_url: attachments.append(req.audio_url)
            
        citizen_intelligence = CitizenIntelligence(
            request_id=request_id,
            original_text=final_original_text,
            translated_text=final_translated_text,
            detected_language=detected_language,
            language_code=language_code,
            location=req.location,
            timestamp=now.isoformat(),
            attachments=attachments
        )
        
        return citizen_intelligence.model_dump()
