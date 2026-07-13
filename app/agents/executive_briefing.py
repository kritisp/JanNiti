import json
import logging
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService
from app.services.sarvam_service import SarvamService

logger = logging.getLogger(__name__)

class ExecutiveBriefingAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Policy Briefing Agent Task"""
        logger.info("[Policy Briefing Agent] Generating policy briefing...")
        
        from app.models.schemas import AgentState, PolicyBriefing
        state = AgentState(**state_dict)
        intake = state.citizen_intelligence
        intel = state.issue_understanding
        context = state.constituency_intelligence
        priority = state.decision_intelligence
        planning = state.development_strategy
        
        prompt = PromptLoader.get_prompt(
            "policy_briefing.txt",
            intake_data=intake.model_dump_json() if intake else "{}",
            issue_intelligence=intel.model_dump_json() if intel else "{}",
            constituency_context=context.model_dump_json() if context else "{}",
            priority_intelligence=priority.model_dump_json() if priority else "{}",
            planning_data=planning.model_dump_json() if planning else "{}"
        )
        
        system_instruction = (
            "You are the Executive Policy Briefing Agent. You must act as a strict formatting engine. "
            "Return a JSON object with exactly these keys: 'markdown_content', 'html_content', 'pdf_ready_content'."
        )
        
        gemini = GeminiService()
        ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
        
        policy_briefing = PolicyBriefing(**ai_response)
        
        # Multilingual Translation and TTS via SarvamService
        logger.info("[Policy Briefing Agent] Generating Multilingual Reports and Audio...")
        sarvam = SarvamService()
        
        base_text = policy_briefing.pdf_ready_content
        policy_briefing.english_report = base_text
        
        try:
            policy_briefing.english_audio = sarvam.text_to_speech(base_text, "en-IN")
        except Exception as e:
            logger.error(f"TTS failed for en-IN: {e}")
            
        languages = {
            "hi-IN": "hindi",
            "od-IN": "odia",
            "bn-IN": "bengali"
        }
        
        for code, prefix in languages.items():
            try:
                # 1. Translate
                trans_res = sarvam.translate(base_text, source_language="en-IN", target_language=code)
                translated_text = trans_res["translated_text"]
                setattr(policy_briefing, f"{prefix}_report", translated_text)
                
                # 2. Text-to-Speech
                audio = sarvam.text_to_speech(translated_text, code)
                setattr(policy_briefing, f"{prefix}_audio", audio)
            except Exception as e:
                logger.error(f"Multilingual generation failed for {code}: {e}")
        
        return policy_briefing.model_dump()
