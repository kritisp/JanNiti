import asyncio
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

import logging
logging.getLogger("app.agents").setLevel(logging.CRITICAL)
logging.getLogger("app.orchestrator").setLevel(logging.CRITICAL)

import app.orchestrator.app
app.orchestrator.app.workflow_app.wait_for_event = lambda event_name: asyncio.sleep(0.1)

def dummy_task(func):
    return func
app.orchestrator.app.workflow_app.task = dummy_task

from app.orchestrator.workflow import janniti_ai_workflow
from app.agents.citizen_intake import citizen_intake_task
from app.agents.issue_intelligence import issue_intelligence_task
from app.agents.constituency_context import constituency_context_task
from app.agents.priority_decision import priority_decision_task
from app.agents.development_planning import development_planning_task
from app.agents.executive_briefing import executive_briefing_task
import app.agents.citizen_intake

class MockGeminiService:
    async def generate_json(self, prompt: str, system_instruction: str = None) -> dict:
        return {"clean_text": "Mock", "language": "English", "translated_text": "Mock", "location": "Ward 18"}
        
app.agents.citizen_intake.GeminiService = MockGeminiService

async def run_failure_simulation(name, payload, setup_mock=None):
    print(f"\n--- Running Simulation: {name} ---")
    if setup_mock:
        setup_mock()
        
    final_state = await janniti_ai_workflow(payload)
    print("Workflow Status:", final_state.get('workflow_status'))
    print("Errors:", final_state.get('errors'))
    print("Execution History:", final_state.get('execution_history'))

async def main():
    base_payload = {
        "text": "Valid text describing an issue here.",
        "language": "English",
        "location": "Ward 18",
        "image_url": "",
        "audio_url": ""
    }
    
    # 1. Gemini API failure
    def mock_gemini_failure():
        class BrokenGemini:
            async def generate_json(self, *args, **kwargs):
                raise Exception("500 Internal Server Error - Gemini API Timeout")
        app.agents.citizen_intake.GeminiService = BrokenGemini
        
    await run_failure_simulation("Gemini API Failure", base_payload, mock_gemini_failure)
    
    # Reset Mock
    app.agents.citizen_intake.GeminiService = MockGeminiService
    
    # 2. Missing Knowledge Base
    def mock_missing_kb():
        from app.services.knowledge_loader import KnowledgeLoader
        def broken_get_departments():
            raise FileNotFoundError("departments.json does not exist")
        KnowledgeLoader.get_departments = broken_get_departments
        
    await run_failure_simulation("Missing Knowledge Base", base_payload, mock_missing_kb)
    
    # 3. Empty citizen submission
    empty_payload = {
        "text": "   ",
        "language": "English",
        "location": "Ward 18",
        "image_url": "",
        "audio_url": ""
    }
    await run_failure_simulation("Empty Citizen Submission", empty_payload)

if __name__ == "__main__":
    asyncio.run(main())
