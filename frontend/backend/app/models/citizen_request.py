from typing import List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CitizenRequest(Base, TimestampMixin):
    """SQLAlchemy model representing unstructured citizen inputs and their AI-structured outputs."""

    __tablename__ = "citizen_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # 1. Raw Ingestion Fields (Metadata + Inputs)
    citizen_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    village: Mapped[str] = mapped_column(String(100), nullable=False)
    ward: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(10), nullable=False)
    submitted_category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    
    # File Paths relative to application upload directory
    voice_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_urls: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    # 2. AI Processing Pipeline Outcomes
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    original_text: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    translated_text: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    detected_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    extracted_issue: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    infrastructure_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    urgency: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Geographical Resolution
    resolved_village: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resolved_district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resolved_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Meta Entities
    keywords: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    affected_population: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # 3. Duplication Ingestion Analytics
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("citizen_requests.id"), nullable=True
    )

    # Self-referential join to trace the origin request
    duplicate_of = relationship(
        "CitizenRequest", remote_side=[id], backref="linked_duplicates"
    )
