from fastapi import FastAPI, HTTPException
from app.models.schemas import CitizenRequest
from app.orchestrator.workflow import janniti_ai_workflow
from app.demo_data.demo_loader import demo_loader, DemoLoaderError
import render_sdk

app = FastAPI(
    title="JanNiti AI API",
    description="Production endpoints for JanNiti AI Orchestrator running natively on Render Workflows",
    version="1.0.0"
)

from render_sdk import RenderAsync

# Initialize Render SDK Client (uses env credentials automatically)
try:
    render_client = RenderAsync()
except ValueError:
    class MockWorkflows:
        async def start_task(self, *args, **kwargs):
            class Ex: id = "mock_id"
            return Ex()
        async def get_task_run(self, *args, **kwargs):
            class Ex: 
                status = type('obj', (object,), {'value': 'in_progress'})
                error = None
                results = [{}]
            return Ex()
        async def list_task_runs(self, *args, **kwargs):
            return []
    class MockClient:
        workflows = MockWorkflows()
    render_client = MockClient()

@app.post("/submit", response_model=dict)
async def submit_workflow(request: CitizenRequest):
    """
    Submits a citizen issue and kicks off the 6-agent AI workflow natively on Render.
    """
    # Trigger the workflow in the distributed render infrastructure
    try:
        execution = await render_client.workflows.start_task(
            "janniti-ai/janniti_ai_workflow",
            [request.model_dump()]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "request_id": execution.id,
        "status": "in_progress",
        "message": "Workflow started successfully on Render."
    }

@app.get("/workflow/{request_id}", response_model=dict)
async def get_workflow_status(request_id: str):
    """
    Returns the current status and execution data for a specific workflow from Render.
    """
    try:
        execution = await render_client.workflows.get_task_run(request_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Workflow request not found on Render.")
        
    if execution.status.value != "completed":
        return {
            "request_id": request_id,
            "status": execution.status.value,
            "error": execution.error
        }
        
    return {
        "request_id": request_id,
        "status": execution.status.value,
        "workflow_data": execution.results[0] if execution.results else {}
    }

@app.get("/report/{request_id}", response_model=dict)
async def get_policy_briefing(request_id: str):
    """
    Returns only the final policy briefing for a completed workflow from Render.
    """
    try:
        execution = await render_client.workflows.get_task_run(request_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Workflow request not found on Render.")
        
    if execution.status.value != "completed":
        raise HTTPException(status_code=400, detail="Workflow is not yet completed.")
        
    final_response = execution.results[0] if execution.results else {}
    
    briefing = final_response.get("policy_briefing")
    if not briefing:
        raise HTTPException(status_code=404, detail="Policy briefing was not generated for this workflow.")
        
    return briefing

@app.get("/dashboard", response_model=dict)
async def get_dashboard():
    """
    Returns aggregate statistics directly from Render's API.
    """
    try:
        runs = await render_client.workflows.list_task_runs()
        total = len(runs)
        completed = sum(1 for r in runs if r.status.value == "completed")
        failed = sum(1 for r in runs if r.status.value == "failed")
        return {
            "total_requests": total,
            "completed": completed,
            "failed": failed,
            "in_progress": total - completed - failed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats from Render: {str(e)}")


# --- Demo Data API Endpoints ---

@app.get("/demo/requests")
async def get_demo_requests():
    """Returns all demo citizen requests."""
    try:
        return demo_loader.load_all()
    except DemoLoaderError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/demo/request/{id}")
async def get_demo_request(id: str):
    """Returns a specific demo citizen request by ID."""
    try:
        return demo_loader.get_request(id)
    except DemoLoaderError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/demo/run/{id}")
async def run_demo_request(id: str):
    """
    Loads a demo request by ID and executes the complete AI workflow synchronously
    as if a citizen submitted it, returning the final structured workflow JSON.
    """
    try:
        payload = demo_loader.get_request(id)
    except DemoLoaderError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    try:
        # Convert the dictionary to CitizenRequest to ensure schema validation
        request_obj = CitizenRequest(**payload)
        # Execute the workflow function directly to get the final state JSON
        final_state = await janniti_ai_workflow(request_obj.model_dump())
        return final_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")
