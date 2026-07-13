from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging

# Initialize Logging Configuration
configure_logging()

# Create FastAPI instance, hiding Swagger Docs in non-development environments
app = FastAPI(
    title="JanVikas AI API",
    description="Explainable AI Governance Platform for development project planning.",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# Configure CORS Middleware
# Pulls allowed origins from environment settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles
from app.core.database import engine, SessionLocal
from app.models.base import Base
from app.models.village import Village
from app.models.workflow import WorkflowRun, AgentTaskLog
from app.api.v1.endpoints import citizen
from app.services.gis_service import GisService

# Ensure database tables exist (automatic bootstrap)
Base.metadata.create_all(bind=engine)

# Seed default village geocodes and socio-development baseline datasets
db = SessionLocal()
try:
    GisService.seed_villages_if_empty(db)
finally:
    db.close()

# Register global exception handlers for mapping AppExceptions -> JSON response
register_exception_handlers(app)

# Ensure uploads directory structure exists and mount it for static assets serving
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount health check endpoint directly at the root (GET /health) for Render's active monitor
app.include_router(health.router)

# Mount v1 business routers under '/api/v1' prefix
app.include_router(api_router, prefix="/api/v1")

# Mount direct citizen endpoint at exact /api/citizen prefix for client specifications
app.include_router(citizen.router, prefix="/api/citizen", tags=["citizen_direct"])

# Mount direct knowledge-graph router at exact /api/knowledge-graph prefix for client specifications
from app.api.v1.endpoints import knowledge_graph
app.include_router(knowledge_graph.router, prefix="/api/knowledge-graph", tags=["knowledge-graph_direct"])

# Mount direct gis router at exact /api/gis prefix for client specifications
from app.api.v1.endpoints import gis
app.include_router(gis.router, prefix="/api/gis", tags=["gis_direct"])

# Mount direct agents router at exact /api/agents prefix for client specifications
from app.api.v1.endpoints import agents
app.include_router(agents.router, prefix="/api/agents", tags=["agents_direct"])


# Clean up database connection pools when the FastAPI application shuts down
@app.on_event("shutdown")
def shutdown_event():
    from app.core.neo4j import neo4j_manager
    neo4j_manager.close()


