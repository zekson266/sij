"""
User model.

Represents a global user account in the multi-tenant system.
Users can belong to multiple tenants through the tenant_users relationship.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """
    User model representing a global user account.
    
    Users are global entities that can belong to multiple tenants.
    Each user has a unique email address across the entire system.
    
    Attributes:
        id: Unique identifier (UUID)
        email: Email address (globally unique)
        hashed_password: Bcrypt hashed password
        first_name: User's first name
        last_name: User's last name
        phone: Optional phone number
        avatar_url: Optional avatar image URL
        is_active: Whether user account is active
        is_email_verified: Whether email is verified
        is_superuser: Whether user is platform superuser (optional)
        user_metadata: Flexible JSONB field for user-specific data
        last_login_at: Timestamp of last login
        created_at: Creation timestamp
        updated_at: Last update timestamp
        deleted_at: Soft delete timestamp (optional)
    """
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Authentication
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth-only users
    
    # Personal information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Status flags
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_email_verified = Column(Boolean, default=False, nullable=False, index=True)
    is_superuser = Column(Boolean, default=False, nullable=False, index=True)
    
    # Flexible data
    user_metadata = Column("metadata", JSONB, nullable=True)  # Flexible user data (DB column: 'metadata')
    
    # Timestamps
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete

    # Relationships
    # Note: Module-specific relationships (like appointments) are not defined here
    # to maintain core model independence. Use service methods to query module data.
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        """String representation of the user."""
        return f"<User(id={self.id}, email='{self.email}')>"

