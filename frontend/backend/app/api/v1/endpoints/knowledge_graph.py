import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.citizen_request import CitizenRequest
from app.services.graph_service import GraphService

router = APIRouter()
logger = logging.getLogger("app")


@router.post("/build", status_code=status.HTTP_200_OK)
def rebuild_knowledge_graph(db: Session = Depends(get_db)) -> dict:
    """Scans the PostgreSQL database for processed complaints and imports them to Neo4j.

    Acts as a synchronization utility to reconcile Neo4j state.
    """
    try:
        requests = db.query(CitizenRequest).filter(CitizenRequest.processed == True).all()
        synced_count = 0
        
        for req in requests:
            success = GraphService.sync_complaint_to_graph(req)
            if success:
                synced_count += 1

        logger.info(
            f"Knowledge Graph rebuild trigger finished. Synced {synced_count}/{len(requests)} items."
        )
        return {
            "success": True,
            "message": f"Successfully synchronized {synced_count} of {len(requests)} processed citizen requests to Neo4j.",
        }
    except Exception as e:
        logger.exception("Failed to run knowledge graph database sync trigger.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph build sync trigger failed: {str(e)}",
        )


@router.get("/full")
@router.get("/")
def get_full_graph() -> dict:
    """Fetches the full active Neo4j graph, formatted for React Flow rendering."""
    return GraphService.get_full_graph()


@router.get("/village/{id}")
def get_village_neighborhood(id: str) -> dict:
    """Fetches the localized neighborhood sub-graph centered around a specific village name."""
    # The 'id' parameter corresponds to the village name in Cypher
    return GraphService.get_village_graph(id)


@router.get("/infrastructure")
def get_infrastructure_subgraph() -> dict:
    """Fetches a filtered sub-graph displaying active infrastructure assets and gaps."""
    return GraphService.get_infrastructure_graph()


@router.get("/recommendations")
def get_recommendations_subgraph() -> dict:
    """Fetches a filtered sub-graph displaying MP Recommendations and Government Projects."""
    return GraphService.get_recommendations_graph()


@router.get("/statistics")
def get_graph_statistics() -> dict:
    """Calculates relationship densities, node metrics, and community detection counts."""
    return GraphService.get_graph_statistics()
