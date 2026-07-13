from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from app.core.database import get_db
from app.core.exceptions import DatabaseException
from app.core.logging import logger

router = APIRouter()


@router.get("/health", response_model=dict)
def health_check(db: Session = Depends(get_db)) -> dict:
    """Health check endpoint to verify service and database availability.

    Returns:
        A dictionary with status: "healthy" if connections are active.
    Raises:
        DatabaseException: If database connectivity cannot be established.
    """
    try:
        # Perform a light-weight query to ensure PostgreSQL connection works
        db.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.critical(
            f"Health check failed due to database connection loss: {str(e)}"
        )
        raise DatabaseException(
            message="Database connection failed",
            details={"error_message": str(e)}
        )
