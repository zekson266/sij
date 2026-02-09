"""
Services package.

Contains business logic and data access layer for the application.
Services handle database operations and business rules.
"""

# TenantService imported lazily to avoid circular imports
# Use: from app.services.tenant import TenantService
from app.services.tenant_user import TenantUserService
from app.services.user import UserService

# Note: Module services (like AppointmentService) are imported directly from their modules
# Example: from app.modules.booker.services.appointment import AppointmentService
# This avoids circular imports during application startup

__all__ = [
    "TenantService",
    "TenantUserService",
    "UserService",
]

