"""
Tenant API routes.

Handles all tenant-related HTTP endpoints.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional, get_current_tenant_user, require_role
from app.models.user import User
from app.models.tenant_user import TenantUser
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantPublicResponse
from app.schemas.common import SuccessResponse
from app.services.tenant import TenantService
from app.services.tenant_user import TenantUserService
from app.exceptions import NotFoundError

router = APIRouter(
    prefix="/api/tenants",
    tags=["tenants"],
)


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_data: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new tenant.
    
    Requires authentication. The authenticated user will automatically be added
    as the owner of the created tenant.
    
    - **name**: Tenant name (required)
    - **slug**: URL-friendly identifier (optional, auto-generated if not provided)
    - **domain**: Custom domain (optional)
    - **email**: Contact email (required)
    - **phone**: Contact phone (optional)
    - **subscription_tier**: Subscription level (default: "free")
    """
    # Create tenant (this commits, so we need to handle owner addition separately)
    tenant = TenantService.create(db, tenant_data)
    
    # Automatically add creator as owner
    # Note: If this fails, tenant is already created but without owner
    # This is acceptable as owner can be added manually later if needed
    try:
        TenantUserService.invite_user(
            db=db,
            tenant_id=tenant.id,
            user_id=current_user.id,
            role="owner",
            invited_by=current_user.id,
            inviter_role=None,  # No inviter role check for tenant creation
        )
    except Exception as e:
        # Log error but don't fail - tenant is created, owner can be added manually
        # In production, you might want to log this to monitoring system
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to add owner to tenant {tenant.id}: {str(e)}. "
            f"Tenant created but owner relationship failed."
        )
        # Still return tenant - it exists, just without owner relationship
        # This is a rare edge case
    
    return tenant


@router.get("", response_model=List[TenantResponse])
def list_tenants(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    is_verified: bool = Query(None, description="Filter by verified status"),
    db: Session = Depends(get_db),
):
    """
    List all tenants with optional filters.
    
    Supports pagination and filtering by active/verified status.
    """
    return TenantService.list_all(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        is_verified=is_verified,
    )


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get tenant by ID.
    """
    return TenantService.get_by_id(db, tenant_id)


@router.get("/slug/{slug}", response_model=TenantResponse)
def get_tenant_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get tenant by slug.
    """
    return TenantService.get_by_slug(db, slug)


@router.get("/slug/{slug}/public", response_model=TenantPublicResponse)
def get_tenant_public_info(
    slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Get public tenant information with optional authentication enhancement.
    
    This endpoint works with or without authentication:
    - **Without auth**: Returns basic public tenant information
    - **With auth (not a member)**: Returns public info + indicates user is not a member
    - **With auth (member)**: Returns public info + user role + member status
    
    Perfect for public booking pages that show different content based on auth state.
    """
    # Get tenant by slug
    tenant = TenantService.get_by_slug(db, slug)
    
    # Base response with public fields
    response_data = {
        "id": tenant.id,
        "name": tenant.name,
        "slug": tenant.slug,
        "email": tenant.email,  # Public email (contact info)
        "phone": tenant.phone,
        "is_active": tenant.is_active,
        "is_verified": tenant.is_verified,
        "subscription_tier": tenant.subscription_tier,
        "tenant_metadata": tenant.tenant_metadata,
        "settings": tenant.settings,  # Include settings for booking configuration
        "user_role": None,
        "is_member": False,
        "can_book": False,
    }
    
    # Check membership status
    is_member = False
    user_role = None
    
    if current_user:
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db, tenant_id=tenant.id, user_id=current_user.id
            )
            
            if tenant_user and tenant_user.is_active:
                # User is an active member
                is_member = True
                user_role = tenant_user.role
        except NotFoundError:
            # User is authenticated but not a member
            is_member = False
    
    # Update response with membership info
    response_data["is_member"] = is_member
    response_data["user_role"] = user_role
    
    # Compute can_book based on access control settings
    from app.utils.access_control import can_access_feature
    response_data["can_book"] = can_access_feature(
        tenant=tenant,
        feature="booking",
        current_user=current_user,
        is_member=is_member,
    )
    
    return TenantPublicResponse(**response_data)


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have admin or owner role
    
    All fields are optional. Only provided fields will be updated.
    """
    # Verify tenant exists
    tenant = TenantService.get_by_id(db, tenant_id)
    
    # Get tenant-user relationship
    tenant_user = TenantUserService.get_by_tenant_and_user(
        db, tenant_id=tenant_id, user_id=current_user.id
    )
    
    # Check if user is active member
    if not tenant_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant membership is inactive",
        )
    
    # Check role (admin or owner required)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can update tenants",
        )
    
    return TenantService.update(db, tenant_id, tenant_data)


@router.delete("/{tenant_id}", response_model=SuccessResponse)
def delete_tenant(
    tenant_id: UUID,
    soft_delete: bool = Query(True, description="Soft delete (set deleted_at) or hard delete"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have owner role (only owners can delete tenants)
    
    By default, performs soft delete (sets deleted_at timestamp).
    Set soft_delete=false for permanent deletion.
    """
    # Verify tenant exists
    tenant = TenantService.get_by_id(db, tenant_id)
    
    # Get tenant-user relationship
    try:
        tenant_user = TenantUserService.get_by_tenant_and_user(
            db, tenant_id=tenant_id, user_id=current_user.id
        )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this tenant",
        )
    
    # Check if user is active member
    if not tenant_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant membership is inactive",
        )
    
    # Verify user is owner (only owners can delete)
    if tenant_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can delete tenants",
        )
    
    TenantService.delete(db, tenant_id, soft_delete=soft_delete)
    return SuccessResponse(
        message="Tenant deleted successfully",
        data={"tenant_id": str(tenant_id), "soft_delete": soft_delete}
    )

