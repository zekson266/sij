"""
Tenant invitation model.

Stores pending invitations to tenants before user registration.
When user registers with matching email, invitation is auto-linked.
Follows the same pattern as VerificationToken for consistency.
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class InvitationStatus(str, enum.Enum):
    """Invitation status enumeration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class TenantInvitation(Base):
    """
    Tenant invitation model for pending invitations.
    
    Stores invitations sent to users before they register.
    When user registers with matching email, invitation is automatically
    accepted and TenantUser relationship is created.
    
    Attributes:
        id: Unique identifier (UUID)
        tenant_id: Foreign key to tenants table
        email: Email address of invited user
        token: Unique token string for invitation link
        role: Role to assign when invitation is accepted
        invited_by: User who sent the invitation (optional)
        status: Invitation status (pending, accepted, expired, cancelled)
        expires_at: Invitation expiration timestamp
        accepted_at: Timestamp when invitation was accepted (optional)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "tenant_invitations"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Invitation data
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False, default="member", index=True)
    
    # Status
    status = Column(
        Enum(InvitationStatus, values_callable=lambda x: [e.value for e in x], name='invitationstatus'),
        nullable=False,
        default=InvitationStatus.PENDING,
        index=True
    )
    expires_at = Column(DateTime, nullable=False, index=True)
    accepted_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Unique constraint: one pending invitation per tenant+email
    __table_args__ = (
        UniqueConstraint('tenant_id', 'email', name='uq_tenant_invitation_email'),
    )
    
    # Relationships
    tenant = relationship("Tenant", backref="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    def is_expired(self) -> bool:
        """Check if invitation is expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if invitation is valid (pending status and not expired)."""
        return self.status == InvitationStatus.PENDING and not self.is_expired()
    
    def __repr__(self) -> str:
        """String representation of the invitation."""
        return f"<TenantInvitation(id={self.id}, tenant_id={self.tenant_id}, email='{self.email}', status='{self.status}')>"
