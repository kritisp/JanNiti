import json
import logging
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def priority_decision_task(issue_dict: dict, context_dict: dict) -> dict:
    """Decision Intelligence Agent Task"""
    logger.info("[Decision Intelligence Agent] Calculating Development Priority Index...")
    
    from app.models.schemas import IssueUnderstanding, ConstituencyIntelligence, DecisionIntelligence
    intel = IssueUnderstanding(**issue_dict)
    context = ConstituencyIntelligence(**context_dict)
    
    # 1. Deterministic Calculation
    w_demand = 25
    w_impact = 20
    w_gap = 20
    w_urgency = 15
    w_projects = 10
    w_strategic = 10
    
    s_demand = min(intel.severity_score / 10.0, 1.0)
    s_impact = min(context.estimated_population_impacted / 50000.0, 1.0)
    
    gap_keywords = " ".join(context.infrastructure_gaps).lower()
    issue_summary = intel.summary.lower()
    s_gap = 1.0 if any(word in gap_keywords for word in issue_summary.split() if len(word) > 4) else 0.4
    
    urgency_str = str(intel.urgency).lower()
    if "critical" in urgency_str: s_urgency = 1.0
    elif "high" in urgency_str: s_urgency = 0.8
    elif "low" in urgency_str: s_urgency = 0.2
    else: s_urgency = 0.5
    
    # Check if there are projects related to this issue (basic heuristic since department filtering was removed from context)
    issue_dept = intel.government_department.lower()
    related_projects = [p for p in context.existing_development_projects if p.get('department_id', '').lower() == issue_dept or issue_dept in p.get('name', '').lower()]
    s_projects = 0.2 if len(related_projects) > 0 else 1.0
    
    s_strategic = 1.0 if intel.sdg_mapping else 0.5
    
    breakdown = {
        "citizen_demand": round(s_demand * w_demand, 1),
        "population_impact": round(s_impact * w_impact, 1),
        "infrastructure_gap": round(s_gap * w_gap, 1),
        "urgency_factor": round(s_urgency * w_urgency, 1),
        "existing_projects_factor": round(s_projects * w_projects, 1),
        "strategic_importance": round(s_strategic * w_strategic, 1)
    }
    
    total_dpi = sum(breakdown.values())
    
    if total_dpi >= 80: priority_level = "Critical"
    elif total_dpi >= 60: priority_level = "High"
    elif total_dpi >= 40: priority_level = "Medium"
    else: priority_level = "Low"
    
    # 2. AI Explanation Generation
    prompt = PromptLoader.get_prompt(
        "decision_intelligence.txt",
        total_score=total_dpi,
        priority_level=priority_level,
        score_breakdown=json.dumps(breakdown, indent=2),
        issue_summary=intel.summary
    )
    
    system_instruction = (
        "You are an AI that explains deterministic calculations. Do NOT alter the score. "
        "Just return a JSON object with 'reasons' (list of str explaining the score) and 'confidence' (int)."
    )
    
    gemini = GeminiService()
    ai_response = await gemini.generate_json(prompt, system_instruction=system_instruction)
    
    decision_intelligence = DecisionIntelligence(
        development_priority_index=total_dpi,
        priority_level=priority_level,
        score_breakdown=breakdown,
        reasons=ai_response.get("reasons", []),
        confidence=ai_response.get("confidence", 90)
    )
    
    return decision_intelligence.model_dump()
