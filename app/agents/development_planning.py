import json
import logging
from app.services.knowledge_loader import KnowledgeLoader
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def development_planning_task(issue_dict: dict, context_dict: dict, priority_dict: dict) -> dict:
    """Development Strategy Agent Task"""
    logger.info("[Development Strategy Agent] Generating development strategy...")
    
    from app.models.schemas import IssueUnderstanding, ConstituencyIntelligence, DecisionIntelligence, DevelopmentStrategy
    intel = IssueUnderstanding(**issue_dict)
    context = ConstituencyIntelligence(**context_dict)
    priority = DecisionIntelligence(**priority_dict)
    
    dept_id = None
    dept_name_or_id = intel.government_department
    
    departments = KnowledgeLoader.get_departments()
    for d in departments:
        if d.get("name", "").lower() == dept_name_or_id.lower() or d.get("id") == dept_name_or_id:
            dept_id = d.get("id")
            break
            
    budget_info = None
    if dept_id:
        budget_info = KnowledgeLoader.get_department_budget(dept_id)
        
    # Filter projects so we don't blow up the LLM context window with the entire constituency
    if dept_id:
        context.existing_development_projects = [p for p in context.existing_development_projects if p.get("department_id") == dept_id]
        
    prompt = PromptLoader.get_prompt(
        "development_strategy.txt",
        issue_summary=intel.summary,
        issue_intelligence=intel.model_dump_json(),
        constituency_context=context.model_dump_json(),
        priority_intelligence=priority.model_dump_json(),
        budget_info=json.dumps(budget_info) if budget_info else "No specific budget constraints."
    )
    
    system_instruction = (
        "You are an AI development planner. Return a valid JSON object strictly matching these keys: "
        "'recommended_project' (str), 'alternative_solutions' (list of str), "
        "'estimated_budget_range' (str), 'estimated_timeline' (str), "
        "'expected_beneficiaries' (str), 'departments_involved' (list of str), "
        "'risks' (list of str), 'dependencies' (list of str), "
        "'government_scheme_alignment' (str), 'sdg_alignment' (str), 'success_metrics' (list of str)."
    )
    
    gemini = GeminiService()
    ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
    
    development_strategy = DevelopmentStrategy(**ai_response)
    
    return development_strategy.model_dump()
