"""
FastAPI dependencies for authentication and authorization.

Provides dependency functions that can be used in route handlers to:
- Get the current authenticated user
- Get the current tenant context
- Verify permissions
"""

from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.models.tenant_user import TenantUser
from app.schemas.auth import TokenData
from app.utils.jwt import decode_token
from app.utils.tenant_context import get_tenant_context

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)  # Don't auto-raise error if token missing


def get_current_user_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[TokenData]:
    """
    Extract and decode JWT token from cookie or Authorization header.
    
    This dependency extracts the token from:
    1. HttpOnly cookie (preferred for cross-subdomain auth)
    2. Authorization header (fallback for API clients)
    
    Args:
        request: FastAPI request object (for accessing cookies)
        credentials: HTTP Bearer credentials from Authorization header (optional)
        
    Returns:
        TokenData object with user information, or None if no token provided
        
    Raises:
        HTTPException: If token is invalid or expired (but not if missing)
    """
    token = None
    
    # Try to get token from cookie first (for cross-subdomain auth)
    if "access_token" in request.cookies:
        token = request.cookies.get("access_token")
    
    # Fallback to Authorization header (for API clients, backward compatibility)
    if token is None and credentials is not None:
        token = credentials.credentials
    
    # If no token found, return None
    if token is None:
        return None
    
    # Decode token
    token_data = decode_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    return token_data


def get_current_user(
    token_data: Optional[TokenData] = Depends(get_current_user_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from database.
    
    This dependency:
    1. Extracts and validates the JWT token
    2. Fetches the user from the database
    3. Verifies the user is active
    
    Args:
        token_data: Decoded token data (from get_current_user_token)
        db: Database session
        
    Returns:
        User model instance
        
    Raises:
        HTTPException: If token missing, user not found, or inactive
    """
    # Check if token is provided
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )
    
    return user


def get_current_user_optional(
    token_data: Optional[TokenData] = Depends(get_current_user_token),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Get the current authenticated user from database (optional).
    
    Similar to get_current_user but returns None instead of raising error
    if no token is provided or token is invalid.
    
    This dependency:
    1. Extracts and validates the JWT token (if present)
    2. Fetches the user from the database (if token valid)
    3. Verifies the user is active (if found)
    
    Args:
        token_data: Optional decoded token data (from get_current_user_token)
        db: Database session
        
    Returns:
        User model instance if authenticated, None otherwise
        
    Use Case:
        For endpoints that work with or without authentication:
        
        @router.get("/public-page")
        def public_page(
            user: Optional[User] = Depends(get_current_user_optional),
        ):
            if user:
                # Show authenticated content
            else:
                # Show public content
    """
    # If no token provided, return None
    if token_data is None:
        return None
    
    # Get user from database
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    # If user not found or inactive, return None (don't raise error)
    if user is None or not user.is_active:
        return None
    
    return user


def get_current_tenant_user(
    tenant_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    token_data: Optional[TokenData] = Depends(get_current_user_token),
) -> tuple[User, TenantUser]:
    """
    Get the current authenticated user and their tenant relationship.
    
    This dependency:
    1. Extracts and validates the JWT token (for user identification)
    2. Uses tenant_id from path parameter (primary source, following RESTful best practices)
    3. Fetches the user and tenant_user relationship from database
    4. Verifies both user and relationship are active
    
    Args:
        tenant_id: Tenant UUID from path parameter (automatically injected by FastAPI)
        request: FastAPI request object
        db: Database session
        token_data: Optional decoded JWT token (for user identification)
        
    Returns:
        Tuple of (User, TenantUser) model instances
        
    Raises:
        HTTPException: If user not found, not authenticated, or relationship inactive
        
    Example:
        ```python
        @router.get("/{tenant_id}/members")
        def list_members(
            tenant_id: UUID,  # Path parameter
            user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),  # Uses tenant_id
        ):
            user, tenant_user = user_tenant
            # user and tenant_user are already resolved and validated
            ...
        ```
    """
    # Verify user is authenticated
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    # Get user from token
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )
    
    # Get tenant_user relationship using path parameter tenant_id (not token tenant_id)
    # This allows users to access tenants even if their token doesn't include tenant context
    tenant_user = (
        db.query(TenantUser)
        .filter(
            TenantUser.tenant_id == tenant_id,  # From path parameter
            TenantUser.user_id == token_data.user_id,  # From token
        )
        .first()
    )
    
    if tenant_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this tenant",
        )
    
    if not tenant_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant membership is inactive",
        )
    
    return user, tenant_user


