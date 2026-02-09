"""
Data Element Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class DataElementBase(BaseModel):
    """Base data element schema with common fields."""
    # ========== Basic Identification ==========
    category: Optional[str] = Field(None, max_length=100, description="Data category (e.g., 'Contact data', 'Identity data')")
    
    # ========== Data Elements ==========
    data_elements: Optional[List[str]] = Field(None, description="Array of data element types (e.g., 'Name', 'Email', 'Phone', 'Address')")
    special_lawful_basis: Optional[List[str]] = Field(None, description="Special lawful basis (e.g., 'Explicit Consent', 'Employment Obligations', 'Vital Interests')")
    secondary_use: bool = Field(default=False, description="Whether data is used for secondary purposes")
    encryption_in_transit: bool = Field(default=False, description="Whether data is encrypted in transit")
    safeguards: Optional[str] = Field(None, description="Safeguards applied to data (multiline text)")
    retention_period_days: Optional[int] = Field(None, description="Data retention period in days")
    disposition_method: Optional[str] = Field(None, description="Method of data disposition (multiline text)")
    comments: Optional[List[str]] = Field(None, description="Comments (multi-choice static list)")
    data_minimization_justification: Optional[str] = Field(None, description="Justification for data minimization (multiline text)")
    data_accuracy_requirements: Optional[str] = Field(None, description="Data accuracy requirements (multiline text)")
    data_storage_location: Optional[List[str]] = Field(None, description="Data storage location (e.g., 'On-premise', 'Cloud', 'Hybrid', 'Local Device')")


class DataElementCreate(DataElementBase):
    """Schema for creating a new data element."""
    processing_activity_id: UUID = Field(..., description="Activity ID this data element belongs to")


class DataElementUpdate(BaseModel):
    """Schema for updating a data element (all fields optional)."""
    # ========== Basic Identification ==========
    category: Optional[str] = Field(None, max_length=100)
    
    # ========== Data Elements ==========
    data_elements: Optional[List[str]] = None
    special_lawful_basis: Optional[List[str]] = None
    secondary_use: Optional[bool] = None
    encryption_in_transit: Optional[bool] = None
    safeguards: Optional[str] = None
    retention_period_days: Optional[int] = None
    disposition_method: Optional[str] = None
    comments: Optional[List[str]] = None
    data_minimization_justification: Optional[str] = None
    data_accuracy_requirements: Optional[str] = None
    data_storage_location: Optional[List[str]] = None


class DataElementResponse(DataElementBase):
    """Schema for data element response (includes read-only fields)."""
    id: UUID
    processing_activity_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



