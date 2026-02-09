"""
Database models package.

This package contains all SQLAlchemy models for the application.
Models are organized by domain (tenant, user, etc.).
"""

# Import core models
from app.models.tenant import Tenant
from app.models.user import User
from app.models.tenant_user import TenantUser
from app.models.tenant_invitation import TenantInvitation, InvitationStatus
from app.models.verification_token import VerificationToken
from app.models.oauth_account import OAuthAccount

# Note: Module models (like Appointment) are imported directly from their modules
# We don't import them here to avoid circular import issues
# SQLAlchemy relationships use string references that are resolved at runtime

__all__ = [
    "Tenant",
    "User",
    "TenantUser",
    "TenantInvitation",
    "InvitationStatus",
    "VerificationToken",
    "OAuthAccount",
]

