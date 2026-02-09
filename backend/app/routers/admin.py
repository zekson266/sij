"""
Admin API routes for platform administration.

These endpoints are accessible only to superusers and provide platform-wide
management capabilities.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_superuser
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.user import UserResponse
from app.schemas.tenant import TenantResponse, TenantCreate
from app.services.tenant import TenantService
from app.services.tenant_user import TenantUserService
from app.exceptions import NotFoundError

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
)


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    is_superuser: bool = Query(None, description="Filter by superuser status"),
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """
    List all users in the platform (superuser only).
    
    Requires superuser access. Returns paginated list of all users with optional filters.
    """
    query = db.query(User)
    
    # Apply filters
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_superuser is not None:
        query = query.filter(User.is_superuser == is_superuser)
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    return users


@router.get("/tenants", response_model=List[TenantResponse])
def list_all_tenants(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    is_verified: bool = Query(None, description="Filter by verified status"),
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """
    List all tenants in the platform (superuser only).
    
    Requires superuser access. Returns paginated list of all tenants with optional filters.
    """
    query = db.query(Tenant)
    
    # Apply filters
    if is_active is not None:
        query = query.filter(Tenant.is_active == is_active)
    if is_verified is not None:
        query = query.filter(Tenant.is_verified == is_verified)
    
    # Apply pagination
    tenants = query.offset(skip).limit(limit).all()
    
    return tenants


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant_as_admin(
    tenant_data: TenantCreate,
    owner_id: Optional[UUID] = Query(None, description="Optional user ID to assign as owner (defaults to superuser)"),
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """
    Create a new tenant as superuser (superuser only).
    
    This endpoint allows superusers to create tenants and optionally assign
    any user as the owner. If owner_id is not provided, the superuser becomes the owner.
    
    - **name**: Tenant name (required)
    - **slug**: URL-friendly identifier (optional, auto-generated if not provided)
    - **domain**: Custom domain (optional)
    - **email**: Contact email (required)
    - **phone**: Contact phone (optional)
    - **subscription_tier**: Subscription level (default: "free")
    - **owner_id**: Optional user ID to assign as owner (defaults to superuser)
    """
    # Determine owner: use provided owner_id or default to superuser
    owner_user_id = owner_id if owner_id else current_user.id
    
    # Validate owner BEFORE creating tenant to ensure atomicity
    owner_user = db.query(User).filter(User.id == owner_user_id).first()
    if not owner_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {owner_user_id} not found",
        )
    
    if not owner_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign inactive user as tenant owner",
        )
    
    # Create tenant (only after validation passes)
    tenant = TenantService.create(db, tenant_data)
    
    # Add owner to tenant
    try:
        TenantUserService.invite_user(
            db=db,
            tenant_id=tenant.id,
            user_id=owner_user_id,
            role="owner",
            invited_by=current_user.id,
            inviter_role=None,  # No inviter role check for admin creation
        )
    except Exception as e:
        # Log error but don't fail - tenant is created, owner can be added manually
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to add owner to tenant {tenant.id}: {str(e)}. "
            f"Tenant created but owner relationship failed."
        )
    
    return tenant


@router.get("/stats")
def get_platform_stats(
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """
    Get platform statistics (superuser only).
    
    Returns aggregate statistics about users, tenants, and system health.
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    superusers = db.query(User).filter(User.is_superuser == True).count()
    
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).count()
    verified_tenants = db.query(Tenant).filter(Tenant.is_verified == True).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "superusers": superusers,
        },
        "tenants": {
            "total": total_tenants,
            "active": active_tenants,
            "verified": verified_tenants,
        },
    }

