import asyncio
import json
import logging
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Suppress noisy logs for the test
logging.getLogger("app.agents").setLevel(logging.CRITICAL)
logging.getLogger("app.orchestrator").setLevel(logging.CRITICAL)
logging.getLogger("httpx").setLevel(logging.CRITICAL)

from app.orchestrator.workflow import WorkflowOrchestrator
import app.agents.citizen_intake
import app.agents.issue_intelligence
import app.agents.priority_decision
import app.agents.development_planning
import app.agents.executive_briefing

class MockGeminiService:
    async def generate_json(self, prompt: str, system_instruction: str = None) -> dict:
        if "citizen_intelligence" in prompt or "extracts and cleans" in (system_instruction or ""):
            pass
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

app.agents.citizen_intake.GeminiService = MockGeminiService
app.agents.issue_intelligence.GeminiService = MockGeminiService
app.agents.priority_decision.GeminiService = MockGeminiService
app.agents.development_planning.GeminiService = MockGeminiService
app.agents.executive_briefing.GeminiService = MockGeminiService


async def run_test():
    requests = [
        {"lang": "English", "code": "en-IN", "text": "The road near Government High School is severely damaged. Students and ambulances face difficulty during the rainy season."},
        {"lang": "Hindi", "code": "hi-IN", "text": "सरकारी हाई स्कूल के पास की सड़क बुरी तरह क्षतिग्रस्त है। बारिश के मौसम में छात्रों और एंबुलेंस को भारी परेशानी का सामना करना पड़ता है।"},
        {"lang": "Odia", "code": "od-IN", "text": "ସରକାରୀ ଉଚ୍ଚ ବିଦ୍ୟାଳୟ ନିକଟରେ ଥିବା ରାସ୍ତା ଅତ୍ୟନ୍ତ ଖରାପ ଅବସ୍ଥାରେ ଅଛି। ବର୍ଷା ଦିନେ ଛାତ୍ରଛାତ୍ରୀ ଏବଂ ଆମ୍ବୁଲାନ୍ସ ଯାତାୟାତ କରିବାରେ ବହୁତ ଅସୁବିଧା ହେଉଛି।"},
        {"lang": "Bengali", "code": "bn-IN", "text": "সরকারি উচ্চ বিদ্যালয়ের কাছের রাস্তাটি মারাত্মকভাবে ক্ষতিগ্রস্ত। বর্ষাকালে ছাত্রছাত্রী এবং অ্যাম্বুলেন্স চলাচলে চরম দুর্ভোগ পোহাতে হয়।"}
    ]
    
    print("Starting Comprehensive Multilingual Backend Integration Test...\n")
    
    for req in requests:
        print(f"--- Testing Request ({req['lang']}) ---")
        payload = {
            "text": req['text'],
            "language": req['lang'],
            "location": "Ward 18",
            "image_url": "",
            "audio_url": ""
        }
        
        try:
            orchestrator = WorkflowOrchestrator()
            final_state = await orchestrator.execute(payload)
            
            # Check for generic workflow failures
            status = final_state.get('workflow_status')
            assert status == "completed", f"Workflow failed with status: {status}. Errors: {final_state.get('errors')}"
            
            c_intel = final_state.get('citizen_intelligence')
            
            # 1. Detect language correctly
            detected = c_intel.get('language_code')
            assert detected == req['code'], f"Language mismatch. Expected {req['code']}, Got {detected}"
            print(f"[PASS] Sarvam detected language correctly ({detected})")
            
            # 2. Translation to English succeeds
            if req['code'] != "en-IN":
                translated = c_intel.get('translated_text')
                assert translated and translated != req['text'], "Translation to English failed or empty"
                print(f"[PASS] Translation to English succeeds: {translated[:30]}...")
            else:
                print(f"[PASS] Translation to English succeeds (English input bypassed)")
                
            # 3. Check all agents executed
            history = final_state.get('execution_history', [])
            agents_started = [e['event'] for e in history if 'started' in e['event']]
            expected_agents = [
                "CitizenIntakeAgent: started",
                "IssueIntelligenceAgent: started",
                "ConstituencyContextAgent: started",
                "PriorityDecisionAgent: started",
                "DevelopmentPlanningAgent: started",
                "ExecutiveBriefingAgent: started"
            ]
            for ea in expected_agents:
                assert ea in agents_started, f"{ea} did not execute"
                print(f"[PASS] {ea.split(':')[0]} executes")
            
            # 4. Translations of final report and TTS
            p_brief = final_state.get('policy_briefing')
            
            reports = [p_brief.get('english_report'), p_brief.get('hindi_report'), p_brief.get('odia_report'), p_brief.get('bengali_report')]
            assert all(reports), "Missing translated reports in PolicyBriefing"
            print("[PASS] Final report is translated into all four supported languages")
            
            audios = [p_brief.get('english_audio'), p_brief.get('hindi_audio'), p_brief.get('odia_audio'), p_brief.get('bengali_audio')]
            if all(audios):
                print("[PASS] Text-to-Speech generation succeeds")
            else:
                print("[FAIL] Some TTS audio missing")
                
        except AssertionError as e:
            print(f"[FAIL] {e}")
        except Exception as e:
            print(f"[ERROR] Workflow threw exception: {e}")
            
        print("\n")

if __name__ == "__main__":
    asyncio.run(run_test())
