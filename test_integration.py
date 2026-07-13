import asyncio
import json
import logging
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Suppress noisy logs for the test
logging.getLogger("app.agents").setLevel(logging.CRITICAL)
logging.getLogger("app.orchestrator").setLevel(logging.CRITICAL)

from app.models.schemas import CitizenRequest
from app.orchestrator.workflow import WorkflowOrchestrator

# Mock GeminiService so we don't need a real API key for the integration test
class MockGeminiService:
    async def generate_json(self, prompt: str, system_instruction: str = None) -> dict:
        if "citizen_intelligence" in prompt or "extracts and cleans" in (system_instruction or ""):
            return {
                "clean_text": "The road near Government High School is severely damaged. Students and ambulances face difficulty during the rainy season.",
                "language": "English",
                "translated_text": "The road near Government High School is severely damaged. Students and ambulances face difficulty during the rainy season.",
                "location": "Ward 18, Government High School Area"
            }
        elif "issue_understanding" in prompt or "deeply understands" in (system_instruction or ""):
            return {
                "category": "Infrastructure",
                "subcategory": "Road Maintenance",
                "urgency": "High",
                "severity_score": 8.5,
                "confidence": 95,
                "government_department": "Public Works Department",
                "affected_groups": ["Students", "Patients", "Ambulance Drivers"],
                "possible_risks": ["Accidents", "Delayed Medical Response"],
                "sdg_mapping": "Goal 9: Industry, Innovation and Infrastructure",
                "summary": "Severe road damage near Government High School causing issues for students and ambulances.",
                "keywords": ["Road", "School", "Ambulance", "Damage", "Rain"],
                "immediate_intervention_required": True
            }
        elif "decision_intelligence" in prompt or "explains deterministic calculations" in (system_instruction or ""):
            return {
                "reasons": [
                    "High severity score indicating severe road damage.",
                    "Directly affects emergency services (ambulances).",
                    "Impacts vulnerable population (students)."
                ],
                "confidence": 95
            }
        elif "development_strategy" in prompt or "development planner" in (system_instruction or ""):
            return {
                "recommended_project": "Immediate Road Resurfacing and Drainage Improvement",
                "alternative_solutions": ["Temporary pothole filling", "Creating an alternative route"],
                "estimated_budget_range": "$50,000 - $100,000",
                "estimated_timeline": "3 Months",
                "expected_beneficiaries": "Students, Local Residents, Emergency Services",
                "departments_involved": ["Public Works Department", "Education Department", "Health Department"],
                "risks": ["Weather delays", "Traffic disruption during construction"],
                "dependencies": ["Budget Approval", "Material availability"],
                "government_scheme_alignment": "Pradhan Mantri Gram Sadak Yojana (PMGSY)",
                "success_metrics": ["Reduction in ambulance response time", "Zero accidents near school"]
            }
        elif "policy_briefing" in prompt or "strict formatting engine" in (system_instruction or ""):
            return {
                "markdown_content": "# Executive Policy Briefing\n\n**Issue**: Severe road damage near Government High School.\n**Priority**: HIGH\n**Recommendation**: Immediate Road Resurfacing.",
                "html_content": "<h1>Executive Policy Briefing</h1><p><b>Issue</b>: Severe road damage near Government High School.</p><p><b>Priority</b>: HIGH</p><p><b>Recommendation</b>: Immediate Road Resurfacing.</p>",
                "pdf_ready_content": "Executive Policy Briefing | Issue: Severe road damage near Government High School. | Priority: HIGH | Recommendation: Immediate Road Resurfacing."
            }
        return {}

import app.agents.citizen_intake
import app.agents.issue_intelligence
import app.agents.priority_decision
import app.agents.development_planning
import app.agents.executive_briefing

app.agents.citizen_intake.GeminiService = MockGeminiService
app.agents.issue_intelligence.GeminiService = MockGeminiService
app.agents.priority_decision.GeminiService = MockGeminiService
app.agents.development_planning.GeminiService = MockGeminiService
app.agents.executive_briefing.GeminiService = MockGeminiService

async def run_test():
    payload = {
        "text": "The road near Government High School is severely damaged. Students and ambulances face difficulty during the rainy season.",
        "language": "English",
        "location": "Ward 18",
        "image_url": "",
        "audio_url": ""
    }
    
    print("Starting End-to-End Integration Test...\n")
    
    try:
        orchestrator = WorkflowOrchestrator()
        final_state = await orchestrator.execute(payload)
        
        print("\n=== FINAL WORKFLOW RESPONSE ===")
        print(json.dumps(final_state, indent=2))
        
    except Exception as e:
        print(f"\nWorkflow Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_test())
