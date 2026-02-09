"""
Tenant Invitations API routes.

Handles all tenant invitation HTTP endpoints.
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
from app.schemas.tenant_invitation import (
    TenantInvitationCreate,
    TenantInvitationUpdate,
    TenantInvitationResponse,
)
from app.schemas.common import SuccessResponse
from app.services.tenant_invitation import TenantInvitationService
from app.models.tenant_invitation import TenantInvitation, InvitationStatus

router = APIRouter(
    prefix="/api/tenants/{tenant_id}/invitations",
    tags=["tenant-invitations"],
)


@router.post("", response_model=TenantInvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    tenant_id: UUID,
    invitation_data: TenantInvitationCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Create a tenant invitation by email.
    
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
            detail="Only admins and owners can create invitations",
        )
    
    # Verify tenant ID matches invitation data
    if invitation_data.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID in request body does not match path parameter",
        )
    
    invitation = TenantInvitationService.create_invitation(
        db,
        tenant_id=tenant_id,
        email=invitation_data.email,
        role=invitation_data.role,
        invited_by=user.id,
        expires_in_days=invitation_data.expires_in_days,
        inviter_role=tenant_user.role,
    )
    
    # Send invitation email
    from app.utils.email import send_invitation_email
    inviter_name = f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else user.email
    email_sent = send_invitation_email(
        to_email=invitation.email,
        invitation_token=invitation.token,
        tenant_name=tenant.name,
        inviter_name=inviter_name,
        role=invitation.role,
    )
    
    return invitation


@router.get("", response_model=List[TenantInvitationResponse])
def list_invitations(
    tenant_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status (pending, accepted, expired, cancelled)"),
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    List all invitations for the tenant.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to view invitations (admin/owner role)
    
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
    
    # Check permissions (only admin/owner can view invitations)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can view invitations",
        )
    
    # Parse status filter
    status_filter = None
    if status:
        try:
            status_filter = InvitationStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Must be one of: pending, accepted, expired, cancelled",
            )
    
    invitations = TenantInvitationService.list_invitations(
        db,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        status=status_filter,
    )
    
    return invitations


@router.get("/{invitation_id}", response_model=TenantInvitationResponse)
def get_invitation(
    tenant_id: UUID,
    invitation_id: UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific invitation.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to view invitations (admin/owner role)
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can view invitations)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can view invitations",
        )
    
    invitation = TenantInvitationService.get_by_id(db, invitation_id)
    
    # Verify invitation belongs to this tenant
    if invitation.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    return invitation


@router.delete("/{invitation_id}", response_model=SuccessResponse)
def cancel_invitation(
    tenant_id: UUID,
    invitation_id: UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user_tenant: tuple[User, TenantUser] = Depends(get_current_tenant_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending invitation.
    
    Requires:
    - User must be authenticated
    - User must be a member of the tenant
    - User must have permission to cancel invitations (admin/owner role)
    """
    user, tenant_user = current_user_tenant
    
    # Verify tenant ID matches (defensive check, should always match due to dependency)
    if tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID mismatch",
        )
    
    # Check permissions (only admin/owner can cancel invitations)
    if tenant_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can cancel invitations",
        )
    
    invitation = TenantInvitationService.get_by_id(db, invitation_id)
    
    # Verify invitation belongs to this tenant
    if invitation.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    TenantInvitationService.cancel_invitation(db, invitation_id)
    
    return SuccessResponse(
        message="Invitation cancelled successfully",
        data={"invitation_id": str(invitation_id), "tenant_id": str(tenant_id)}
    )
