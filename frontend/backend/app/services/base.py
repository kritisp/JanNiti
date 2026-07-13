from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from sqlalchemy.orm import Session

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseService(Generic[ModelType]):
    """Generic service abstraction implementing baseline CRUD database operations.

    Enables uniform database queries and validation behaviors.
    """

    def __init__(self, model: Type[ModelType]) -> None:
        """Initializes the service with a specific database model class."""
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Fetch a single record by its primary key ID."""
        # Using db.query for backward-compatible standard active session fetching
        return db.query(self.model).filter(getattr(self.model, "id") == id).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Fetch multiple records with offset/limit parameters."""
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: Any) -> ModelType:
        """Create a new database record from a Pydantic schema or dictionary."""
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            # Pydantic v2 dump
            obj_data = obj_in.model_dump()

        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: ModelType, obj_in: Union[Any, Dict[str, Any]]
    ) -> ModelType:
        """Update an existing database record with new attributes."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            # Dump fields that were explicitly set
            update_data = obj_in.model_dump(exclude_unset=True)

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: Any) -> Optional[ModelType]:
        """Remove a database record by its primary key ID."""
        obj = db.query(self.model).filter(getattr(self.model, "id") == id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj
