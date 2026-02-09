"""
DPIA Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from .validators import convert_empty_string_to_space


class DPIABase(BaseModel):
    """Base DPIA schema with common fields."""
    # ========== Basic Identification ==========
    title: str = Field(..., min_length=1, max_length=255, description="DPIA title")
    description: Optional[str] = Field(None, description="DPIA description")
    status: str = Field(default="draft", max_length=50, description="DPIA status (draft, in_review, approved, rejected)")
    
    # ========== Assessment Details ==========
    necessity_proportionality_assessment: Optional[str] = Field(None, description="Assessment of necessity and proportionality")
    assessor: Optional[str] = Field(None, max_length=255, description="Person who conducted the assessment")
    assessment_date: Optional[datetime] = Field(None, description="Date when assessment was completed")
    
    # ========== Consultation Requirements ==========
    dpo_consultation_required: bool = Field(default=False, description="Whether DPO consultation is required")
    dpo_consultation_date: Optional[datetime] = Field(None, description="Date when DPO was consulted")
    supervisory_authority_consultation_required: bool = Field(default=False, description="Whether supervisory authority consultation is required")
    supervisory_authority_consultation_date: Optional[datetime] = Field(None, description="Date when supervisory authority was consulted")


class DPIACreate(DPIABase):
    """Schema for creating a new DPIA."""
    processing_activity_id: UUID = Field(..., description="Activity ID this DPIA belongs to")
    # Override base class field - allow empty string, router will generate default
    title: str = Field("", max_length=255, description="DPIA title (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_title(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'title')


class DPIAUpdate(BaseModel):
    """Schema for updating a DPIA (all fields optional)."""
    # ========== Basic Identification ==========
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)
    
    # ========== Assessment Details ==========
    necessity_proportionality_assessment: Optional[str] = None
    assessor: Optional[str] = Field(None, max_length=255)
    assessment_date: Optional[datetime] = None
    
    # ========== Consultation Requirements ==========
    dpo_consultation_required: Optional[bool] = None
    dpo_consultation_date: Optional[datetime] = None
    supervisory_authority_consultation_required: Optional[bool] = None
    supervisory_authority_consultation_date: Optional[datetime] = None


class RiskBasic(BaseModel):
    """Basic risk information for DPIA responses."""
    id: UUID
    title: str
    severity: Optional[str] = None
    likelihood: Optional[str] = None

    class Config:
        from_attributes = True


class DPIAResponse(DPIABase):
    """Schema for DPIA response (includes read-only fields)."""
    id: UUID
    processing_activity_id: UUID
    risks: Optional[List[RiskBasic]] = None  # Populated when needed
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



