import logging
from app.services.gemini_service import GeminiService
from app.services.prompt_loader import PromptLoader
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def issue_intelligence_task(intake_dict: dict) -> dict:
    """Issue Understanding Agent Task"""
    logger.info("[Issue Understanding Agent] Analyzing issue intelligence...")
    
    from app.models.schemas import CitizenIntelligence, IssueUnderstanding
    intake = CitizenIntelligence(**intake_dict)
    
    prompt = PromptLoader.get_prompt(
        "issue_understanding.txt",
        clean_text=intake.clean_text,
        translated_text=intake.translated_text,
        language=intake.language,
        location=intake.location
    )
    
    system_instruction = (
        "You are an AI that deeply understands and extracts structured intelligence from citizen issues. "
        "You must return a valid JSON object with EXACTLY the following keys: 'category' (str), "
        "'subcategory' (str), 'urgency' (str), 'severity_score' (float 1-10), 'confidence' (int 0-100), "
        "'government_department' (str), 'affected_groups' (list of str), 'possible_risks' (list of str), "
        "'sdg_mapping' (str), 'summary' (str), 'keywords' (list of str), 'immediate_intervention_required' (bool)."
    )
    
    gemini = GeminiService()
    ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
    
    issue_understanding = IssueUnderstanding(**ai_response)
    
    return issue_understanding.model_dump()
