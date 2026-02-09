"""
Location Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.modules.ropa.enums import LocationType
from .validators import convert_empty_string_to_space


class LocationBase(BaseModel):
    """Base location schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Location name")
    type: LocationType = Field(..., description="Location type (region or country)")
    country_code: Optional[str] = Field(None, max_length=10, description="ISO country code (countries only)")
    region: Optional[str] = Field(None, max_length=100, description="Region label (e.g., 'EU', 'APAC')")
    parent_id: Optional[UUID] = Field(None, description="Parent location ID (e.g., country -> region)")


class LocationCreate(LocationBase):
    """Schema for creating a new location."""
    name: str = Field("", max_length=255, description="Location name (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'name')


class LocationUpdate(BaseModel):
    """Schema for updating a location (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[LocationType] = None
    country_code: Optional[str] = Field(None, max_length=10)
    region: Optional[str] = Field(None, max_length=100)
    parent_id: Optional[UUID] = None


class LocationResponse(LocationBase):
    """Schema for location response (includes read-only fields)."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
