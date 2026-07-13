from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema


class LocationSchema(BaseModel):
    """Sub-schema representing geolocated coordinates mapping blocks."""

    village: str = Field(..., description="Name of the resolved village")
    district: str = Field(..., description="Name of the resolved district")
    state: str = Field(..., description="Name of the resolved state")


class AIStructuredOutput(BaseModel):
    """Schema representing the expected structure returned from the Gemini AI processing pipeline."""

    original_text: str = Field(..., description="Original input text description")
    translated_text: str = Field(..., description="Input translated to English")
    language: str = Field(..., description="Language identified from the input")
    category: str = Field(..., description="Classified category index matching categories catalog")
    issue: str = Field(..., description="Core extracted issue description")
    infrastructure_type: str = Field(..., description="Type of infrastructure impacted")
    urgency: str = Field(..., description="Classified urgency level (Low, Medium, High, Critical)")
    sentiment: str = Field(..., description="Classified sentiment status")
    location: LocationSchema = Field(..., description="Geographical resolution details")
    keywords: List[str] = Field(default_factory=list, description="Array of extracted keyword tags")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence level of pipeline output")
    affected_population: Optional[int] = Field(None, description="Estimated citizen count impacted")


class CitizenRequestCreate(BaseModel):
    """Validation schema for incoming citizen request metadata."""

    citizen_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    village: str = Field(..., min_length=2, max_length=100)
    ward: Optional[str] = Field(None, max_length=50)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pin_code: str = Field(..., min_length=6, max_length=10)
    submitted_category: str = Field(..., min_length=2, max_length=50)
    description: str = Field(..., min_length=5, max_length=2000)
    language: Optional[str] = Field("Auto Detect", max_length=50)


class CitizenRequestResponse(BaseSchema):
    """Serialization schema returning full database details of a citizen request."""

    id: int
    created_at: datetime
    updated_at: datetime

    # Raw Inputs
    citizen_name: Optional[str]
    phone: Optional[str]
    village: str
    ward: Optional[str]
    district: str
    state: str
    pin_code: str
    submitted_category: str
    description: str
    voice_url: Optional[str]
    image_urls: Optional[List[str]]

    # AI Pipeline Outputs
    processed: bool
    original_text: Optional[str]
    translated_text: Optional[str]
    detected_language: Optional[str]
    ai_category: Optional[str]
    extracted_issue: Optional[str]
    infrastructure_type: Optional[str]
    urgency: Optional[str]
    sentiment: Optional[str]
    resolved_village: Optional[str]
    resolved_district: Optional[str]
    resolved_state: Optional[str]
    keywords: Optional[List[str]]
    confidence: Optional[float]
    affected_population: Optional[int]

    # Duplicate Flags
    is_duplicate: bool
    duplicate_of_id: Optional[int]
