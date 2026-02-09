"""
TenantUser model.

Represents the many-to-many relationship between users and tenants.
This table links users to tenants with role-based access control.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TenantUser(Base):
    """
    TenantUser model representing the user-tenant relationship.
    
    This is a many-to-many relationship table that links users to tenants.
    Each relationship includes a role (owner, admin, member, etc.) and permissions.
    
    Attributes:
        id: Unique identifier (UUID)
        tenant_id: Foreign key to tenants table
        user_id: Foreign key to users table
        role: User's role in the tenant (owner, admin, member, viewer, etc.)
        is_active: Whether this relationship is active
        permissions: JSONB field for role-specific permissions
        invited_by: User who invited this user (optional)
        invited_at: Timestamp when invitation was sent (optional)
        joined_at: Timestamp when user joined the tenant
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "tenant_users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Role and permissions
    role = Column(String(50), nullable=False, default="member", index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    permissions = Column(JSONB, nullable=True)  # Role-specific permissions
    
    # Invitation tracking
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    invited_at = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Unique constraint: a user can only have one relationship per tenant
    __table_args__ = (
        UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_user'),
    )
    
    def __repr__(self) -> str:
        """String representation of the tenant-user relationship."""
        return f"<TenantUser(id={self.id}, tenant_id={self.tenant_id}, user_id={self.user_id}, role='{self.role}')>"

