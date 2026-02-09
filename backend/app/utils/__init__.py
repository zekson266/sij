"""
Utilities package.

Contains helper functions and utilities for the application.
"""

from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token, decode_token
from app.utils.email import send_email, send_verification_email, send_password_reset_email
from app.utils.rbac import (
    Role,
    Permission,
    has_role_or_higher,
    has_permission,
    has_any_permission,
    has_all_permissions,
    get_user_permissions,
    can_manage_role,
    validate_role,
)
from app.utils.access_control import (
    AccessMode,
    get_feature_access_mode,
    can_access_feature,
    get_all_feature_access_modes,
    get_default_access_mode,
    DEFAULT_ACCESS_MODE,
)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    "send_email",
    "send_verification_email",
    "send_password_reset_email",
    "Role",
    "Permission",
    "has_role_or_higher",
    "has_permission",
    "has_any_permission",
    "has_all_permissions",
    "get_user_permissions",
    "can_manage_role",
    "validate_role",
    "AccessMode",
    "get_feature_access_mode",
    "can_access_feature",
    "get_all_feature_access_modes",
    "get_default_access_mode",
    "DEFAULT_ACCESS_MODE",
]

