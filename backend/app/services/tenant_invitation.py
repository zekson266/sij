"""
TenantInvitation service for business logic and data access.

Handles all tenant invitation operations including:
- Creating invitations by email
- Accepting invitations
- Auto-linking invitations on user registration
- Expiring old invitations
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.tenant_invitation import TenantInvitation, InvitationStatus
from app.models.tenant_user import TenantUser
from app.models.user import User
from app.schemas.tenant_invitation import TenantInvitationCreate, TenantInvitationUpdate
from app.exceptions import NotFoundError, ConflictError, ValidationError, AuthorizationError
from app.utils.rbac import validate_role, can_manage_role
from app.utils.tokens import generate_verification_token


class TenantInvitationService:
    """Service for tenant invitation operations."""
    
    @staticmethod
    def create_invitation(
        db: Session,
        tenant_id: UUID,
        email: str,
        role: str = "member",
        invited_by: Optional[UUID] = None,
        expires_in_days: int = 7,
        inviter_role: Optional[str] = None,
    ) -> TenantInvitation:
        """
        Create a tenant invitation by email.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            email: Email address of invited user
            role: Role to assign when invitation is accepted (default: "member")
            invited_by: UUID of user sending invitation (optional)
            expires_in_days: Days until invitation expires (default: 7)
            inviter_role: Role of user sending invitation (for permission check)
            
        Returns:
            Created TenantInvitation instance
            
        Raises:
            NotFoundError: If tenant not found
            ConflictError: If invitation already exists or user is already a member
            ValidationError: If role is invalid
            AuthorizationError: If inviter cannot assign this role
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
        
        # Check if user already exists and is a member
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        if existing_user:
            # Check if user is already a member
            existing_member = db.query(TenantUser).filter(
                TenantUser.tenant_id == tenant_id,
                TenantUser.user_id == existing_user.id,
            ).first()
            
            if existing_member:
                raise ConflictError("User is already a member of this tenant")
        
        # Check if pending invitation already exists
        existing_invitation = db.query(TenantInvitation).filter(
            TenantInvitation.tenant_id == tenant_id,
            TenantInvitation.email == email.lower(),
            TenantInvitation.status == InvitationStatus.PENDING,
        ).first()
        
        if existing_invitation:
            # Check if invitation is still valid
            if existing_invitation.is_valid():
                raise ConflictError("A pending invitation already exists for this email")
            else:
                # Expire old invitation and create new one
                existing_invitation.status = InvitationStatus.EXPIRED
                db.commit()
        
        # Generate unique token
        token = generate_verification_token()
        while db.query(TenantInvitation).filter(TenantInvitation.token == token).first():
            token = generate_verification_token()
        
        # Create invitation
        invitation = TenantInvitation(
            tenant_id=tenant_id,
            email=email.lower(),
            token=token,
            role=role,
            invited_by=invited_by,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
        )
        
        try:
            db.add(invitation)
            db.commit()
            db.refresh(invitation)
            return invitation
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to create invitation due to constraint violation")
    
    @staticmethod
    def get_by_id(db: Session, invitation_id: UUID) -> TenantInvitation:
        """
        Get invitation by ID.
        
        Args:
            db: Database session
            invitation_id: Invitation UUID
            
        Returns:
            TenantInvitation instance
            
        Raises:
            NotFoundError: If invitation not found
        """
        invitation = db.query(TenantInvitation).filter(
            TenantInvitation.id == invitation_id
        ).first()
        
        if not invitation:
            raise NotFoundError(f"Invitation with ID {invitation_id} not found")
        
        return invitation
    
    @staticmethod
    def get_by_token(db: Session, token: str) -> Optional[TenantInvitation]:
        """
        Get invitation by token.
        
        Args:
            db: Database session
            token: Invitation token string
            
        Returns:
            TenantInvitation if found and valid, None otherwise
        """
        invitation = db.query(TenantInvitation).filter(
            TenantInvitation.token == token
        ).first()
        
        if not invitation:
            return None
        
        # Check if invitation is still valid
        if not invitation.is_valid():
            return None
        
        return invitation
    
    @staticmethod
    def get_pending_by_email(
        db: Session,
        tenant_id: UUID,
        email: str,
    ) -> Optional[TenantInvitation]:
        """
        Get pending invitation by tenant and email.
        
        Used during registration to auto-link invitations.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            email: Email address
            
        Returns:
            TenantInvitation if found and valid, None otherwise
        """
        invitation = db.query(TenantInvitation).filter(
            TenantInvitation.tenant_id == tenant_id,
            TenantInvitation.email == email.lower(),
            TenantInvitation.status == InvitationStatus.PENDING,
        ).first()
        
        if not invitation:
            return None
        
        # Check if invitation is still valid
        if not invitation.is_valid():
            # Auto-expire if expired
            invitation.status = InvitationStatus.EXPIRED
            db.commit()
            return None
        
        return invitation
    
    @staticmethod
    def list_invitations(
        db: Session,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[InvitationStatus] = None,
    ) -> List[TenantInvitation]:
        """
        List invitations for a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter
            
        Returns:
            List of TenantInvitation instances
        """
        query = db.query(TenantInvitation).filter(
            TenantInvitation.tenant_id == tenant_id
        )
        
        if status:
            query = query.filter(TenantInvitation.status == status)
        
        return query.order_by(TenantInvitation.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def accept_invitation(
        db: Session,
        invitation_id: UUID,
        user_id: UUID,
    ) -> TenantUser:
        """
        Accept an invitation and create TenantUser relationship.
        
        Args:
            db: Database session
            invitation_id: Invitation UUID
            user_id: User UUID accepting the invitation
            
        Returns:
            Created TenantUser instance
            
        Raises:
            NotFoundError: If invitation not found
            ConflictError: If user is already a member
            ValidationError: If invitation is not valid
        """
        invitation = TenantInvitationService.get_by_id(db, invitation_id)
        
        # Verify invitation is valid
        if not invitation.is_valid():
            raise ValidationError("Invitation is expired or already accepted")
        
        # Verify email matches
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")
        
        if user.email.lower() != invitation.email.lower():
            raise ValidationError("Email address does not match invitation")
        
        # Check if user is already a member
        existing_member = db.query(TenantUser).filter(
            TenantUser.tenant_id == invitation.tenant_id,
            TenantUser.user_id == user_id,
        ).first()
        
        if existing_member:
            # Mark invitation as accepted anyway
            invitation.status = InvitationStatus.ACCEPTED
            invitation.accepted_at = datetime.utcnow()
            db.commit()
            raise ConflictError("User is already a member of this tenant")
        
        # Create tenant-user relationship
        tenant_user = TenantUser(
            tenant_id=invitation.tenant_id,
            user_id=user_id,
            role=invitation.role,
            invited_by=invitation.invited_by,
            invited_at=invitation.created_at,
            is_active=True,
        )
        
        # Mark invitation as accepted
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.utcnow()
        
        try:
            db.add(tenant_user)
            db.commit()
            db.refresh(tenant_user)
            return tenant_user
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to accept invitation due to constraint violation")
    
    @staticmethod
    def auto_link_invitation(
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        email: str,
    ) -> Optional[TenantUser]:
        """
        Auto-link pending invitation when user registers.
        
        Called during user registration to automatically accept invitations
        for the user's email address.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID (optional, if None checks all tenants)
            user_id: User UUID
            email: User email address
            
        Returns:
            Created TenantUser instance if invitation found, None otherwise
        """
        # Find pending invitation for this email and tenant
        invitation = TenantInvitationService.get_pending_by_email(
            db,
            tenant_id,
            email,
        )
        
        if not invitation:
            return None
        
        # Accept the invitation
        try:
            return TenantInvitationService.accept_invitation(
                db,
                invitation.id,
                user_id,
            )
        except ConflictError:
            # User already a member, just mark invitation as accepted
            invitation.status = InvitationStatus.ACCEPTED
            invitation.accepted_at = datetime.utcnow()
            db.commit()
            return None
    
    @staticmethod
    def cancel_invitation(
        db: Session,
        invitation_id: UUID,
    ) -> TenantInvitation:
        """
        Cancel an invitation.
        
        Args:
            db: Database session
            invitation_id: Invitation UUID
            
        Returns:
            Updated TenantInvitation instance
            
        Raises:
            NotFoundError: If invitation not found
            ValidationError: If invitation is already accepted
        """
        invitation = TenantInvitationService.get_by_id(db, invitation_id)
        
        if invitation.status == InvitationStatus.ACCEPTED:
            raise ValidationError("Cannot cancel an accepted invitation")
        
        invitation.status = InvitationStatus.CANCELLED
        db.commit()
        db.refresh(invitation)
        
        return invitation
    
    @staticmethod
    def expire_old_invitations(db: Session, days: int = 30) -> int:
        """
        Expire old invitations that are past their expiration date.
        
        Args:
            db: Database session
            days: Only expire invitations older than this many days (default: 30)
            
        Returns:
            Number of invitations expired
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        count = db.query(TenantInvitation).filter(
            TenantInvitation.status == InvitationStatus.PENDING,
            TenantInvitation.expires_at < datetime.utcnow(),
        ).update({"status": InvitationStatus.EXPIRED})
        
        db.commit()
        return count
