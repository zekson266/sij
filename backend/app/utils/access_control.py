"""
Access Control utilities.

Provides feature-specific access control based on tenant settings.
This module implements a flexible access control system that supports:
- Feature-specific access modes (members_only, authenticated_only, public)
- Default access mode with feature overrides
- Extensible for future features (booking, events, resources, etc.)
"""

from typing import Optional
from enum import Enum

from app.models.tenant import Tenant
from app.models.user import User


class AccessMode(str, Enum):
    """
    Access modes for tenant features.
    
    These modes control who can access tenant features:
    - members_only: Only registered members of the tenant
    - authenticated_only: Any authenticated user in the app
    - public: Anyone (no authentication required)
    """
    MEMBERS_ONLY = "members_only"
    AUTHENTICATED_ONLY = "authenticated_only"
    PUBLIC = "public"


# Default access mode if not specified
DEFAULT_ACCESS_MODE = AccessMode.AUTHENTICATED_ONLY


def get_feature_access_mode(
    tenant: Tenant,
    feature: str,
) -> AccessMode:
    """
    Get the access mode for a specific feature.
    
    Checks feature-specific settings first, then falls back to default mode.
    
    Args:
        tenant: Tenant instance
        feature: Feature name (e.g., "booking", "events", "resources")
        
    Returns:
        AccessMode enum value
    """
    if not tenant.settings:
        return DEFAULT_ACCESS_MODE
    
    # Check for feature-specific access control structure
    access_control = tenant.settings.get("access_control", {})
    
    # First, check if feature has specific setting
    features = access_control.get("features", {})
    if feature in features:
        feature_mode = features[feature]
        try:
            return AccessMode(feature_mode)
        except ValueError:
            # Invalid mode, fall back to default
            return DEFAULT_ACCESS_MODE
    
    # Fall back to default_mode if specified
    default_mode = access_control.get("default_mode")
    if default_mode:
        try:
            return AccessMode(default_mode)
        except ValueError:
            return DEFAULT_ACCESS_MODE
    
    # Legacy support: check for old "public_access_mode" setting
    legacy_mode = tenant.settings.get("public_access_mode")
    if legacy_mode:
        try:
            return AccessMode(legacy_mode)
        except ValueError:
            return DEFAULT_ACCESS_MODE
    
    return DEFAULT_ACCESS_MODE


def can_access_feature(
    tenant: Tenant,
    feature: str,
    current_user: Optional[User],
    is_member: bool,
) -> bool:
    """
    Check if a user can access a specific tenant feature.
    
    This is the main function to use for access control checks.
    It evaluates the access mode and user state to determine access.
    
    Args:
        tenant: Tenant instance
        feature: Feature name (e.g., "booking", "events", "resources")
        current_user: Current authenticated user (None if not authenticated)
        is_member: Whether the user is a member of the tenant
        
    Returns:
        True if user can access the feature, False otherwise
    """
    access_mode = get_feature_access_mode(tenant, feature)
    
    if access_mode == AccessMode.MEMBERS_ONLY:
        return is_member
    elif access_mode == AccessMode.AUTHENTICATED_ONLY:
        return current_user is not None
    elif access_mode == AccessMode.PUBLIC:
        return True
    
    return False


def get_all_feature_access_modes(tenant: Tenant) -> dict[str, AccessMode]:
    """
    Get access modes for all configured features.
    
    Useful for displaying current settings in UI.
    
    Args:
        tenant: Tenant instance
        
    Returns:
        Dictionary mapping feature names to AccessMode values
    """
    if not tenant.settings:
        return {}
    
    access_control = tenant.settings.get("access_control", {})
    features = access_control.get("features", {})
    
    result = {}
    for feature, mode_str in features.items():
        try:
            result[feature] = AccessMode(mode_str)
        except ValueError:
            # Skip invalid modes
            continue
    
    return result


def get_default_access_mode(tenant: Tenant) -> AccessMode:
    """
    Get the default access mode for a tenant.
    
    Args:
        tenant: Tenant instance
        
    Returns:
        Default AccessMode for the tenant
    """
    if not tenant.settings:
        return DEFAULT_ACCESS_MODE
    
    access_control = tenant.settings.get("access_control", {})
    default_mode = access_control.get("default_mode")
    
    if default_mode:
        try:
            return AccessMode(default_mode)
        except ValueError:
            return DEFAULT_ACCESS_MODE
    
    # Legacy support
    legacy_mode = tenant.settings.get("public_access_mode")
    if legacy_mode:
        try:
            return AccessMode(legacy_mode)
        except ValueError:
            return DEFAULT_ACCESS_MODE
    
    return DEFAULT_ACCESS_MODE

























