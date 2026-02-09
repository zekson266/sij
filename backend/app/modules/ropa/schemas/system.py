"""
System Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from .validators import convert_empty_string_to_space


class SystemBase(BaseModel):
    """Base system schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="System name")
    description: Optional[str] = Field(None, description="Optional description")
    system_type: Optional[str] = Field(None, max_length=100, description="System type (e.g., 'API', 'Database')")


class SystemCreate(SystemBase):
    """Schema for creating a new system."""
    name: str = Field("", max_length=255, description="System name (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'name')


class SystemUpdate(BaseModel):
    """Schema for updating a system (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    system_type: Optional[str] = Field(None, max_length=100)


class SystemResponse(SystemBase):
    """Schema for system response (includes read-only fields)."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
