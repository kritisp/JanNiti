import uuid
import json
import shutil
import os
from os import getenv
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from pydantic import BaseModel
from app.models.schemas import (
    CitizenRequest, 
    AgentState,
    PolicyBriefing,
    SubmitResponse,
    WorkflowStatusResponse,
    DashboardStatsResponse,
    AnalyticsResponse
)
from app.orchestrator.workflow import WorkflowOrchestrator
from app.demo_data.demo_loader import demo_loader, DemoLoaderError
from app.services.knowledge_loader import KnowledgeLoader
from app.services.gemini_service import GeminiService

app = FastAPI(
    title="JanNiti AI API",
    description="Production endpoints for JanNiti AI Orchestrator running locally without Render SDK",
    version="1.0.0"
)

allowed_origin_regex = getenv(
    "CORS_ALLOWED_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory execution store for local persistence since we removed Render SDK
# Format: { "request_id": { "status": "in_progress" | "completed" | "failed", "result": None, "error": None } }
execution_store = {}

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class UploadResponse(BaseModel):
    file_path: str

class ChatResponse(BaseModel):
    response: str

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload temporary files (audios) for local workflow consumption."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file was uploaded.")
    
    try:
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"file_path": file_path}
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Disk write failure: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File upload failed: {str(e)}")

@app.post("/copilot/chat", response_model=ChatResponse)
async def copilot_chat(request: ChatRequest):
    """Conversational AI Copilot querying live constituency contexts."""
    if not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message prompt cannot be empty.")
    
    try:
        completed_runs = []
        for rid, execution in execution_store.items():
            if execution.get("status") == "completed":
                res = execution.get("result", {})
                completed_runs.append({
                    "id": rid,
                    "category": res.get("issue_understanding", {}).get("category"),
                    "subcategory": res.get("issue_understanding", {}).get("subcategory"),
                    "location": res.get("citizen_intelligence", {}).get("location"),
                    "summary": res.get("issue_understanding", {}).get("summary"),
                    "priority": res.get("decision_intelligence", {}).get("development_priority_index"),
                    "department": res.get("issue_understanding", {}).get("government_department")
                })
        
        try:
            profiles = KnowledgeLoader.get_constituency_profiles()
            demographics = KnowledgeLoader.get_demographic_reference()
        except FileNotFoundError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Required knowledge base files are missing: {str(e)}")
        
        system_instruction = (
            "You are the JanNiti AI Constituency Copilot, an advanced assistant for Members of Parliament (MPs) and local planners.\n"
            "You have access to active citizen requests, constituency profile data, and demographic records.\n\n"
            f"Active Citizen Complaints Context:\n{json.dumps(completed_runs, indent=2)}\n\n"
            f"Constituency Profiles Context:\n{json.dumps(profiles, indent=2)}\n\n"
            f"Demographic Reference Context:\n{json.dumps(demographics, indent=2)}\n\n"
            "Use this data to answer natural language questions about priority issues, health/education gaps, road complaints, and department workloads.\n"
            "Be concise, professional, and base your answers on the provided context. Format your response in clean Markdown."
        )
        
        gemini = GeminiService()
        prompt = request.message
        history_context = ""
        for msg in request.history:
            role = "User" if msg.get("sender") == "user" else "Assistant"
            history_context += f"{role}: {msg.get('text')}\n"
        
        full_prompt = f"{history_context}User: {prompt}\nAssistant:"
        response_text = await gemini.generate(full_prompt, system_instruction=system_instruction)
        return {"response": response_text}
    except HTTPException as he:
        raise he
    except Exception as e:
        err_str = str(e).lower()
        if "quota" in err_str or "limit" in err_str or "429" in err_str:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                detail="Gemini API rate limit or quota exceeded. Please try again later."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Copilot chat generation failed: {str(e)}"
        )

