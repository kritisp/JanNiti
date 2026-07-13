from fastapi import APIRouter
from app.api.v1.endpoints import citizen, health, knowledge_graph, gis, agents

api_router = APIRouter()

# Register sub-routers under their respective tags and prefixes
api_router.include_router(health.router, tags=["health"])
api_router.include_router(citizen.router, prefix="/citizen", tags=["citizen"])
api_router.include_router(knowledge_graph.router, prefix="/knowledge-graph", tags=["knowledge-graph"])
api_router.include_router(gis.router, prefix="/gis", tags=["gis"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
