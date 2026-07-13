import logging
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.citizen_request import CitizenRequest
from app.models.village import Village

logger = logging.getLogger("app")


class GisService:
    """Analytical engine calculating infrastructure gap scores and prioritizing regions."""

    @staticmethod
    def seed_villages_if_empty(db: Session) -> None:
        """Seeds baseline villages in Araria district, Bihar if table is empty."""
        try:
            if db.query(Village).count() > 0:
                logger.info("Villages database is already populated. Skipping seeding.")
                return

            logger.info("Seeding baseline villages in Araria constituency...")
            
            # Realistic coordinates and indicator variables for Bihar constituency nodes
            seed_data = [
                {
                    "name": "Aurangpur",
                    "ward": "Ward No. 3",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.1542,
                    "longitude": 87.5021,
                    "population": 12400,
                    "road_quality": 0.35,
                    "water_access": 0.40,
                    "electricity_access": 0.65,
                    "school_count": 2,
                    "hospital_count": 0,
                },
                {
                    "name": "Nayanagar",
                    "ward": "Ward No. 1",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.1215,
                    "longitude": 87.4563,
                    "population": 8200,
                    "road_quality": 0.70,
                    "water_access": 0.80,
                    "electricity_access": 0.85,
                    "school_count": 3,
                    "hospital_count": 1,
                },
                {
                    "name": "Raniganj",
                    "ward": "Ward No. 5",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.0754,
                    "longitude": 87.2529,
                    "population": 24500,
                    "road_quality": 0.20,
                    "water_access": 0.35,
                    "electricity_access": 0.50,
                    "school_count": 4,
                    "hospital_count": 1,
                },
                {
                    "name": "Forbesganj",
                    "ward": "Ward No. 9",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.2981,
                    "longitude": 87.2558,
                    "population": 45000,
                    "road_quality": 0.80,
                    "water_access": 0.75,
                    "electricity_access": 0.90,
                    "school_count": 9,
                    "hospital_count": 3,
                },
                {
                    "name": "Kursakanta",
                    "ward": "Ward No. 2",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.3752,
                    "longitude": 87.4118,
                    "population": 6100,
                    "road_quality": 0.45,
                    "water_access": 0.50,
                    "electricity_access": 0.60,
                    "school_count": 1,
                    "hospital_count": 0,
                },
                {
                    "name": "Jokihat",
                    "ward": "Ward No. 7",
                    "district": "Araria",
                    "state": "Bihar",
                    "latitude": 26.1388,
                    "longitude": 87.6115,
                    "population": 15400,
                    "road_quality": 0.30,
                    "water_access": 0.25,
                    "electricity_access": 0.40,
                    "school_count": 3,
                    "hospital_count": 0,
                },
            ]

            for data in seed_data:
                village = Village(**data)
                db.add(village)
                # Compute baseline derived indices immediately on creation
                GisService.recalculate_village_metrics(db, village, commit=False)

            db.commit()
            logger.info("Successfully seeded and calculated baseline villages.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to seed baseline villages: {str(e)}")

    @staticmethod
    def recalculate_village_metrics(db: Session, village: Village, commit: bool = True) -> None:
        """Calculates derived gap values, overall index, and demand weighting."""
        # 1. Base infrastructure gaps
        village.gap_score_road = float(1.0 - village.road_quality)
        village.gap_score_water = float(1.0 - village.water_access)
        village.gap_score_electricity = float(1.0 - village.electricity_access)

        # 2. Capacity ratios (Schools/Hospitals per capita thresholds)
        # Normal ratio: 1 school per 3,000 citizens
        target_schools = max(1.0, village.population / 3000.0)
        village.gap_score_school = float(
            max(0.0, min(1.0, 1.0 - (village.school_count / target_schools)))
        )

        # Normal ratio: 1 clinic/hospital per 12,000 citizens
        target_hospitals = max(1.0, village.population / 12000.0)
        village.gap_score_hospital = float(
            max(0.0, min(1.0, 1.0 - (village.hospital_count / target_hospitals)))
        )

        # 3. Overall development composite index
        average_gap = (
            village.gap_score_road
            + village.gap_score_water
            + village.gap_score_electricity
            + village.gap_score_school
            + village.gap_score_hospital
        ) / 5.0
        village.development_index = float(1.0 - average_gap)

        # 4. Integrate Citizen Complaints Demand weighting
        complaints = (
            db.query(CitizenRequest)
            .filter(CitizenRequest.village.ilike(f"%{village.name}%"))
            .all()
        )

        demand_weight = 0.0
        if complaints:
            # Aggregate weights based on severity/urgency factors
            for comp in complaints:
                weight = 0.3  # Base weight
                if comp.urgency == "Critical":
                    weight += 0.5
                elif comp.urgency == "High":
                    weight += 0.3
                
                # Boost based on affected population density
                affected_pop = comp.affected_population or 500
                weight += min(0.2, affected_pop / 5000.0)
                demand_weight += weight

        citizen_demand_score = min(1.0, demand_weight / 5.0)

        # 5. Composite Priority Score: 60% Infrastructure Gap + 40% active demand
        village.priority_score = float(
            (average_gap * 0.6) + (citizen_demand_score * 0.4)
        )

        if commit:
            db.add(village)
            db.commit()

    @staticmethod
    def get_heatmap_points(db: Session) -> List[Dict[str, Any]]:
        """Maps active citizen requests to coordinates with weight intensity."""
        requests = (
            db.query(CitizenRequest)
            .filter(CitizenRequest.processed == True)
            .all()
        )
        villages = db.query(Village).all()
        
        # Build index mapping name -> coordinates
        coords_map = {v.name.lower(): (v.latitude, v.longitude) for v in villages}
        
        points = []
        for req in requests:
            v_name = req.village.lower().strip()
            # Resolve geocode by mapping village names
            if v_name in coords_map:
                lat, lng = coords_map[v_name]
                
                # Severity calculations
                intensity = 0.3
                if req.urgency == "Critical":
                    intensity += 0.5
                elif req.urgency == "High":
                    intensity += 0.3
                
                pop = req.affected_population or 500
                intensity += min(0.2, pop / 10000.0)

                points.append({
                    "lat": lat,
                    "lng": lng,
                    "intensity": min(1.0, intensity),
                    "request_id": req.id,
                    "category": req.ai_category or req.submitted_category,
                    "village": req.village,
                })
        
        return points

    @staticmethod
    def get_aggregate_analytics(db: Session) -> Dict[str, Any]:
        """Gathers aggregate regional coverage numbers and priority summaries."""
        villages = db.query(Village).order_by(Village.priority_score.desc()).all()
        
        if not villages:
            return {}

        total_pop = sum(v.population for v in villages)
        avg_dev = sum(v.development_index for v in villages) / len(villages)
        
        # Determine top underserved regions
        top_underserved = [
            {
                "id": v.id,
                "name": v.name,
                "priority_score": round(v.priority_score, 2),
                "population": v.population,
            }
            for v in villages[:3]
        ]

        # Calculate average gaps across variables
        avg_road_gap = sum(v.gap_score_road for v in villages) / len(villages)
        avg_water_gap = sum(v.gap_score_water for v in villages) / len(villages)
        avg_school_gap = sum(v.gap_score_school for v in villages) / len(villages)
        avg_hospital_gap = sum(v.gap_score_hospital for v in villages) / len(villages)

        return {
            "constituency_summary": {
                "total_villages": len(villages),
                "total_population": total_pop,
                "average_development_index": round(avg_dev, 2),
            },
            "top_underserved": top_underserved,
            "average_gaps": {
                "Roads": round(avg_road_gap, 2),
                "Water": round(avg_water_gap, 2),
                "Schools": round(avg_school_gap, 2),
                "Clinics": round(avg_hospital_gap, 2),
            },
        }
