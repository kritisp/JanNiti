import logging
from app.models.schemas import AgentState, CitizenRequest

from app.agents.citizen_intake import CitizenIntakeAgent
from app.agents.issue_intelligence import IssueIntelligenceAgent
from app.agents.constituency_context import ConstituencyContextAgent
from app.agents.priority_decision import PriorityDecisionAgent
from app.agents.development_planning import DevelopmentPlanningAgent
from app.agents.executive_briefing import ExecutiveBriefingAgent

logger = logging.getLogger(__name__)

class WorkflowOrchestrator:
    async def execute(self, request_dict: dict) -> dict:
        """
        Executes the 6-agent AI sequence strictly sequentially.
        Gracefully handles failures and preserves execution history.
        """
        logger.info("Starting Workflow DAG for JanNiti AI...")
        
        request = CitizenRequest(**request_dict)
        state = AgentState(citizen_request=request)
        
        try:
            # 1. Citizen Intelligence
            state.execution_history.append({"event": "CitizenIntakeAgent: started"})
            state.citizen_intelligence = await CitizenIntakeAgent().execute(state.model_dump())
            state.execution_history.append({"event": "CitizenIntakeAgent: completed"})
            
            # 2. Issue Intelligence
            state.execution_history.append({"event": "IssueIntelligenceAgent: started"})
            state.issue_understanding = await IssueIntelligenceAgent().execute(state.model_dump())
            state.execution_history.append({"event": "IssueIntelligenceAgent: completed"})

            # 3. Constituency Context
            state.execution_history.append({"event": "ConstituencyContextAgent: started"})
            state.constituency_intelligence = await ConstituencyContextAgent().execute(state.model_dump())
            state.execution_history.append({"event": "ConstituencyContextAgent: completed"})
            
            # 4. Priority Decision
            state.execution_history.append({"event": "PriorityDecisionAgent: started"})
            state.decision_intelligence = await PriorityDecisionAgent().execute(state.model_dump())
            state.execution_history.append({"event": "PriorityDecisionAgent: completed"})
            
            # 5. Planning Phase
            state.execution_history.append({"event": "DevelopmentPlanningAgent: started"})
            state.development_strategy = await DevelopmentPlanningAgent().execute(state.model_dump())
            state.execution_history.append({"event": "DevelopmentPlanningAgent: completed"})
            
            # 6. Finalization
            state.execution_history.append({"event": "ExecutiveBriefingAgent: started"})
            state.policy_briefing = await ExecutiveBriefingAgent().execute(state.model_dump())
            state.execution_history.append({"event": "ExecutiveBriefingAgent: completed"})
            
            state.workflow_status = "completed"
            logger.info("Workflow DAG completed successfully.")
            
        except Exception as e:
            logger.error(f"Workflow failed: {str(e)}")
            state.errors.append(str(e))
            state.workflow_status = "failed"
            state.execution_history.append({"event": f"failed_at_exception: {type(e).__name__}"})
            
        return state.model_dump()
