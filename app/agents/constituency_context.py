import logging
from app.services.knowledge_loader import KnowledgeLoader
from app.orchestrator.app import workflow_app

logger = logging.getLogger(__name__)

@workflow_app.task
async def constituency_context_task() -> dict:
    """Constituency Intelligence Agent Task"""
    logger.info("[Constituency Intelligence Agent] Gathering constituency intelligence...")
    
    c_data = KnowledgeLoader.get_constituency_data()
    
    # Return all development projects for planning phase to filter later
    existing_projects = KnowledgeLoader.get_development_projects()
        
    total_pop = c_data.get("population", 0)
    estimated_impact = int(total_pop * 0.10)
    
    from app.models.schemas import ConstituencyIntelligence
    constituency_intelligence = ConstituencyIntelligence(
        constituency_name=c_data.get("constituency_name", ""),
        population=total_pop,
        villages=c_data.get("villages", 0),
        schools=c_data.get("schools", 0),
        hospitals=c_data.get("hospitals", 0),
        phcs=c_data.get("phcs", 0),
        road_network_km=c_data.get("road_length_km", 0.0),
        water_supply_coverage=f"{c_data.get('water_supply_coverage_pct', 0)}%",
        electricity_coverage=f"{c_data.get('electricity_coverage_pct', 0)}%",
        historical_complaints=c_data.get("historical_complaints_ytd", 0),
        infrastructure_gaps=c_data.get("infrastructure_gaps", []),
        estimated_population_impacted=estimated_impact,
        existing_development_projects=existing_projects
    )
    
    return constituency_intelligence.model_dump()
