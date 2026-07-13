from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AgentTaskLogResponse(BaseModel):
    id: int
    run_id: str
    agent_name: str
    status: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    execution_time_ms: float
    retries: int
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunResponse(BaseModel):
    id: str
    trigger_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_time_ms: float
    task_logs: List[AgentTaskLogResponse] = []

    class Config:
        from_attributes = True


class WorkflowRunSummary(BaseModel):
    id: str
    trigger_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_time_ms: float

    class Config:
        from_attributes = True


class WorkflowRunRequest(BaseModel):
    trigger_type: str = "Citizen Submission"
    payload: Dict[str, Any] = {}


class AgentStatisticsResponse(BaseModel):
    agent_name: str
    total_runs: int
    success_rate: float  # Percentage
    avg_latency_ms: float
    failure_count: int
    retry_count: int