def prepopulate_store():
    """Seed the execution_store with completed runs so the charts and Copilot work instantly."""
    import datetime
    now = datetime.timezone.utc
    time_str = datetime.datetime.now(now).isoformat()
    dummy_audio = "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
    
    mock_data = [
        {
            "id": "REQ-MOCK-001",
            "text": "The main road in Aurangpur Village is flooded and cracked. Commuting to local clinics takes more than 50 minutes. We urgently need concrete pavement and drainage.",
            "location": "Aurangpur, Araria, Bihar",
            "lang": "Hindi",
            "cat": "Infrastructure",
            "sub": "Road Maintenance",
            "dept": "Public Works Department",
            "scheme": "Pradhan Mantri Gram Sadak Yojana (PMGSY)",
            "priority": 0.94,
            "level": "Critical",
            "brief": "Aurangpur Pavement Build: Concrete road surfacing and roadside drains to eliminate rainy season isolation."
        },
        {
            "id": "REQ-MOCK-002",
            "text": "Our primary health clinic in Nayanagar suffers from 4-5 power cuts daily. Cold vaccines are getting spoiled. Solar panels needed.",
            "location": "Nayanagar, Forbesganj, Bihar",
            "lang": "English",
            "cat": "Healthcare",
            "sub": "Clinic Infrastructure",
            "dept": "Health & Family Welfare Department",
            "scheme": "National Health Mission (NHM)",
            "priority": 0.87,
            "level": "High",
            "brief": "Nayanagar Clinic Solar: Setup 5kW solar hybrid power backup to preserve cold chain vaccines and enable night treatment."
        },
        {
            "id": "REQ-MOCK-003",
            "text": "Drinking water in Ward 39 is salty and contains reddish particles. Children are falling sick. Needs water filter grid.",
            "location": "Ward 39, Puri, Odisha",
            "lang": "Odia",
            "cat": "Water Supply",
            "sub": "Water Filtration",
            "dept": "Drinking Water & Sanitation Department",
            "scheme": "Jal Jeevan Mission",
            "priority": 0.72,
            "level": "High",
            "brief": "Puri Water Filtration: Installing a community water filtration grid to remove iron and high salinity particles."
        },
        {
            "id": "REQ-MOCK-004",
            "text": "Open drains are overflowing in Ward 19 near Cuttack. High mosquito breeding and bad smell. Clean drainage.",
            "location": "Ward 19, Cuttack, Odisha",
            "lang": "Hindi",
            "cat": "Sanitation",
            "sub": "Drainage Cleaning",
            "dept": "Urban Development Department",
            "scheme": "Swachh Bharat Mission (SBM)",
            "priority": 0.65,
            "level": "Medium",
            "brief": "Cuttack Drainage Clean: Open canal desilting and sanitization spraying to curb mosquito vectors."
        },
        {
            "id": "REQ-MOCK-005",
            "text": "The government school building in Malda has damaged roof. Water enters classes. Roof repairs needed.",
            "location": "Ward 23, Malda, West Bengal",
            "lang": "Bengali",
            "cat": "Education",
            "sub": "School Infrastructure",
            "dept": "School Education Department",
            "scheme": "Samagra Shiksha Abhiyan",
            "priority": 0.78,
            "level": "High",
            "brief": "Malda School Roof Repair: Immediate roof waterproofing and classroom tiling to enable safe attendance during rain."
        },
        {
            "id": "REQ-MOCK-006",
            "text": "Rain has failed this season. The canals are dry in Sambalpur block. Farmers need irrigation pump.",
            "location": "Ward 48, Sambalpur, Odisha",
            "lang": "Odia",
            "cat": "Agriculture",
            "sub": "Farm Irrigation",
            "dept": "Agriculture & Farmers Empowerment Department",
            "scheme": "Pradhan Mantri Krishi Sinchayee Yojana",
            "priority": 0.81,
            "level": "High",
            "brief": "Sambalpur Canals Irrigation: Distribute 10 solar irrigation pump sets to local farming groups to counter drought."
        }
    ]
    
    for item in mock_data:
        rid = item["id"]
        execution_store[rid] = {
            "status": "completed",
            "error": None,
            "result": {
                "citizen_request": {
                    "text": item["text"],
                    "language": item["lang"],
                    "location": item["location"],
                    "image_url": None,
                    "audio_url": None
                },
                "citizen_intelligence": {
                    "request_id": rid,
                    "original_text": item["text"],
                    "translated_text": item["text"],
                    "detected_language": item["lang"],
                    "language_code": "hi-IN" if item["lang"] == "Hindi" else ("od-IN" if item["lang"] == "Odia" else ("bn-IN" if item["lang"] == "Bengali" else "en-IN")),
                    "location": item["location"],
                    "timestamp": time_str,
                    "attachments": []
                },
                "issue_understanding": {
                    "category": item["cat"],
                    "subcategory": item["sub"],
                    "urgency": item["level"],
                    "severity_score": item["priority"] * 10,
                    "confidence": 92,
                    "government_department": item["dept"],
                    "affected_groups": ["Citizens"],
                    "possible_risks": ["Health Hazards", "Isolation"],
                    "sdg_mapping": "Goal 9: Infrastructure" if item["cat"] == "Infrastructure" else "Goal 3: Good Health",
                    "summary": item["brief"],
                    "keywords": [item["cat"].lower(), item["sub"].lower()],
                    "immediate_intervention_required": item["priority"] > 0.8
                },
                "constituency_intelligence": {
                    "constituency_name": item["location"].split(",")[-2].strip(),
                    "population": 25000,
                    "villages": 4,
                    "schools": 3,
                    "hospitals": 1,
                    "phcs": 2,
                    "road_network_km": 24.5,
                    "water_supply_coverage": "68%",
                    "electricity_coverage": "74%",
                    "historical_complaints": 38,
                    "infrastructure_gaps": [f"Deficient {item['cat']} access"],
                    "estimated_population_impacted": 12000,
                    "existing_development_projects": []
                },
                "decision_intelligence": {
                    "development_priority_index": item["priority"],
                    "priority_level": item["level"],
                    "score_breakdown": {"severity": item["priority"]},
                    "reasons": ["Significant demographic impact", "Critical structural gaps reported by multiple citizens"],
                    "confidence": 94
                },
                "development_strategy": {
                    "recommended_project": item["brief"].split(":")[0] + " Project",
                    "alternative_solutions": ["Routine maintenance"],
                    "estimated_budget_range": "₹45 Lakhs" if item["priority"] < 0.8 else "₹1.15 Cr",
                    "estimated_timeline": "3 Months",
                    "expected_beneficiaries": "12,000 residents",
                    "departments_involved": [item["dept"]],
                    "risks": ["Monsoon delays"],
                    "dependencies": ["Fund approval"],
                    "government_scheme_alignment": item["scheme"],
                    "success_metrics": ["Asset accessibility", "Reduced outage/transit time"]
                },
                "policy_briefing": {
                    "markdown_content": f"# Policy Briefing\n\n**Subject:** {item['brief']}\n\n**Priority Index:** {item['priority']}\n**Department:** {item['dept']}\n\n### Proposed Strategy\n{item['brief']}",
                    "html_content": f"<h1>Policy Briefing</h1><p><strong>Subject:</strong> {item['brief']}</p>",
                    "pdf_ready_content": f"Subject: {item['brief']}. Priority Level: {item['level']}",
                    "english_report": f"English Report:\n{item['brief']}",
                    "hindi_report": f"हिंदी रिपोर्ट:\n{item['brief']}",
                    "odia_report": f"ଓଡ଼ିଆ ରିପୋର୍ଟ:\n{item['brief']}",
                    "bengali_report": f"বাংলা रिपोर्ट:\n{item['brief']}",
                    "english_audio": dummy_audio,
                    "hindi_audio": dummy_audio,
                    "odia_audio": dummy_audio,
                    "bengali_audio": dummy_audio
                },
                "execution_metadata": {"duration_ms": 2340},
                "execution_history": [{"event": "Seeded Completed Run"}],
                "current_agent": None,
                "workflow_status": "completed",
                "errors": []
            }
        }

