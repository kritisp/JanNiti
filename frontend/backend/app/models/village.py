from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Village(Base, TimestampMixin):
    """Represents a regional village including geocodes, demographics, and development indices."""

    __tablename__ = "villages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    ward: Mapped[str] = mapped_column(String, nullable=True)
    district: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Demographics and baseline services ratings
    population: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    road_quality: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)  # 0.0 to 1.0 (1.0 = paved)
    water_access: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)  # 0.0 to 1.0 (1.0 = clean grid)
    electricity_access: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)  # 0.0 to 1.0 (1.0 = stable grid)
    
    school_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    hospital_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Derived Gap Scores (higher means greater deficit)
    gap_score_road: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gap_score_water: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gap_score_school: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gap_score_hospital: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gap_score_electricity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Decisional composites
    priority_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)    # 0.0 to 1.0 (1.0 = critical need)
    development_index: Mapped[float] = mapped_column(Float, default=0.5, nullable=False) # 0.0 to 1.0 (1.0 = highly developed)
