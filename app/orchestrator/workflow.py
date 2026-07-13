import asyncio
import logging
from app.models.schemas import AgentState, CitizenRequest
from app.orchestrator.app import workflow_app

from app.agents.citizen_intake import citizen_intake_task
from app.agents.issue_intelligence import issue_intelligence_task
from app.agents.constituency_context import constituency_context_task
from app.agents.priority_decision import priority_decision_task
from app.agents.development_planning import development_planning_task
from app.agents.executive_briefing import executive_briefing_task

logger = logging.getLogger(__name__)

@workflow_app.task
async def janniti_ai_workflow(request_dict: dict) -> dict:
    """
    Executes the 6-agent AI sequence using a native Render Workflows DAG with Fan-Out.
    Gracefully handles failures and preserves execution history.
    """
    logger.info("Starting Render Workflow DAG for JanNiti AI...")
    
    execution_history = []
    errors = []
    workflow_status = "in_progress"
    
    # Initialize basic state variables in case of early failure
    request = CitizenRequest(**request_dict)
    intake_task = issue_task = context_task = priority_task = strategy_task = briefing_task = None

    try:
        # 1. Citizen Intelligence
        execution_history.append({"event": "citizen_intake_task: started"})
        intake_task = await citizen_intake_task(request.model_dump())
        execution_history.append({"event": "citizen_intake_task: completed"})
        
        # 2. Fan-Out Pattern
        execution_history.append({"event": "fan_out (issue_intelligence, constituency_context): started"})
        issue_task, context_task = await asyncio.gather(
            issue_intelligence_task(intake_task),
            constituency_context_task()
        )
        execution_history.append({"event": "fan_out: completed"})
        
        # 3. Fan-In Pattern
        execution_history.append({"event": "priority_decision_task: started"})
        priority_task = await priority_decision_task(issue_task, context_task)
        execution_history.append({"event": "priority_decision_task: completed"})
        
        # 4. Planning Phase
        execution_history.append({"event": "development_planning_task: started"})
        strategy_task = await development_planning_task(issue_task, context_task, priority_task)
        execution_history.append({"event": "development_planning_task: completed"})
        
        # 5. (Removed Unsupported Pause Execution)
        # The official SDK does not support `wait_for_event` natively mid-task.
        # Proceeding directly to finalization.
        # 6. Finalization
        execution_history.append({"event": "executive_briefing_task: started"})
        briefing_task = await executive_briefing_task(
            intake_task, issue_task, context_task, priority_task, strategy_task
        )
        execution_history.append({"event": "executive_briefing_task: completed"})
        
        workflow_status = "completed"
        logger.info("Render Workflow DAG completed successfully.")
        
    except Exception as e:
        logger.error(f"Workflow failed: {str(e)}")
        errors.append(str(e))
        workflow_status = "failed"
        execution_history.append({"event": f"failed_at_exception: {type(e).__name__}"})
        
    # Reassemble the final AgentState
    final_state = AgentState(
        citizen_request=request,
        citizen_intelligence=intake_task,
        issue_understanding=issue_task,
        constituency_intelligence=context_task,
        decision_intelligence=priority_task,
        development_strategy=strategy_task,
        policy_briefing=briefing_task,
        workflow_status=workflow_status,
        errors=errors,
        execution_history=execution_history
    )
    
    return final_state.model_dump()
