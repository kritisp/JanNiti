import asyncio
from app.models.schemas import CitizenRequest
from app.orchestrator.workflow import Orchestrator

async def main():
    request = CitizenRequest(
        citizen_id="C-12345",
        issue_description="The main road is full of potholes, causing major traffic and accidents.",
        location="MG Road, Ward 4"
    )
    
    orchestrator = Orchestrator()
    final_state = await orchestrator.execute_workflow(request)
    
    import json
    print(final_state.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(main())
