import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.workflow import AgentTaskLog, WorkflowRun
from app.schemas.workflow import (
    AgentStatisticsResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunSummary,
)
from app.services.agent_orchestrator import AgentOrchestrator

router = APIRouter()
logger = logging.getLogger("app")


@router.post("/run", status_code=status.HTTP_201_CREATED)
async def run_agent_workflow(
    request: WorkflowRunRequest, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Triggers a coordinated AI Agent workflow run session.

    Iterates through the 12 agents, logging statuses and retries.
    """
    try:
        run_id, results = await AgentOrchestrator.run_workflow(
            trigger_type=request.trigger_type,
            payload=request.payload,
            db=db
        )
        return {"run_id": run_id, "results": results}
    except Exception as e:
        logger.exception("Failed to run agentic workflow")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution failed: {str(e)}",
        )


@router.get("/runs", response_model=List[WorkflowRunSummary])
def get_workflow_runs(db: Session = Depends(get_db)) -> List[WorkflowRun]:
    """Lists history of recent agent workflow execution sessions."""
    return db.query(WorkflowRun).order_by(WorkflowRun.started_at.desc()).limit(20).all()


@router.get("/run/{id}", response_model=WorkflowRunResponse)
def get_workflow_run_details(id: str, db: Session = Depends(get_db)) -> WorkflowRun:
    """Returns detailed status, durations, and task logs for a specific run ID."""
    run = db.query(WorkflowRun).filter(WorkflowRun.id == id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow run ID {id} not found."
        )
    return run


@router.get("/statistics", response_model=List[AgentStatisticsResponse])
def get_agent_statistics(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Compiles execution averages, retries, and success rates for each agent type."""
    agents = [
        "TranslationAgent",
        "ClassificationAgent",
        "EntityExtractionAgent",
        "LocationIntelligenceAgent",
        "KnowledgeGraphAgent",
        "InfrastructureAnalysisAgent",
        "PriorityRecommendationAgent",
        "BudgetOptimizationAgent",
        "ImpactPredictionAgent",
        "ExplainableAIAgent",
        "ReportGenerationAgent",
        "AICopilotAgent",
    ]

    stats = []
    for agent in agents:
        logs = db.query(AgentTaskLog).filter(AgentTaskLog.agent_name == agent).all()
        
        total = len(logs)
        if total == 0:
            # Baseline mock stats for fresh installs
            stats.append({
                "agent_name": agent,
                "total_runs": 0,
                "success_rate": 100.0,
                "avg_latency_ms": 150.0 if "Agent" in agent else 300.0,
                "failure_count": 0,
                "retry_count": 0,
            })
            continue

        completed = sum(1 for log in logs if log.status == "Completed")
        failed = sum(1 for log in logs if log.status == "Failed")
        retries = sum(log.retries for log in logs)
        total_time = sum(log.execution_time_ms for log in logs)

        stats.append({
            "agent_name": agent,
            "total_runs": total,
            "success_rate": round((completed / total) * 100.0, 1),
            "avg_latency_ms": round(total_time / total, 1),
            "failure_count": failed,
            "retry_count": retries,
        })

    return stats
