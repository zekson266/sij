"""
Risk Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from .validators import convert_empty_string_to_space


class RiskBase(BaseModel):
    """Base risk schema with common fields."""
    # ========== Basic Identification ==========
    title: str = Field(..., min_length=1, max_length=255, description="Risk title")
    description: Optional[str] = Field(None, description="Risk description")
    
    # ========== Risk Assessment ==========
    severity: Optional[str] = Field(None, max_length=50, description="Inherent risk severity (low, medium, high, critical)")
    likelihood: Optional[str] = Field(None, max_length=50, description="Inherent risk likelihood (low, medium, high)")
    residual_severity: Optional[str] = Field(None, max_length=50, description="Residual severity after mitigation")
    residual_likelihood: Optional[str] = Field(None, max_length=50, description="Residual likelihood after mitigation")
    
    # ========== Risk Management ==========
    mitigation: Optional[str] = Field(None, description="Mitigation measures")
    risk_owner: Optional[str] = Field(None, max_length=255, description="Person responsible for managing the risk")
    risk_status: Optional[str] = Field(None, max_length=50, description="Risk status (open, mitigated, accepted, closed)")


class RiskCreate(RiskBase):
    """Schema for creating a new risk."""
    dpia_id: UUID = Field(..., description="DPIA ID this risk belongs to")
    # Override base class field - allow empty string, router will generate default
    title: str = Field("", max_length=255, description="Risk title (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_title(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'title')


class RiskUpdate(BaseModel):
    """Schema for updating a risk (all fields optional)."""
    # ========== Basic Identification ==========
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    
    # ========== Risk Assessment ==========
    severity: Optional[str] = Field(None, max_length=50)
    likelihood: Optional[str] = Field(None, max_length=50)
    residual_severity: Optional[str] = Field(None, max_length=50)
    residual_likelihood: Optional[str] = Field(None, max_length=50)
    
    # ========== Risk Management ==========
    mitigation: Optional[str] = None
    risk_owner: Optional[str] = Field(None, max_length=255)
    risk_status: Optional[str] = Field(None, max_length=50)


class RiskResponse(RiskBase):
    """Schema for risk response (includes read-only fields)."""
    id: UUID
    dpia_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



