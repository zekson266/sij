"""
OAuth Pydantic schemas for request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class OAuthProvider(str, Enum):
    """Supported OAuth providers."""
    GOOGLE = "google"
    APPLE = "apple"


class OAuthAccountBase(BaseModel):
    """Base OAuth account schema."""
    provider: OAuthProvider
    provider_user_id: str = Field(..., description="User ID from OAuth provider")
    provider_email: Optional[str] = Field(None, description="Email from OAuth provider")


class OAuthAccountCreate(OAuthAccountBase):
    """Schema for creating a new OAuth account link."""
    user_id: UUID
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class OAuthAccountResponse(OAuthAccountBase):
    """Schema for OAuth account response."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GoogleOAuthRequest(BaseModel):
    """Schema for Google OAuth login/register request."""
    credential: str = Field(..., description="Google OAuth credential (JWT token)")


class GoogleOAuthCallback(BaseModel):
    """Schema for Google OAuth callback."""
    code: str = Field(..., description="Authorization code from Google")
    state: Optional[str] = Field(None, description="State parameter for CSRF protection")
