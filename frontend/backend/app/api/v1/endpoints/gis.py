import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.village import Village
from app.services.gis_service import GisService

router = APIRouter()
logger = logging.getLogger("app")


@router.get("/villages")
def get_villages(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Lists all villages in constituency, recalculating live priority indices first."""
    try:
        villages = db.query(Village).all()
        # Refresh dynamic metrics on-the-fly to reflect citizen complaints
        for v in villages:
            GisService.recalculate_village_metrics(db, v, commit=False)
        db.commit()
        return villages
    except Exception as e:
        logger.error(f"Failed to fetch GIS village overlays: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve village geocodes."
        )


@router.get("/heatmap")
def get_heatmap(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns active complaints coordinates and weight intensities for Leaflet heat overlays."""
    return GisService.get_heatmap_points(db)


@router.get("/infrastructure")
def get_infrastructure_points(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Generates geocoded markers for schools and clinics, shifted around village center coordinates."""
    villages = db.query(Village).all()
    infrastructure = []
    
    for v in villages:
        # Create school markers shifted slightly North-West
        for i in range(v.school_count):
            infrastructure.append({
                "type": "School",
                "name": f"{v.name} Secondary School #{i+1}",
                "latitude": v.latitude + 0.0018 * (i + 1),
                "longitude": v.longitude - 0.0012 * (i + 1),
                "village": v.name
            })
            
        # Create clinic markers shifted slightly South-East
        for i in range(v.hospital_count):
            infrastructure.append({
                "type": "Clinic",
                "name": f"{v.name} Primary Health Center #{i+1}",
                "latitude": v.latitude - 0.0015 * (i + 1),
                "longitude": v.longitude + 0.0019 * (i + 1),
                "village": v.name
            })
            
    return infrastructure


@router.get("/gaps")
def get_gaps_summary(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns compiled deficit indicators across all regional villages."""
    villages = db.query(Village).all()
    return [{
        "village_id": v.id,
        "village_name": v.name,
        "road_gap": round(v.gap_score_road, 2),
        "water_gap": round(v.gap_score_water, 2),
        "school_gap": round(v.gap_score_school, 2),
        "clinic_gap": round(v.gap_score_hospital, 2),
        "electricity_gap": round(v.gap_score_electricity, 2),
        "priority_score": round(v.priority_score, 2)
    } for v in villages]


@router.get("/analytics")
def get_gis_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns aggregated deficit indicators and population coverage indexes."""
    return GisService.get_aggregate_analytics(db)


@router.get("/village/{id}")
def get_village_profile(id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns detailed demographic, infrastructure, and priority index cards for a single village."""
    village = db.query(Village).filter(Village.id == id).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with ID {id} not found."
        )
    GisService.recalculate_village_metrics(db, village)
    return village
