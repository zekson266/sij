"""
Repository Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator
from app.modules.ropa.enums import (
    RepositoryStatus,
    DataFormat,
    TransferMechanism,
    DerogationType,
    CrossBorderSafeguards,
    Certification,
    InterfaceType,
)


class RepositoryBase(BaseModel):
    """Base repository schema with common fields."""
    # ========== Basic Identification ==========
    data_repository_name: str = Field(..., min_length=1, max_length=255, description="Repository name")
    data_repository_description: Optional[str] = Field(None, description="Optional description")
    external_vendor: Optional[str] = Field(None, max_length=255, description="External vendor or provider name (e.g., 'AWS', 'PostgreSQL', 'Microsoft Azure')")
    business_owner: Optional[UUID] = Field(None, description="Business owner department (FK to ropa_departments)")
    data_format: Optional[DataFormat] = Field(None, description="Format of stored data (optional)")
    
    # ========== Geographic & Location ==========
    geographical_location_ids: Optional[List[UUID]] = Field(
        None,
        description="Geographic regions (UUID array from ropa_locations, type=region)"
    )
    access_location_ids: Optional[List[UUID]] = Field(
        None,
        description="Access locations (UUID array from ropa_locations, type=country)"
    )
    
    # ========== Cross-Border Transfers ==========
    transfer_mechanism: Optional[TransferMechanism] = Field(None, description="Legal mechanism for cross-border data transfers")
    derogation_type: Optional[DerogationType] = Field(None, description="Type of derogation for cross-border transfers")
    cross_border_safeguards: Optional[CrossBorderSafeguards] = Field(None, description="Security safeguards for cross-border transfers")
    cross_border_transfer_detail: Optional[str] = Field(None, max_length=255, description="Details about cross-border transfers")
    
    # ========== Compliance & Certification ==========
    gdpr_compliant: bool = Field(default=False, description="Whether repository is GDPR compliant")
    dpa_url: Optional[str] = Field(None, max_length=500, description="Data Processing Agreement URL")
    dpa_file: Optional[str] = Field(None, max_length=500, description="DPA file path (deferred implementation)")
    vendor_gdpr_compliance: Optional[bool] = Field(None, description="Whether vendor is GDPR compliant")
    certification: Optional[Certification] = Field(None, description="Security or privacy certification")
    
    # ========== Data & Records ==========
    record_count: Optional[int] = Field(None, ge=0, description="Number of records (must be >= 0)")
    
    # ========== System Interfaces ==========
    system_interfaces: Optional[List[UUID]] = Field(None, description="System interfaces (UUID array from ropa_systems table)")
    interface_type: Optional[InterfaceType] = Field(None, description="Nature of interfaced system")
    interface_location_ids: Optional[List[UUID]] = Field(
        None,
        description="Interface regions (UUID array from ropa_locations, type=region)"
    )
    
    # ========== Data Recipients ==========
    data_recipients: Optional[str] = Field(None, max_length=255, description="Data recipients")
    sub_processors: Optional[str] = Field(None, max_length=255, description="Sub-processors")
    
    # ========== Operational Status ==========
    status: RepositoryStatus = Field(
        default=RepositoryStatus.ACTIVE,
        description="Current operational status",
        json_schema_extra={
            "examples": ["active", "archived", "decommissioned"],
            "aiHints": "Most repositories should be 'active'. Use 'archived' for repositories no longer in use."
        }
    )
    
    # ========== Additional Metadata ==========
    comments: Optional[List[str]] = Field(None, description="Comments (merged from tags and notes)")
    
    @field_validator("external_vendor", mode="before")
    @classmethod
    def validate_external_vendor(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize external vendor name."""
        if v:
            v_normalized = v.strip()
            return v_normalized
        return v
    
    @field_validator("dpa_url", mode="before")
    @classmethod
    def validate_dpa_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate DPA URL format (basic validation).
        
        Allows existing text descriptions for backward compatibility.
        Only validates URL format if value starts with http:// or https://.
        """
        if v and v.strip():
            v_stripped = v.strip()
            # If it looks like a URL, ensure it's valid
            # Otherwise, allow it (could be existing text description)
            if v_stripped.startswith("http://") or v_stripped.startswith("https://"):
                return v_stripped
            # Allow non-URL values for backward compatibility with existing data
            return v_stripped
        return v


class RepositoryCreate(RepositoryBase):
    """Schema for creating a new repository."""
    # Allow empty name - backend will generate default name if empty
    data_repository_name: str = Field("", max_length=255, description="Repository name (empty for default)")


class RepositoryUpdate(BaseModel):
    """Schema for updating a repository (all fields optional)."""
    # ========== Basic Identification ==========
    data_repository_name: Optional[str] = Field(None, min_length=1, max_length=255)
    data_repository_description: Optional[str] = None
    external_vendor: Optional[str] = Field(None, max_length=255)
    business_owner: Optional[UUID] = None
    data_format: Optional[DataFormat] = None
    
    # ========== Geographic & Location ==========
    geographical_location_ids: Optional[List[UUID]] = None
    access_location_ids: Optional[List[UUID]] = None
    
    # ========== Cross-Border Transfers ==========
    transfer_mechanism: Optional[TransferMechanism] = None
    derogation_type: Optional[DerogationType] = None
    cross_border_safeguards: Optional[CrossBorderSafeguards] = None
    cross_border_transfer_detail: Optional[str] = Field(None, max_length=255)
    
    # ========== Compliance & Certification ==========
    gdpr_compliant: Optional[bool] = None
    dpa_url: Optional[str] = Field(None, max_length=500)
    dpa_file: Optional[str] = Field(None, max_length=500)
    vendor_gdpr_compliance: Optional[bool] = None
    certification: Optional[Certification] = None
    
    # ========== Data & Records ==========
    record_count: Optional[int] = Field(None, ge=0)
    
    # ========== System Interfaces ==========
    system_interfaces: Optional[List[UUID]] = None
    interface_type: Optional[InterfaceType] = None
    interface_location_ids: Optional[List[UUID]] = None
    
    # ========== Data Recipients ==========
    data_recipients: Optional[str] = Field(None, max_length=255)
    sub_processors: Optional[str] = Field(None, max_length=255)
    
    # ========== Operational Status ==========
    status: Optional[RepositoryStatus] = None
    
    # ========== Additional Metadata ==========
    comments: Optional[List[str]] = None
    
    @field_validator("external_vendor", mode="before")
    @classmethod
    def validate_external_vendor(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize external vendor name."""
        if v:
            return v.strip()
        return v
    
    @field_validator("dpa_url", mode="before")
    @classmethod
    def validate_dpa_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate DPA URL format (basic validation).
        
        Allows existing text descriptions for backward compatibility.
        Only validates URL format if value starts with http:// or https://.
        """
        if v and v.strip():
            v_stripped = v.strip()
            # If it looks like a URL, ensure it's valid
            # Otherwise, allow it (could be existing text description)
            if v_stripped.startswith("http://") or v_stripped.startswith("https://"):
                return v_stripped
            # Allow non-URL values for backward compatibility with existing data
            return v_stripped
        return v


class ActivityBasic(BaseModel):
    """Basic activity information for repository responses."""
    id: UUID
    processing_activity_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RepositoryResponse(RepositoryBase):
    """Schema for repository response (includes read-only fields)."""
    id: UUID
    tenant_id: UUID
    activities: Optional[List[ActivityBasic]] = None  # Populated when needed
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

