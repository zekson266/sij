"""
User Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User email address (globally unique)")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    avatar_url: Optional[str] = Field(None, max_length=500, description="Avatar image URL")
    user_metadata: Optional[Dict[str, Any]] = Field(None, description="Flexible user-specific data")


class UserCreate(UserBase):
    """Schema for creating a new user (registration)."""
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 characters)")


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional)."""
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100, description="User password (min 8 characters)")
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    user_metadata: Optional[Dict[str, Any]] = None


class UserResponse(UserBase):
    """Schema for user response (excludes sensitive fields)."""
    id: UUID
    is_active: bool
    is_email_verified: bool
    is_superuser: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models


class UserPublic(UserBase):
    """Public user schema (minimal information for public display)."""
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True

