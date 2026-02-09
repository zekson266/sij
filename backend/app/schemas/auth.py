"""
Authentication Pydantic schemas for request/response validation.
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    """Schema for user registration request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")


class LoginRequest(BaseModel):
    """Schema for user login request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User information")
    tenant_id: Optional[UUID] = Field(None, description="Current tenant ID (if user is in tenant context)")
    role: Optional[str] = Field(None, description="User role in current tenant")


class TokenData(BaseModel):
    """Schema for decoded JWT token data."""
    user_id: UUID
    email: str
    tenant_id: Optional[UUID] = None
    role: Optional[str] = None
    type: str = "user"  # "user" or "tenant_user"


class VerifyEmailRequest(BaseModel):
    """Schema for email verification request."""
    token: str = Field(..., description="Email verification token")


class ResendVerificationRequest(BaseModel):
    """Schema for resending email verification."""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset."""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password (min 8 characters)")

