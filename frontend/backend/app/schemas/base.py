from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base class for all application schemas.

    Ensures consistent serialization configurations across Pydantic models.
    """

    model_config = ConfigDict(
        from_attributes=True,      # Support loading data directly from ORM objects
        populate_by_name=True,     # Allow using field names and aliases interchangeably
        validate_assignment=True,  # Enforce validations when mutating attributes
    )


class APIResponse(BaseModel, Generic[T]):
    """Generic wrapper representing all standard JSON API responses."""

    success: bool
    data: Optional[T] = None
    error: Optional[Dict[str, Any]] = None


class PaginatedList(BaseModel, Generic[T]):
    """Generic pagination wrapper for responses containing arrays."""

    items: List[T]
    total: int
    page: int
    size: int
    pages: int
