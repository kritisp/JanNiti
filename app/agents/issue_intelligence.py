import logging
from app.services.gemini_service import GeminiService
from app.services.prompt_loader import PromptLoader

logger = logging.getLogger(__name__)

class IssueIntelligenceAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Issue Understanding Agent Task"""
        logger.info("[Issue Understanding Agent] Analyzing issue intelligence...")
        
        from app.models.schemas import AgentState, IssueUnderstanding
        state = AgentState(**state_dict)
        intake = state.citizen_intelligence
        
        if not intake:
            raise ValueError("IssueIntelligenceAgent requires CitizenIntelligence in the state.")
        
        prompt = PromptLoader.get_prompt(
            "issue_understanding.txt",
            clean_text=intake.translated_text,
            translated_text=intake.translated_text,
            language=intake.detected_language,
            location=intake.location
        )
        
        from app.services.knowledge_loader import KnowledgeLoader
        
        issue_categories_kb = KnowledgeLoader.get_issue_categories()
        sdg_mapping_kb = KnowledgeLoader.get_sdg_mapping()
        
        system_instruction = (
            "You are an AI that deeply understands and extracts structured intelligence from citizen issues. "
            "You must return a valid JSON object with EXACTLY the following keys: 'category' (str), "
            "'subcategory' (str), 'urgency' (str), 'severity_score' (float 1-10), 'confidence' (int 0-100), "
            "'government_department' (str), 'affected_groups' (list of str), 'possible_risks' (list of str), "
            "'sdg_mapping' (str), 'summary' (str), 'keywords' (list of str), 'immediate_intervention_required' (bool).\n\n"
            f"KNOWLEDGE BASE - ISSUE CATEGORIES: {issue_categories_kb}\n"
            f"KNOWLEDGE BASE - SDG MAPPINGS: {sdg_mapping_kb}\n"
            "CRITICAL INSTRUCTION: You must strictly use the category, subcategory, responsible_department, and sdg values from the provided Knowledge Base."
        )
        
        gemini = GeminiService()
        ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
        
        issue_understanding = IssueUnderstanding(**ai_response)
        
        return issue_understanding.model_dump()
