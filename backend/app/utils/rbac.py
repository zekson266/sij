"""
Role-Based Access Control (RBAC) utilities.

Provides role hierarchy, permission checking, and authorization helpers.
This module implements a flexible RBAC system that supports:
- Role hierarchy (owner > admin > editor > member > viewer)
- Permission-based access control
- Custom permissions per tenant-user relationship
"""

from typing import Optional, List, Set
from enum import Enum

from app.models.tenant_user import TenantUser


class Role(str, Enum):
    """
    Standard roles in the system.
    
    Role hierarchy (from highest to lowest):
    - owner: Full control, can manage everything including other owners
    - admin: Can manage members, settings, and most resources
    - editor: Can manage module content but not tenant settings or members
    - member: Standard user with limited access
    - viewer: Read-only access
    """
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    MEMBER = "member"
    VIEWER = "viewer"


# Role hierarchy: higher index = higher privilege
ROLE_HIERARCHY: List[str] = [
    Role.VIEWER.value,  # 0 - lowest
    Role.MEMBER.value,  # 1
    Role.EDITOR.value,  # 2
    Role.ADMIN.value,   # 3
    Role.OWNER.value,   # 4 - highest
]


# Standard permissions that can be assigned to roles
class Permission(str, Enum):
    """
    Standard permissions in the system.
    
    These permissions can be checked independently of roles,
    allowing fine-grained access control.
    """
    # Tenant management
    TENANT_READ = "tenant:read"
    TENANT_WRITE = "tenant:write"
    TENANT_DELETE = "tenant:delete"
    TENANT_SETTINGS = "tenant:settings"
    
    # Member management
    MEMBER_INVITE = "member:invite"
    MEMBER_READ = "member:read"
    MEMBER_UPDATE = "member:update"
    MEMBER_REMOVE = "member:remove"
    
    # Resource management (generic, can be extended)
    RESOURCE_READ = "resource:read"
    RESOURCE_WRITE = "resource:write"
    RESOURCE_DELETE = "resource:delete"
    
    # Booking-specific
    BOOKING_CREATE = "booking:create"
    BOOKING_READ = "booking:read"
    BOOKING_UPDATE = "booking:update"
    BOOKING_DELETE = "booking:delete"
    BOOKING_CANCEL = "booking:cancel"
    
    # ROPA-specific
    ROPA_READ = "ropa:read"
    ROPA_CREATE = "ropa:create"
    ROPA_UPDATE = "ropa:update"
    ROPA_DELETE = "ropa:delete"


# Default permissions per role
ROLE_PERMISSIONS: dict[str, Set[str]] = {
    Role.OWNER.value: {
        # Owners have all permissions
        Permission.TENANT_READ.value,
        Permission.TENANT_WRITE.value,
        Permission.TENANT_DELETE.value,
        Permission.TENANT_SETTINGS.value,
        Permission.MEMBER_INVITE.value,
        Permission.MEMBER_READ.value,
        Permission.MEMBER_UPDATE.value,
        Permission.MEMBER_REMOVE.value,
        Permission.RESOURCE_READ.value,
        Permission.RESOURCE_WRITE.value,
        Permission.RESOURCE_DELETE.value,
        Permission.BOOKING_CREATE.value,
        Permission.BOOKING_READ.value,
        Permission.BOOKING_UPDATE.value,
        Permission.BOOKING_DELETE.value,
        Permission.BOOKING_CANCEL.value,
        Permission.ROPA_READ.value,
        Permission.ROPA_CREATE.value,
        Permission.ROPA_UPDATE.value,
        Permission.ROPA_DELETE.value,
    },
    Role.ADMIN.value: {
        Permission.TENANT_READ.value,
        Permission.TENANT_WRITE.value,
        Permission.TENANT_SETTINGS.value,
        Permission.MEMBER_INVITE.value,
        Permission.MEMBER_READ.value,
        Permission.MEMBER_UPDATE.value,
        Permission.MEMBER_REMOVE.value,
        Permission.RESOURCE_READ.value,
        Permission.RESOURCE_WRITE.value,
        Permission.RESOURCE_DELETE.value,
        Permission.BOOKING_CREATE.value,
        Permission.BOOKING_READ.value,
        Permission.BOOKING_UPDATE.value,
        Permission.BOOKING_DELETE.value,
        Permission.BOOKING_CANCEL.value,
        Permission.ROPA_READ.value,
        Permission.ROPA_CREATE.value,
        Permission.ROPA_UPDATE.value,
        Permission.ROPA_DELETE.value,
    },
    Role.EDITOR.value: {
        Permission.TENANT_READ.value,
        Permission.ROPA_READ.value,
        Permission.ROPA_CREATE.value,
        Permission.ROPA_UPDATE.value,
        Permission.ROPA_DELETE.value,
    },
    Role.MEMBER.value: {
        Permission.TENANT_READ.value,
        Permission.MEMBER_READ.value,
        Permission.RESOURCE_READ.value,
        Permission.RESOURCE_WRITE.value,
        Permission.BOOKING_CREATE.value,
        Permission.BOOKING_READ.value,
        Permission.BOOKING_UPDATE.value,
        Permission.BOOKING_CANCEL.value,
        Permission.ROPA_READ.value,
        Permission.ROPA_CREATE.value,
        Permission.ROPA_UPDATE.value,
    },
    Role.VIEWER.value: {
        Permission.TENANT_READ.value,
        Permission.MEMBER_READ.value,
        Permission.RESOURCE_READ.value,
        Permission.BOOKING_READ.value,
        Permission.ROPA_READ.value,
    },
}


