import json
import logging
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def executive_briefing_task(intake_dict: dict, issue_dict: dict, context_dict: dict, priority_dict: dict, planning_dict: dict) -> dict:
    """Policy Briefing Agent Task"""
    logger.info("[Policy Briefing Agent] Generating policy briefing...")
    
    from app.models.schemas import CitizenIntelligence, IssueUnderstanding, ConstituencyIntelligence, DecisionIntelligence, DevelopmentStrategy, PolicyBriefing
    intake = CitizenIntelligence(**intake_dict)
    intel = IssueUnderstanding(**issue_dict)
    context = ConstituencyIntelligence(**context_dict)
    priority = DecisionIntelligence(**priority_dict)
    planning = DevelopmentStrategy(**planning_dict)
    
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
    
    return policy_briefing.model_dump()
