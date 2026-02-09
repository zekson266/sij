"""
TenantUser Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field


class TenantUserBase(BaseModel):
    """Base tenant-user relationship schema."""
    role: str = Field(default="member", max_length=50, description="User role in tenant")
    is_active: bool = Field(default=True, description="Whether relationship is active")
    permissions: Optional[Dict[str, Any]] = Field(None, description="Role-specific permissions")


class TenantUserCreate(TenantUserBase):
    """Schema for creating a tenant-user relationship (inviting user)."""
    tenant_id: UUID = Field(..., description="Tenant ID")
    user_id: UUID = Field(..., description="User ID")
    invited_by: Optional[UUID] = Field(None, description="User who is sending the invitation")


class TenantUserUpdate(BaseModel):
    """Schema for updating a tenant-user relationship."""
    role: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    permissions: Optional[Dict[str, Any]] = None


class TenantUserResponse(TenantUserBase):
    """Schema for tenant-user relationship response."""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    invited_by: Optional[UUID] = None
    invited_at: Optional[datetime] = None
    joined_at: datetime
    created_at: datetime
    updated_at: datetime
    effective_permissions: Optional[List[str]] = Field(
        None,
        description="Effective permissions derived from role and custom permissions",
    )
    
    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models


class TenantUserWithUser(TenantUserResponse):
    """Tenant-user relationship with user details."""
    user: Optional[Dict[str, Any]] = None  # Will be populated with UserResponse data


class TenantUserWithTenant(TenantUserResponse):
    """Tenant-user relationship with tenant details."""
    tenant: Optional[Dict[str, Any]] = None  # Will be populated with TenantResponse data

