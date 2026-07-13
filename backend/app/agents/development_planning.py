import json
import logging
from app.services.knowledge_loader import KnowledgeLoader
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

class DevelopmentPlanningAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Development Strategy Agent Task"""
        logger.info("[Development Strategy Agent] Generating development strategy...")
        
        from app.models.schemas import AgentState, DevelopmentStrategy
        state = AgentState(**state_dict)
        intel = state.issue_understanding
        context = state.constituency_intelligence
        priority = state.decision_intelligence
        
        if not intel or not context or not priority:
            raise ValueError("DevelopmentPlanningAgent requires IssueUnderstanding, ConstituencyIntelligence, and DecisionIntelligence in the state.")
        
        dept_id = None
        dept_name_or_id = intel.government_department
        
        departments_kb = KnowledgeLoader.get_departments()
        schemes_kb = KnowledgeLoader.get_government_schemes()
        
        # Match the department ID based on the new schema
        dept_id = None
        for d in departments_kb:
            if d.get("department", "").lower() == dept_name_or_id.lower() or d.get("department_id") == dept_name_or_id:
                dept_id = d.get("department_id")
                break
                
        # Filter projects so we don't blow up the LLM context window with the entire constituency
        if dept_id:
            context.existing_development_projects = [p for p in context.existing_development_projects if p.get("department_id") == dept_id]
            
        prompt = PromptLoader.get_prompt(
            "development_strategy.txt",
            issue_summary=intel.summary,
            issue_intelligence=intel.model_dump_json(),
            constituency_context=context.model_dump_json(),
            priority_intelligence=priority.model_dump_json(),
            budget_info="Budget constraints defined in Priority rules if applicable."
        )
        
        system_instruction = (
            "You are an AI development planner. Return a valid JSON object strictly matching these keys: "
            "'recommended_project' (str), 'alternative_solutions' (list of str), "
            "'estimated_budget_range' (str), 'estimated_timeline' (str), "
            "'expected_beneficiaries' (str), 'departments_involved' (list of str), "
            "'risks' (list of str), 'dependencies' (list of str), "
            "'government_scheme_alignment' (str), 'success_metrics' (list of str).\n\n"
            f"KNOWLEDGE BASE - DEPARTMENTS: {departments_kb}\n"
            f"KNOWLEDGE BASE - GOVERNMENT SCHEMES: {schemes_kb}\n"
            "CRITICAL INSTRUCTION: You must strictly align your recommended departments and government_scheme_alignment with the provided Knowledge Base lists."
        )
        
        gemini = GeminiService()
        ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
        
        development_strategy = DevelopmentStrategy(**ai_response)
        
        return development_strategy.model_dump()
