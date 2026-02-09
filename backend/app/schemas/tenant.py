"""
Tenant Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class TenantBase(BaseModel):
    """Base tenant schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")
    slug: Optional[str] = Field(None, max_length=255, description="URL-friendly identifier (auto-generated if not provided)")
    domain: Optional[str] = Field(None, max_length=255, description="Custom domain")
    email: EmailStr = Field(..., description="Contact email")
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone")
    subscription_tier: str = Field(default="free", max_length=50, description="Subscription tier")
    tenant_metadata: Optional[Dict[str, Any]] = Field(None, description="Flexible tenant-specific data")
    settings: Optional[Dict[str, Any]] = Field(None, description="Tenant configuration")
    
    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize slug format."""
        if v:
            # Convert to lowercase, replace spaces with hyphens, remove special chars
            v = v.lower().strip().replace(" ", "-")
            # Remove any non-alphanumeric characters except hyphens
            import re
            v = re.sub(r'[^a-z0-9-]', '', v)
            # Remove multiple consecutive hyphens
            v = re.sub(r'-+', '-', v)
            # Remove leading/trailing hyphens
            v = v.strip('-')
        return v
    
    @field_validator("settings")
    @classmethod
    def validate_settings(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Validate settings structure, especially access_control."""
        if not v:
            return v
        
        # Lazy import to avoid circular dependency
        from app.utils.access_control import AccessMode
        
        # Validate access_control structure if present
        access_control = v.get("access_control")
        if access_control:
            if not isinstance(access_control, dict):
                raise ValueError("access_control must be a dictionary")
            
            # Validate default_mode if present
            default_mode = access_control.get("default_mode")
            if default_mode:
                try:
                    AccessMode(default_mode)
                except ValueError:
                    valid_modes = [mode.value for mode in AccessMode]
                    raise ValueError(
                        f"Invalid default_mode: {default_mode}. "
                        f"Must be one of: {', '.join(valid_modes)}"
                    )
            
            # Validate features if present
            features = access_control.get("features")
            if features:
                if not isinstance(features, dict):
                    raise ValueError("access_control.features must be a dictionary")
                
                valid_modes = [mode.value for mode in AccessMode]
                for feature, mode in features.items():
                    if not isinstance(feature, str):
                        raise ValueError("Feature names must be strings")
                    try:
                        AccessMode(mode)
                    except ValueError:
                        raise ValueError(
                            f"Invalid access mode for feature '{feature}': {mode}. "
                            f"Must be one of: {', '.join(valid_modes)}"
                        )
        
        # Legacy support: validate public_access_mode if present
        legacy_mode = v.get("public_access_mode")
        if legacy_mode:
            try:
                AccessMode(legacy_mode)
            except ValueError:
                valid_modes = [mode.value for mode in AccessMode]
                raise ValueError(
                    f"Invalid public_access_mode: {legacy_mode}. "
                    f"Must be one of: {', '.join(valid_modes)}"
                )
        
        return v


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating a tenant (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    subscription_tier: Optional[str] = Field(None, max_length=50)
    tenant_metadata: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    
    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize slug format."""
        if v:
            import re
            v = v.lower().strip().replace(" ", "-")
            v = re.sub(r'[^a-z0-9-]', '', v)
            v = re.sub(r'-+', '-', v)
            v = v.strip('-')
        return v


class TenantResponse(TenantBase):
    """Schema for tenant response (includes read-only fields)."""
    id: UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models


class TenantPublicResponse(BaseModel):
    """Schema for public tenant information (works with or without auth)."""
    # Public fields (always included)
    id: UUID
    name: str
    slug: str
    email: Optional[EmailStr] = None  # May be hidden for privacy
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    subscription_tier: str
    
    # Optional fields based on auth state
    user_role: Optional[str] = Field(None, description="User's role in tenant (if authenticated member)")
    is_member: bool = Field(False, description="Whether authenticated user is a member")
    can_book: bool = Field(False, description="Whether user can book (if authenticated)")
    
    # Additional metadata (may be filtered based on auth)
    tenant_metadata: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = Field(None, description="Tenant settings (includes booking configuration)")
    
    class Config:
        from_attributes = True

