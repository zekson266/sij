"""
Activity Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from .validators import convert_empty_string_to_space
from ..enums import ProcessingFrequency


class ActivityBase(BaseModel):
    """Base activity schema with common fields."""
    # ========== Basic Identification ==========
    processing_activity_name: str = Field(..., min_length=1, max_length=255, description="Processing activity name")
    purpose: Optional[str] = Field(None, max_length=255, description="Purpose of processing")
    lawful_basis: Optional[str] = Field(None, max_length=100, description="Lawful basis for processing (e.g., 'Consent', 'Contract')")
    
    # ========== New Fields (Part 1) ==========
    legitimate_interest_assessment: Optional[str] = Field(None, description="Assessment of legitimate interests (multiline text)")
    data_subject_type: Optional[List[str]] = Field(None, description="Array of data subject types (e.g., 'Customer', 'Employee', 'Supplier')")
    collection_sources: Optional[List[UUID]] = Field(None, description="Array of department UUIDs from which data is collected (from ropa_departments table)")
    data_disclosed_to: Optional[List[UUID]] = Field(None, description="Array of department UUIDs to which data is disclosed (from ropa_departments table)")
    jit_notice: Optional[str] = Field(None, description="Just-in-time notice information (multiline text)")
    consent_process: Optional[str] = Field(None, description="Consent process description (multiline text)")
    
    # ========== New Fields (Part 2) ==========
    automated_decision: bool = Field(default=False, description="Whether automated decision-making is used")
    data_subject_rights: Optional[str] = Field(None, description="Data subject rights information (multiline text)")
    dpia_required: bool = Field(default=False, description="Whether DPIA is required")
    dpia_comment: Optional[str] = Field(None, description="DPIA comments/notes (multiline text)")
    dpia_file: Optional[str] = Field(None, max_length=500, description="DPIA file path (deferred file upload implementation)")
    dpia_gpc_link: Optional[str] = Field(None, max_length=500, description="DPIA GPC web link (URL)")
    children_data: Optional[str] = Field(None, description="Children data information (multiline text)")
    parental_consent: Optional[str] = Field(None, description="Parental consent information (multiline text)")
    
    # ========== New Fields (Part 3) ==========
    comments: Optional[List[str]] = Field(None, description="Comments (multi-choice static list)")
    data_retention_policy: Optional[str] = Field(None, max_length=500, description="Data retention policy web link (URL)")
    processing_frequency: Optional[ProcessingFrequency] = Field(None, description="Processing frequency (enum: 'Real-time', 'Daily', 'Weekly', 'Monthly', 'Ad-hoc')")
    legal_jurisdiction: Optional[List[str]] = Field(None, description="Legal jurisdiction (multi-choice static list: 'GDPR', 'PIPEDA', 'CCPA', 'HIPAA', 'LGPD', 'Other')")


class ActivityCreate(ActivityBase):
    """Schema for creating a new activity."""
    data_repository_id: UUID = Field(..., description="Repository ID this activity belongs to")
    # Override base class field - allow empty string, router will generate default
    processing_activity_name: str = Field("", max_length=255, description="Processing activity name (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'processing_activity_name')


class ActivityUpdate(BaseModel):
    """Schema for updating an activity (all fields optional)."""
    # ========== Basic Identification ==========
    processing_activity_name: Optional[str] = Field(None, min_length=1, max_length=255)
    purpose: Optional[str] = Field(None, max_length=255)
    lawful_basis: Optional[str] = Field(None, max_length=100)
    
    # ========== New Fields (Part 1) ==========
    legitimate_interest_assessment: Optional[str] = None
    data_subject_type: Optional[List[str]] = None
    collection_sources: Optional[List[UUID]] = None
    data_disclosed_to: Optional[List[UUID]] = None
    jit_notice: Optional[str] = None
    consent_process: Optional[str] = None
    
    # ========== New Fields (Part 2) ==========
    automated_decision: Optional[bool] = None
    data_subject_rights: Optional[str] = None
    dpia_required: Optional[bool] = None
    dpia_comment: Optional[str] = None
    dpia_file: Optional[str] = Field(None, max_length=500)
    dpia_gpc_link: Optional[str] = Field(None, max_length=500)
    children_data: Optional[str] = None
    parental_consent: Optional[str] = None
    
    # ========== New Fields (Part 3) ==========
    comments: Optional[List[str]] = None
    data_retention_policy: Optional[str] = Field(None, max_length=500)
    processing_frequency: Optional[ProcessingFrequency] = None
    legal_jurisdiction: Optional[List[str]] = None


class DataElementBasic(BaseModel):
    """Basic data element information."""
    id: UUID
    category: Optional[str] = None

    class Config:
        from_attributes = True


class DPIABasic(BaseModel):
    """Basic DPIA information."""
    id: UUID
    title: str
    status: str

    class Config:
        from_attributes = True


class ActivityResponse(ActivityBase):
    """Schema for activity response (includes read-only fields)."""
    id: UUID
    data_repository_id: UUID
    data_elements: Optional[List[DataElementBasic]] = None  # Populated when needed
    dpias: Optional[List[DPIABasic]] = None  # Populated when needed
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



