import json
import logging
from app.services.prompt_loader import PromptLoader
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

class PriorityDecisionAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Decision Intelligence Agent Task"""
        logger.info("[Decision Intelligence Agent] Calculating Development Priority Index...")
        
        from app.models.schemas import AgentState, DecisionIntelligence
        state = AgentState(**state_dict)
        intel = state.issue_understanding
        context = state.constituency_intelligence
        
        if not intel or not context:
            raise ValueError("PriorityDecisionAgent requires IssueUnderstanding and ConstituencyIntelligence in the state.")
        
        from app.services.knowledge_loader import KnowledgeLoader
        
        priority_rules_kb = KnowledgeLoader.get_priority_rules()
        budget_ranges_kb = KnowledgeLoader.get_budget_ranges()
        
        # 1. Deterministic Calculation using Knowledge Base Rules
        issue_summary = intel.summary.lower()
        keywords = " ".join(intel.keywords).lower()
        search_text = issue_summary + " " + keywords
        
        base_score = 30 # Default baseline
        matched_modifiers = {}
        matched_rule = "None"
        
        for rule in priority_rules_kb:
            # simple keyword matching
            if rule["issue_keyword"].lower() in search_text:
                matched_rule = rule["issue_keyword"]
                base_score = rule["base_score"]
                for mod_key, mod_val in rule.get("modifiers", {}).items():
                    # If the modifier context exists in the text
                    if any(word in search_text for word in mod_key.lower().split()):
                        matched_modifiers[mod_key] = mod_val
                break
                
        total_dpi = base_score + sum(matched_modifiers.values())
        total_dpi = min(total_dpi, 100) # Cap at 100
        
        if total_dpi >= 80: priority_level = "Critical"
        elif total_dpi >= 60: priority_level = "High"
        elif total_dpi >= 40: priority_level = "Medium"
        else: priority_level = "Low"
        
        breakdown = {
            "base_score": float(base_score),
            "strategic_importance_factor": 10.0 if intel.sdg_mapping else 0.0
        }
        for k, v in matched_modifiers.items():
            breakdown[f"modifier_{k.replace(' ', '_').lower()}"] = float(v)
        
        total_dpi = min(total_dpi + breakdown["strategic_importance_factor"], 100)
        
        # 2. AI Explanation Generation
        prompt = PromptLoader.get_prompt(
            "decision_intelligence.txt",
            total_score=total_dpi,
            priority_level=priority_level,
            score_breakdown=json.dumps(breakdown, indent=2),
            issue_summary=intel.summary
        )
        
        system_instruction = (
            "You are an AI that explains deterministic calculations and references realistic budgets. "
            "Do NOT alter the score. Just return a JSON object with 'reasons' (list of str explaining the score) "
            "and 'confidence' (int). Incorporate the provided budget ranges into your reasons if relevant.\n\n"
            f"KNOWLEDGE BASE - PRIORITY RULES: {priority_rules_kb}\n"
            f"KNOWLEDGE BASE - BUDGET RANGES: {budget_ranges_kb}"
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
