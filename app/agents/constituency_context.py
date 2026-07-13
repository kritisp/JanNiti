import logging
from app.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)

class ConstituencyContextAgent:
    async def execute(self, state_dict: dict) -> dict:
        """Constituency Intelligence Agent Task"""
        logger.info("[Constituency Intelligence Agent] Gathering constituency intelligence...")
        
        profiles = KnowledgeLoader.get_constituency_profiles()
        demographics = KnowledgeLoader.get_demographic_reference()
        infrastructure = KnowledgeLoader.get_infrastructure_reference()
        
        from app.models.schemas import AgentState, ConstituencyIntelligence
        state = AgentState(**state_dict)
        intake = state.citizen_intelligence
        
        if not intake:
            raise ValueError("ConstituencyContextAgent requires CitizenIntelligence in the state.")
            
        loc = intake.location.lower()
        matched_profile = None
        for p in profiles:
            if p["district"].lower() in loc or p["state"].lower() in loc:
                matched_profile = p
                break
                
        if not matched_profile:
            matched_profile = profiles[0]
            
        total_pop = matched_profile.get("population", 0)
        estimated_impact = int(total_pop * 0.10)
        
        schemes = KnowledgeLoader.get_government_schemes()
        
        constituency_intelligence = ConstituencyIntelligence(
            constituency_name=matched_profile.get("district", "Unknown District"),
            population=total_pop,
            villages=matched_profile.get("schools", 0) // 10,
            schools=matched_profile.get("schools", 0),
            hospitals=matched_profile.get("hospitals", 0),
            phcs=infrastructure.get("hospitals", {}).get("phc", 0),
            road_network_km=matched_profile.get("road_network_km", 0.0),
            water_supply_coverage=f"{matched_profile.get('water_coverage_pct', 0)}%",
            electricity_coverage=f"{infrastructure.get('electricity', {}).get('household_coverage_pct', 0)}%",
            historical_complaints=total_pop // 1000,
            infrastructure_gaps=["water", "roads", "healthcare"] if matched_profile.get("water_coverage_pct", 100) < 80 else ["education", "digital"],
            estimated_population_impacted=estimated_impact,
            existing_development_projects=schemes
        )
        
        return constituency_intelligence.model_dump()
