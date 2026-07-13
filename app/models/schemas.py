from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

class CitizenRequest(BaseModel):
    """The initial payload received from a citizen."""
    text: str = Field(..., description="Raw text description of the issue")
    language: Optional[str] = Field(default=None, description="Language of the text")
    location: str = Field(..., description="Location of the issue")
    image_url: Optional[str] = Field(default=None, description="URL of an attached image")
    audio_url: Optional[str] = Field(default=None, description="URL of an attached audio file")

class CitizenIntelligence(BaseModel):
    request_id: str
    original_text: str
    translated_text: str
    detected_language: str = ""
    language_code: str = ""
    location: str
    timestamp: str
    attachments: List[str] = Field(default_factory=list)

class IssueUnderstanding(BaseModel):
    category: str
    subcategory: str
    urgency: str
    severity_score: float
    confidence: int
    government_department: str
    affected_groups: List[str] = Field(default_factory=list)
    possible_risks: List[str] = Field(default_factory=list)
    sdg_mapping: str
    summary: str
    keywords: List[str] = Field(default_factory=list)
    immediate_intervention_required: bool

class ConstituencyIntelligence(BaseModel):
    constituency_name: str
    population: int
    villages: int
    schools: int
    hospitals: int
    phcs: int
    road_network_km: float
    water_supply_coverage: str
    electricity_coverage: str
    historical_complaints: int
    infrastructure_gaps: List[str] = Field(default_factory=list)
    estimated_population_impacted: int
    existing_development_projects: List[Dict[str, Any]] = Field(default_factory=list)

class DecisionIntelligence(BaseModel):
    development_priority_index: float
    priority_level: str
    score_breakdown: Dict[str, float]
    reasons: List[str] = Field(default_factory=list)
    confidence: int

class DevelopmentStrategy(BaseModel):
    recommended_project: str
    alternative_solutions: List[str] = Field(default_factory=list)
    estimated_budget_range: str
    estimated_timeline: str
    expected_beneficiaries: str
    departments_involved: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    government_scheme_alignment: str
    success_metrics: List[str] = Field(default_factory=list)

class PolicyBriefing(BaseModel):
    markdown_content: str
    html_content: str
    pdf_ready_content: str
    english_report: str = ""
    hindi_report: str = ""
    odia_report: str = ""
    bengali_report: str = ""
    english_audio: str = ""
    hindi_audio: str = ""
    odia_audio: str = ""
    bengali_audio: str = ""

class AgentState(BaseModel):
    """
    The shared state object that gets passed sequentially through all agents.
    Strictly types all inputs and outputs across the orchestration layer.
    """
    citizen_request: CitizenRequest
    
    citizen_intelligence: Optional[CitizenIntelligence] = None
    issue_understanding: Optional[IssueUnderstanding] = None
    constituency_intelligence: Optional[ConstituencyIntelligence] = None
    decision_intelligence: Optional[DecisionIntelligence] = None
    development_strategy: Optional[DevelopmentStrategy] = None
    policy_briefing: Optional[PolicyBriefing] = None

    execution_metadata: Dict[str, Any] = Field(default_factory=dict)
    execution_history: List[Dict[str, Any]] = Field(default_factory=list)
    current_agent: Optional[str] = None
    workflow_status: str = Field(default="pending")
    errors: List[str] = Field(default_factory=list)

# --- API Response Models ---

class SubmitResponse(BaseModel):
    """Response model for submitting a workflow."""
    request_id: str = Field(..., description="Unique UUID for the citizen request")
    status: str = Field(..., description="Status of the background task (e.g., in_progress)")
    message: str = Field(..., description="Confirmation message")

class WorkflowStatusResponse(BaseModel):
    """Response model for checking workflow status."""
    request_id: str = Field(..., description="Unique UUID of the request")
    status: str = Field(..., description="Current status: in_progress, completed, failed")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    workflow_data: Optional[AgentState] = Field(default=None, description="The full AgentState if completed")

class DashboardStatsResponse(BaseModel):
    """Response model for dashboard statistics."""
    total_requests: int = Field(..., description="Total requests processed or in queue")
    completed: int = Field(..., description="Successfully completed workflows")
    failed: int = Field(..., description="Workflows that failed due to errors")
    in_progress: int = Field(..., description="Workflows currently executing")

class AnalyticsResponse(BaseModel):
    """Response model for analytics endpoint."""
    issues_by_language: Dict[str, int] = Field(default_factory=dict, description="Count of issues by language")
    average_priority_score: float = Field(default=0.0, description="Average Development Priority Index")