def get_current_tenant(
    request: Request,
    db: Session = Depends(get_db),
    token_data: Optional[TokenData] = Depends(get_current_user_token),
    tenant_id: Optional[UUID] = None,
) -> Tenant:
    """
    Get current tenant context from request.
    
    This dependency extracts tenant context from multiple sources with the following
    priority order (following RESTful best practices):
    
    1. Path parameter (tenant_id) - explicit UUID in URL (highest priority)
    2. Path parameter (tenant_slug) - explicit slug in URL
    3. JWT token (tenant_id) - from authenticated user's token context
    4. X-Tenant-ID header - explicit header (for API clients)
    5. X-Tenant-Slug header - explicit header (for API clients)
    6. Domain/subdomain - from Host header (for public tenant pages)
    
    When tenant_id is provided as a path parameter (e.g., /api/tenants/{tenant_id}/members),
    FastAPI automatically injects it into this dependency, making it the primary source
    of tenant identification. This is the recommended approach for tenant-scoped endpoints.
    
    Args:
        tenant_id: Optional tenant UUID from path parameter (automatically injected by FastAPI)
        request: FastAPI request object (for headers and domain extraction)
        db: Database session
        token_data: Optional decoded JWT token (from get_current_user_token)
        
    Returns:
        Tenant instance
        
    Raises:
        HTTPException: If tenant not found, invalid, or inactive
        
    Example:
        ```python
        # Route with tenant_id in path (recommended)
        @router.get("/{tenant_id}/members")
        def list_members(
            tenant_id: UUID,  # Path parameter
            tenant: Tenant = Depends(get_current_tenant),  # Uses tenant_id automatically
            db: Session = Depends(get_db),
        ):
            # tenant is already resolved and validated
            ...
        
        # Route without tenant_id in path (fallback to token/headers)
        @router.get("/my-tenant")
        def get_my_tenant(
            tenant: Tenant = Depends(get_current_tenant),  # Uses token/headers
        ):
            ...
        ```
    """
    tenant = get_tenant_context(
        request,
        db,
        token_data=token_data,
        tenant_id=tenant_id,
    )
    
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context is required but could not be determined. "
                   "Provide tenant via path parameter (tenant_id), JWT token, "
                   "X-Tenant-ID header, X-Tenant-Slug header, or domain.",
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant is inactive",
        )
    
    return tenant


def get_current_tenant_optional(
    request: Request,
    db: Session = Depends(get_db),
    token_data: Optional[TokenData] = Depends(get_current_user_token),
    tenant_id: Optional[UUID] = None,
) -> Optional[Tenant]:
    """
    Get current tenant context (optional).
    
    Similar to get_current_tenant but returns None instead of raising error
    if tenant context cannot be determined. Useful for endpoints that work
    with or without tenant context.
    
    Priority order matches get_current_tenant:
    1. Path parameter (tenant_id) - highest priority
    2. Path parameter (tenant_slug)
    3. JWT token (tenant_id)
    4. X-Tenant-ID header
    5. X-Tenant-Slug header
    6. Domain/subdomain
    
    Args:
        tenant_id: Optional tenant UUID from path parameter
        request: FastAPI request object
        db: Database session
        token_data: Optional decoded JWT token
        
    Returns:
        Tenant instance if found and active, None otherwise
        
    Example:
        ```python
        @router.get("/public-endpoint")
        def public_endpoint(
            tenant: Optional[Tenant] = Depends(get_current_tenant_optional),
        ):
            if tenant:
                # Show tenant-specific content
            else:
                # Show public content
        ```
    """
    tenant = get_tenant_context(
        request,
        db,
        token_data=token_data,
        tenant_id=tenant_id,
    )
    
    if tenant and not tenant.is_active:
        return None
    
    return tenant


