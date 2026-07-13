import logging
from render_sdk import Workflows

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the central Render Workflows app instance
# Default configuration
workflow_app = Workflows()

if __name__ == "__main__":
    # Import tasks so they are registered with the worker before starting
    import app.orchestrator.workflow
    import app.agents.citizen_intake
    import app.agents.issue_intelligence
    import app.agents.constituency_context
    import app.agents.priority_decision
    import app.agents.development_planning
    import app.agents.executive_briefing
    
    logger.info("Starting Render Workflows worker...")
    workflow_app.start()
