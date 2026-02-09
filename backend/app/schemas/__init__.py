"""
Pydantic schemas package.

This package contains all Pydantic schemas for request/response validation.
Schemas are organized by domain (tenant, user, auth, etc.).
"""

# Import common schemas
from app.schemas.common import ErrorDetail, ErrorResponse, HealthResponse, SuccessResponse

# Import domain schemas
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.tenant_user import TenantUserCreate, TenantUserUpdate, TenantUserResponse
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

# Note: Module schemas (like Appointment) are imported directly from their modules
# Example: from app.modules.booker.schemas.appointment import AppointmentCreate
# This avoids circular imports during application startup

__all__ = [
    # Common
    "ErrorDetail",
    "ErrorResponse",
    "HealthResponse",
    "SuccessResponse",
    # Tenant
    "TenantCreate",
    "TenantUpdate",
    "TenantResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    # TenantUser
    "TenantUserCreate",
    "TenantUserUpdate",
    "TenantUserResponse",
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
]