def get_role_level(role: str) -> int:
    """
    Get the hierarchy level of a role.
    
    Args:
        role: Role name
        
    Returns:
        Integer level (0 = lowest, higher = more privileged)
        Returns -1 if role not found
    """
    try:
        return ROLE_HIERARCHY.index(role.lower())
    except ValueError:
        return -1


def has_role_or_higher(user_role: str, required_role: str) -> bool:
    """
    Check if user role is equal to or higher than required role.
    
    Args:
        user_role: User's current role
        required_role: Minimum required role
        
    Returns:
        True if user has required role or higher, False otherwise
        
    Example:
        has_role_or_higher("admin", "member") -> True
        has_role_or_higher("member", "admin") -> False
    """
    user_level = get_role_level(user_role)
    required_level = get_role_level(required_role)
    
    if user_level == -1 or required_level == -1:
        return False
    
    return user_level >= required_level


def has_permission(
    tenant_user: TenantUser,
    permission: str,
) -> bool:
    """
    Check if tenant_user has a specific permission.
    
    This function checks:
    1. Role-based default permissions
    2. Custom permissions in tenant_user.permissions
    
    Args:
        tenant_user: TenantUser relationship instance
        permission: Permission to check (e.g., "member:invite")
        
    Returns:
        True if user has permission, False otherwise
    """
    if not tenant_user.is_active:
        return False
    
    role = tenant_user.role.lower()
    
    # Check role-based default permissions
    role_perms = ROLE_PERMISSIONS.get(role, set())
    if permission in role_perms:
        return True
    
    # Check custom permissions
    if tenant_user.permissions:
        custom_perms = tenant_user.permissions.get("permissions", [])
        if isinstance(custom_perms, list):
            if permission in custom_perms:
                return True
        
        # Also check direct permission keys
        if permission in tenant_user.permissions:
            return tenant_user.permissions[permission] is True
    
    return False


def has_any_permission(
    tenant_user: TenantUser,
    permissions: List[str],
) -> bool:
    """
    Check if tenant_user has any of the specified permissions.
    
    Args:
        tenant_user: TenantUser relationship instance
        permissions: List of permissions to check
        
    Returns:
        True if user has at least one permission, False otherwise
    """
    return any(has_permission(tenant_user, perm) for perm in permissions)


def has_all_permissions(
    tenant_user: TenantUser,
    permissions: List[str],
) -> bool:
    """
    Check if tenant_user has all of the specified permissions.
    
    Args:
        tenant_user: TenantUser relationship instance
        permissions: List of permissions to check
        
    Returns:
        True if user has all permissions, False otherwise
    """
    return all(has_permission(tenant_user, perm) for perm in permissions)


def get_user_permissions(tenant_user: TenantUser) -> Set[str]:
    """
    Get all permissions for a tenant_user.
    
    Combines role-based permissions with custom permissions.
    
    Args:
        tenant_user: TenantUser relationship instance
        
    Returns:
        Set of permission strings
    """
    if not tenant_user.is_active:
        return set()
    
    role = tenant_user.role.lower()
    permissions = set(ROLE_PERMISSIONS.get(role, set()))
    
    # Add custom permissions
    if tenant_user.permissions:
        custom_perms = tenant_user.permissions.get("permissions", [])
        if isinstance(custom_perms, list):
            permissions.update(custom_perms)
        
        # Add direct permission keys that are True
        for key, value in tenant_user.permissions.items():
            if key != "permissions" and value is True:
                permissions.add(key)
    
    return permissions


def can_manage_role(user_role: str, target_role: str) -> bool:
    """
    Check if a user can manage (assign/change) a target role.
    
    Rules:
    - Users can only assign roles equal to or lower than their own
    - Only owners can assign/change owner role
    - Users cannot change their own role to owner (unless already owner)
    
    Args:
        user_role: Role of the user performing the action
        target_role: Role being assigned/changed
        
    Returns:
        True if user can manage target role, False otherwise
    """
    user_level = get_role_level(user_role)
    target_level = get_role_level(target_role)
    
    if user_level == -1 or target_level == -1:
        return False
    
    # Only owners can assign owner role
    if target_role.lower() == Role.OWNER.value:
        return user_role.lower() == Role.OWNER.value
    
    # Users can assign roles equal to or lower than their own
    return user_level >= target_level


def validate_role(role: str) -> bool:
    """
    Validate if a role is recognized.
    
    Args:
        role: Role name to validate
        
    Returns:
        True if role is valid, False otherwise
    """
    return role.lower() in [r.value for r in Role]












