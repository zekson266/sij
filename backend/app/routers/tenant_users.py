"""
TenantUser API routes.

Handles all tenant-user relationship HTTP endpoints.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_tenant, get_current_tenant_user
from app.models.tenant import Tenant
from app.models.user import User
from app.models.tenant_user import TenantUser
from app.schemas.tenant_user import (
    TenantUserCreate,
    TenantUserUpdate,
    TenantUserResponse,
    TenantUserWithUser,
)
from app.schemas.user import UserResponse
from app.schemas.common import SuccessResponse
from app.services.tenant_user import TenantUserService
from app.services.user import UserService
from app.utils.rbac import get_user_permissions

router = APIRouter(
    prefix="/api/tenants/{tenant_id}/members",
    tags=["tenant-members"],
)


def _tenant_user_with_permissions(tenant_user: TenantUser) -> dict:
    tenant_user_data = TenantUserResponse.model_validate(tenant_user).model_dump()
    tenant_user_data["effective_permissions"] = sorted(get_user_permissions(tenant_user))
    return tenant_user_data


@router.post("", response_model=TenantUserResponse, status_code=status.HTTP_201_CREATED)
def invite_user_to_tenant(
    tenant_id: UUID,
    user_id: UUID = Query(..., description="User ID to invite"),
    role: str = Query("member", description="Role to assign"),
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Invite a user to the tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to invite (admin/owner role)
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can invite)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can invite users",
        )
    
    invited_member = TenantUserService.invite_user(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        invited_by=user.id,
        permissions=None,  # Permissions can be set via update endpoint
    )
    return TenantUserResponse(**_tenant_user_with_permissions(invited_member))


@router.get("", response_model=List[TenantUserWithUser])
def list_tenant_members(
    tenant_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    role: str = Query(None, description="Filter by role"),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    List all members of the tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    
    Returns tenant-user relationships. User information can be fetched separately
    using the user_id from each relationship.
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    tenant_users = TenantUserService.list_tenant_members(
        db,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        is_active=is_active,
        role=role,
    )
    
    # Enrich with user information
    result = []
    for tu in tenant_users:
        user = db.query(User).filter(User.id == tu.user_id).first()
        tu_data = _tenant_user_with_permissions(tu)
        if user:
            tu_data["user"] = {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
            }
        result.append(TenantUserWithUser(**tu_data))
    
    return result


@router.get("/search-user", response_model=Optional[UserResponse])
def search_user_by_email(
    tenant_id: UUID,
    email: str = Query(..., description="User email to search for"),
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Search for a user by email (for inviting to tenant).
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to invite (admin/owner role)
    
    Returns user information if found, None otherwise.
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can search for users to invite)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can search for users",
        )
    
    # Search for user by email
    found_user = UserService.get_by_email(db, email)
    
    if not found_user:
        return None
    
    return UserResponse.model_validate(found_user)


@router.get("/{user_id}", response_model=TenantUserResponse)
def get_tenant_member(
    tenant_id: UUID,
    user_id: UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Get a specific tenant member.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    member = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
    return TenantUserResponse(**_tenant_user_with_permissions(member))


@router.patch("/{user_id}", response_model=TenantUserResponse)
def update_tenant_member(
    tenant_id: UUID,
    user_id: UUID,
    tenant_user_data: TenantUserUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Update a tenant member's role or permissions.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to update (admin/owner role)
    - Cannot change owner role (unless current user is owner)
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can update)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can update member roles",
        )
    
    # Get the member being updated
    member = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
    
    # Prevent changing owner role (unless current user is owner and changing themselves)
    if member.role == "owner" and tenant_user_data.role and tenant_user_data.role != "owner":
        if user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change owner role",
            )
    
    updated_member = TenantUserService.update(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        tenant_user_data=tenant_user_data,
        updater_role=tenant_user.role,
    )
    return TenantUserResponse(**_tenant_user_with_permissions(updated_member))


@router.delete("/{user_id}", response_model=SuccessResponse)
def remove_tenant_member(
    tenant_id: UUID,
    user_id: UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Remove a user from the tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to remove (admin/owner role)
    - Cannot remove owner (unless removing themselves)
    
    Note: The tenant is automatically resolved from the tenant_id path parameter
    by the get_current_tenant dependency, ensuring the tenant exists and is active.
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can remove)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can remove members",
        )
    
    # Get the member being removed
    member = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
    
    # Prevent removing owner (unless removing themselves)
    if member.role == "owner" and user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove owner from tenant",
        )
    
    TenantUserService.remove_user(db, tenant_id, user_id)
    
    return SuccessResponse(
        message="User removed from tenant successfully",
        data={"tenant_id": str(tenant_id), "user_id": str(user_id)}
    )


# Additional route for user's tenants
@router.get("/users/{user_id}/tenants", response_model=List[TenantUserResponse])
def list_user_tenants(
    user_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: bool = Query(None),
    db: Session = Depends(get_db),
):
    """
    List all tenants a user belongs to.
    
    This endpoint is accessible without tenant context.
    """
    tenant_users = TenantUserService.list_user_tenants(
        db,
        user_id=user_id,
        skip=skip,
        limit=limit,
        is_active=is_active,
    )
    return [TenantUserResponse(**_tenant_user_with_permissions(tu)) for tu in tenant_users]

