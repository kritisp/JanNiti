import uuid
from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from typing import List, Dict, Any
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

app = FastAPI(
    title="JanNiti AI API",
    description="Production endpoints for JanNiti AI Orchestrator running locally without Render SDK",
    version="1.0.0"
)

# In-memory execution store for local persistence since we removed Render SDK
# Format: { "request_id": { "status": "in_progress" | "completed" | "failed", "result": None, "error": None } }
execution_store = {}

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
        for execution in execution_store.values():
            if execution.get("status") == "completed":
                result = execution.get("result", {})
                
                # Language stats
                lang = result.get("citizen_intelligence", {}).get("detected_language", "Unknown")
                lang_stats[lang] = lang_stats.get(lang, 0) + 1
                
                # Priority score
                score = result.get("decision_intelligence", {}).get("development_priority_index", 0.0)
                total_score += score
                completed += 1
                
        avg_score = total_score / completed if completed > 0 else 0.0
        
        return {
            "issues_by_language": lang_stats,
            "average_priority_score": avg_score
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