def require_role(required_role: str, allow_higher: bool = True):
    """
    Dependency factory to require a specific role in tenant context.
    
    Supports role hierarchy: if allow_higher=True, users with higher roles
    can also access (e.g., owner can access admin endpoints).
    
    Usage:
        @app.get("/admin-only")
        def admin_endpoint(
            user_tenant: tuple[User, TenantUser] = Depends(require_role("admin"))
        ):
            ...
    
    Args:
        required_role: Required role (e.g., "admin", "owner")
        allow_higher: If True, allows users with higher roles (default: True)
        
    Returns:
        Dependency function that checks role
    """
    from app.utils.rbac import has_role_or_higher, validate_role
    
    if not validate_role(required_role):
        raise ValueError(f"Invalid role: {required_role}")
    
    def role_checker(
        user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    ) -> tuple[User, TenantUser]:
        user, tenant_user = user_tenant
        
        if allow_higher:
            if not has_role_or_higher(tenant_user.role, required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires role: {required_role} or higher",
                )
        else:
            if tenant_user.role.lower() != required_role.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires exact role: {required_role}",
                )
        
        return user, tenant_user
    
    return role_checker


def require_permission(permission: str):
    """
    Dependency factory to require a specific permission.
    
    Checks both role-based and custom permissions.
    
    Usage:
        @app.post("/invite")
        def invite_user(
            user_tenant: tuple[User, TenantUser] = Depends(require_permission("member:invite"))
        ):
            ...
    
    Args:
        permission: Required permission (e.g., "member:invite", "tenant:write")
        
    Returns:
        Dependency function that checks permission
    """
    from app.utils.rbac import has_permission
    
    def permission_checker(
        user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    ) -> tuple[User, TenantUser]:
        user, tenant_user = user_tenant
        
        if not has_permission(tenant_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires permission: {permission}",
            )
        
        return user, tenant_user
    
    return permission_checker


def require_any_permission(permissions: List[str]):
    """
    Dependency factory to require any of the specified permissions.
    
    Usage:
        @app.get("/data")
        def get_data(
            user_tenant: tuple[User, TenantUser] = Depends(
                require_any_permission(["resource:read", "resource:write"])
            )
        ):
            ...
    
    Args:
        permissions: List of permissions (user needs at least one)
        
    Returns:
        Dependency function that checks permissions
    """
    from app.utils.rbac import has_any_permission
    
    def permission_checker(
        user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    ) -> tuple[User, TenantUser]:
        user, tenant_user = user_tenant
        
        if not has_any_permission(tenant_user, permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these permissions: {', '.join(permissions)}",
            )
        
        return user, tenant_user
    
    return permission_checker


def require_all_permissions(permissions: List[str]):
    """
    Dependency factory to require all of the specified permissions.
    
    Usage:
        @app.delete("/resource")
        def delete_resource(
            user_tenant: tuple[User, TenantUser] = Depends(
                require_all_permissions(["resource:read", "resource:delete"])
            )
        ):
            ...
    
    Args:
        permissions: List of permissions (user needs all)
        
    Returns:
        Dependency function that checks permissions
    """
    from app.utils.rbac import has_all_permissions
    
    def permission_checker(
        user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    ) -> tuple[User, TenantUser]:
        user, tenant_user = user_tenant
        
        if not has_all_permissions(tenant_user, permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires all of these permissions: {', '.join(permissions)}",
            )
        
        return user, tenant_user
    
    return permission_checker


def require_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to require superuser access.
    
    This dependency ensures that only users with is_superuser=True can access
    the endpoint. Use this for platform admin endpoints.
    
    Usage:
        @app.get("/admin/users")
        def list_all_users(
            current_user: User = Depends(require_superuser),
            db: Session = Depends(get_db),
        ):
            ...
    
    Args:
        current_user: Current authenticated user (from get_current_user)
        
    Returns:
        User instance (guaranteed to be superuser)
        
    Raises:
        HTTPException: 403 if user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )
    
    return current_user