@app.on_event("startup")
async def startup_event():
    demo_mode = getenv("DEMO_MODE", "false").lower() == "true"
    if demo_mode:
        prepopulate_store()

@app.post("/submit", response_model=SubmitResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_workflow(request: CitizenRequest, background_tasks: BackgroundTasks):
    """
    Submit Citizen Request
    
    Submits a new citizen issue and kicks off the 6-agent AI workflow asynchronously.
    Returns a request_id that can be used to poll the workflow status.
    """
    request_id = str(uuid.uuid4())
    execution_store[request_id] = {"status": "in_progress", "result": None, "error": None}
    
    async def run_and_store(req_id: str, req_dict: dict):
        try:
            orchestrator = WorkflowOrchestrator()
            result = await orchestrator.execute(req_dict)
            execution_store[req_id]["status"] = "completed" if result.get("workflow_status") == "completed" else "failed"
            execution_store[req_id]["result"] = result
            if result.get("workflow_status") == "failed":
                execution_store[req_id]["error"] = "Workflow failed internally"
        except Exception as e:
            execution_store[req_id]["status"] = "failed"
            execution_store[req_id]["error"] = str(e)

    background_tasks.add_task(run_and_store, request_id, request.model_dump())
    
    return {
        "request_id": request_id,
        "status": "in_progress",
        "message": "Workflow started successfully in background."
    }

@app.get("/workflow/{id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(id: str):
    """
    Get Workflow Status
    
    Returns the current execution status (in_progress, completed, failed) 
    and the full AgentState if the workflow is completed.
    """
    execution = execution_store.get(id)
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow request not found.")
        
    if execution["status"] != "completed":
        return {
            "request_id": id,
            "status": execution["status"],
            "error": execution.get("error")
        }
        
    return {
        "request_id": id,
        "status": execution["status"],
        "workflow_data": execution.get("result", {})
    }

@app.get("/report/{id}", response_model=PolicyBriefing)
async def get_policy_briefing(id: str):
    """
    Get Final Policy Briefing
    
    Extracts and returns only the final generated policy briefing 
    for a completed citizen request workflow.
    """
    execution = execution_store.get(id)
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow request not found.")
        
    if execution["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workflow is not yet completed.")
        
    final_response = execution.get("result", {})
    
    briefing = final_response.get("policy_briefing")
    if not briefing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy briefing was not generated for this workflow.")
        
    return briefing

@app.get("/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard():
    """
    Get Dashboard Statistics
    
    Returns aggregate statistics on all submitted workflows.
    """
    try:
        total = len(execution_store)
        completed = sum(1 for e in execution_store.values() if e["status"] == "completed")
        failed = sum(1 for e in execution_store.values() if e["status"] == "failed")
        return {
            "total_requests": total,
            "completed": completed,
            "failed": failed,
            "in_progress": total - completed - failed
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch stats: {str(e)}")

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics():
    """
    Get Workflow Analytics
    
    Returns AI-generated analytics and metrics based on completed workflows, 
    such as average priority scores and issue counts by language.
    """
    try:
        lang_stats = {}
        total_score = 0.0
        completed = 0
        failed = 0
        issues_by_state = {}
        issues_by_district = {}
        issues_by_category = {}
        priority_distribution = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        department_distribution = {}
        scheme_usage = {}
        
        for execution in execution_store.values():
            if execution.get("status") == "failed":
                failed += 1
            elif execution.get("status") == "completed":
                result = execution.get("result", {})
                completed += 1
                
                # Language stats
                lang = result.get("citizen_intelligence", {}).get("detected_language", "Unknown")
                lang_stats[lang] = lang_stats.get(lang, 0) + 1
                
                # Priority score
                score = result.get("decision_intelligence", {}).get("development_priority_index", 0.0)
                total_score += score
                
                # Priority Level
                level = result.get("decision_intelligence", {}).get("priority_level", "Medium")
                if level in priority_distribution:
                    priority_distribution[level] += 1
                else:
                    if score >= 0.8:
                        priority_distribution["Critical"] += 1
                    elif score >= 0.6:
                        priority_distribution["High"] += 1
                    elif score >= 0.4:
                        priority_distribution["Medium"] += 1
                    else:
                        priority_distribution["Low"] += 1
                
                # Location (State / District)
                loc = result.get("citizen_intelligence", {}).get("location", "")
                parts = [p.strip() for p in loc.split(",")]
                state = "Unknown"
                district = "Unknown"
                for part in parts:
                    if part in ["Bihar", "Odisha", "West Bengal", "Jharkhand"]:
                        state = part
                    elif part in ["Araria", "Puri", "Cuttack", "Malda", "Sambalpur", "Mayurbhanj", "Khordha", "Ganjam", "Forbesganj"]:
                        district = part
                
                issues_by_state[state] = issues_by_state.get(state, 0) + 1
                issues_by_district[district] = issues_by_district.get(district, 0) + 1
                
                # Category
                cat = result.get("issue_understanding", {}).get("category", "Others")
                issues_by_category[cat] = issues_by_category.get(cat, 0) + 1
                
                # Department
                dept = result.get("issue_understanding", {}).get("government_department", "Others")
                department_distribution[dept] = department_distribution.get(dept, 0) + 1
                
                # Scheme alignment
                scheme = result.get("development_strategy", {}).get("government_scheme_alignment", "None")
                scheme_usage[scheme] = scheme_usage.get(scheme, 0) + 1
                
        avg_score = total_score / completed if completed > 0 else 0.0
        success_rate = (completed / (completed + failed) * 100) if (completed + failed) > 0 else 100.0
        
        # Calculate Constituency Snapshot details dynamically
        top_dist = max(issues_by_district, key=issues_by_district.get) if issues_by_district else None
        profiles = KnowledgeLoader.get_constituency_profiles()
        
        constituency_name = "Khordha District Constituency"
        population = 2250000
        schools = 1250
        hospitals = 85
        
        if top_dist:
            for prof in profiles:
                if prof.get("district") == top_dist:
                    constituency_name = f"{top_dist} Constituency"
                    population = prof.get("population", population)
                    schools = prof.get("schools", schools)
                    hospitals = prof.get("hospitals", hospitals)
                    break
        
        active_issues = len(execution_store)
        high_priority_issues = priority_distribution.get("Critical", 0) + priority_distribution.get("High", 0)
        
        top_category = max(issues_by_category, key=issues_by_category.get) if issues_by_category else "Infrastructure"
        top_dept = max(department_distribution, key=department_distribution.get) if department_distribution else "Public Works Department"
        top_scheme = max(scheme_usage, key=scheme_usage.get) if scheme_usage else "Pradhan Mantri Gram Sadak Yojana (PMGSY)"
        
        ai_recommendation = (
            f"Allocate immediate development budget towards {top_category} under the {top_scheme} scheme. "
            f"Deploy engineers to resolve structural blocks, with {top_dept} handling direct execution oversight."
        )
        
        constituency_snapshot = {
            "constituency_name": constituency_name,
            "population": population,
            "schools": schools,
            "hospitals": hospitals,
            "active_issues": active_issues,
            "high_priority_issues": high_priority_issues,
            "top_categories": top_category,
            "top_responsible_department": top_dept,
            "average_priority_score": avg_score,
            "recommended_government_scheme": top_scheme,
            "ai_recommendation": ai_recommendation
        }
        
        return {
            "issues_by_language": lang_stats,
            "average_priority_score": avg_score,
            "issues_by_state": issues_by_state,
            "issues_by_district": issues_by_district,
            "issues_by_category": issues_by_category,
            "priority_distribution": priority_distribution,
            "department_distribution": department_distribution,
            "scheme_usage": scheme_usage,
            "workflow_success_rate": success_rate,
            "constituency_snapshot": constituency_snapshot
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate analytics: {str(e)}")

# --- Demo Data API Endpoints ---

@app.get("/demo/requests", response_model=List[Dict[str, Any]])
async def get_demo_requests():
    """
    List Demo Requests
    
    Returns a list of all pre-configured demo citizen requests from the mock dataset.
    """
    try:
        return demo_loader.load_all()
    except DemoLoaderError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.get("/demo/request/{id}", response_model=Dict[str, Any])
async def get_demo_request(id: str):
    """
    Get Demo Request by ID
    
    Returns a specific demo citizen request payload by its ID.
    """
    try:
        return demo_loader.get_request(id)
    except DemoLoaderError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@app.post("/demo/run/{id}", response_model=AgentState)
async def run_demo_request(id: str):
    """
    Execute Demo Request
    
    Loads a demo request by ID and executes the complete AI workflow synchronously,
    returning the final structured AgentState workflow JSON.
    """
    try:
        payload = demo_loader.get_request(id)
    except DemoLoaderError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        
    try:
        request_obj = CitizenRequest(**payload)
        orchestrator = WorkflowOrchestrator()
        final_state = await orchestrator.execute(request_obj.model_dump())
        return final_state
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Workflow execution failed: {str(e)}")
