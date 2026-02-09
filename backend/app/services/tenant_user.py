"""
TenantUser service for business logic and data access.

Handles all tenant-user relationship operations including:
- Inviting users to tenants
- Managing roles and permissions
- Removing users from tenants
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.tenant_user import TenantUser
from app.models.user import User
from app.schemas.tenant_user import TenantUserCreate, TenantUserUpdate
from app.exceptions import NotFoundError, ConflictError, ValidationError, AuthorizationError
from app.utils.rbac import validate_role, can_manage_role, ROLE_PERMISSIONS


class TenantUserService:
    """Service for tenant-user relationship operations."""
    
    @staticmethod
    def invite_user(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        role: str = "member",
        invited_by: Optional[UUID] = None,
        permissions: Optional[dict] = None,
        inviter_role: Optional[str] = None,
    ) -> TenantUser:
        """
        Invite a user to a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            user_id: User UUID to invite
            role: Role to assign (default: "member")
            invited_by: UUID of user sending invitation (optional)
            permissions: Optional permissions dict
            
        Returns:
            Created TenantUser instance
            
        Raises:
            NotFoundError: If tenant or user not found
            ConflictError: If user is already a member
        """
        # Verify tenant exists
        from app.services.tenant import TenantService
        tenant = TenantService.get_by_id(db, tenant_id)
        
        # Validate role
        if not validate_role(role):
            raise ValidationError(f"Invalid role: {role}")
        
        # Check if inviter can assign this role
        if inviter_role and not can_manage_role(inviter_role, role):
            raise AuthorizationError(
                f"User with role '{inviter_role}' cannot assign role '{role}'"
            )
        
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")
        
        # Check if relationship already exists
        existing = db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id,
        ).first()
        
        if existing:
            raise ConflictError("User is already a member of this tenant")
        
        # Create tenant-user relationship
        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            invited_by=invited_by,
            invited_at=datetime.utcnow(),
            permissions=permissions,
        )
        
        try:
            db.add(tenant_user)
            db.commit()
            db.refresh(tenant_user)
            return tenant_user
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to invite user due to constraint violation")
    
    @staticmethod
    def get_by_id(db: Session, tenant_user_id: UUID) -> TenantUser:
        """
        Get tenant-user relationship by ID.
        
        Args:
            db: Database session
            tenant_user_id: TenantUser UUID
            
        Returns:
            TenantUser instance
            
        Raises:
            NotFoundError: If relationship not found
        """
        tenant_user = db.query(TenantUser).filter(TenantUser.id == tenant_user_id).first()
        
        if not tenant_user:
            raise NotFoundError(f"Tenant-user relationship with ID {tenant_user_id} not found")
        
        return tenant_user
    
    @staticmethod
    def get_by_tenant_and_user(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
    ) -> TenantUser:
        """
        Get tenant-user relationship by tenant and user IDs.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            user_id: User UUID
            
        Returns:
            TenantUser instance
            
        Raises:
            NotFoundError: If relationship not found
        """
        tenant_user = db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id,
        ).first()
        
        if not tenant_user:
            raise NotFoundError("User is not a member of this tenant")
        
        return tenant_user
    
    @staticmethod
    def list_tenant_members(
        db: Session,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        role: Optional[str] = None,
    ) -> List[TenantUser]:
        """
        List all members of a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            is_active: Filter by active status
            role: Filter by role
            
        Returns:
            List of TenantUser instances
        """
        query = db.query(TenantUser).filter(TenantUser.tenant_id == tenant_id)
        
        if is_active is not None:
            query = query.filter(TenantUser.is_active == is_active)
        
        if role:
            query = query.filter(TenantUser.role == role)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def list_user_tenants(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[TenantUser]:
        """
        List all tenants a user belongs to.
        
        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            is_active: Filter by active status
            
        Returns:
            List of TenantUser instances
        """
        query = db.query(TenantUser).filter(TenantUser.user_id == user_id)
        
        if is_active is not None:
            query = query.filter(TenantUser.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        tenant_user_data: TenantUserUpdate,
        updater_role: Optional[str] = None,
    ) -> TenantUser:
        """
        Update tenant-user relationship (role, permissions, etc.).
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            user_id: User UUID
            tenant_user_data: Update data
            
        Returns:
            Updated TenantUser instance
            
        Raises:
            NotFoundError: If relationship not found
        """
        tenant_user = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
        
        # Update fields
        update_data = tenant_user_data.model_dump(exclude_unset=True)
        
        # Validate role if being updated
        if "role" in update_data:
            new_role = update_data["role"]
            if not validate_role(new_role):
                raise ValidationError(f"Invalid role: {new_role}")
            
            # Check if updater can assign this role
            if updater_role and not can_manage_role(updater_role, new_role):
                raise AuthorizationError(
                    f"User with role '{updater_role}' cannot assign role '{new_role}'"
                )
        
        for field, value in update_data.items():
            setattr(tenant_user, field, value)
        
        try:
            db.commit()
            db.refresh(tenant_user)
            return tenant_user
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to update tenant-user relationship")
    
    @staticmethod
    def remove_user(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """
        Remove user from tenant (hard delete).
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            user_id: User UUID
            
        Raises:
            NotFoundError: If relationship not found
        """
        tenant_user = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
        
        db.delete(tenant_user)
        db.commit()
    
    @staticmethod
    def deactivate_user(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
    ) -> TenantUser:
        """
        Deactivate user's membership in tenant (soft delete).
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            user_id: User UUID
            
        Returns:
            Updated TenantUser instance
            
        Raises:
            NotFoundError: If relationship not found
        """
        tenant_user = TenantUserService.get_by_tenant_and_user(db, tenant_id, user_id)
        
        tenant_user.is_active = False
        
        db.commit()
        db.refresh(tenant_user)
        return tenant_user

