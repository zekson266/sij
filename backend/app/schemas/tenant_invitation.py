"""
TenantInvitation Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr

from app.models.tenant_invitation import InvitationStatus


class TenantInvitationBase(BaseModel):
    """Base tenant invitation schema."""
    email: EmailStr = Field(..., description="Email address of invited user")
    role: str = Field(default="member", max_length=50, description="Role to assign when invitation is accepted")
    expires_in_days: int = Field(default=7, ge=1, le=30, description="Days until invitation expires")


class TenantInvitationCreate(TenantInvitationBase):
    """Schema for creating a tenant invitation."""
    tenant_id: UUID = Field(..., description="Tenant ID")
    invited_by: Optional[UUID] = Field(None, description="User who is sending the invitation")


class TenantInvitationUpdate(BaseModel):
    """Schema for updating a tenant invitation."""
    status: Optional[str] = Field(None, description="New invitation status")
    role: Optional[str] = Field(None, max_length=50, description="Updated role")


class TenantInvitationResponse(TenantInvitationBase):
    """Schema for tenant invitation response."""
    id: UUID
    tenant_id: UUID
    token: str
    status: str
    invited_by: Optional[UUID] = None
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models


class TenantInvitationWithTenant(TenantInvitationResponse):
    """Tenant invitation with tenant details."""
    tenant: Optional[dict] = None  # Will be populated with TenantResponse data
