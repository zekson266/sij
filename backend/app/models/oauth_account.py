"""
OAuth Account model.

Represents OAuth provider connections (Google, Apple, etc.) for users.
Users can have multiple OAuth providers linked to their account.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database import Base


class OAuthAccount(Base):
    """
    OAuth Account model representing external authentication providers.

    Links user accounts to external OAuth providers like Google, Apple, etc.
    Allows users to authenticate using multiple providers.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Foreign key to users table
        provider: OAuth provider name (google, apple, etc.)
        provider_user_id: User ID from the OAuth provider
        provider_email: Email from the OAuth provider
        access_token: OAuth access token (encrypted)
        refresh_token: OAuth refresh token (encrypted, optional)
        token_expires_at: Token expiration timestamp
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "oauth_accounts"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)

    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # OAuth provider information
    provider = Column(String(50), nullable=False, index=True)  # google, apple, etc.
    provider_user_id = Column(String(255), nullable=False, index=True)  # User ID from provider
    provider_email = Column(String(255), nullable=True)  # Email from provider

    # OAuth tokens (should be encrypted in production)
    access_token = Column(String(2048), nullable=True)  # OAuth access token
    refresh_token = Column(String(2048), nullable=True)  # OAuth refresh token
    token_expires_at = Column(DateTime, nullable=True)  # Token expiration

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="oauth_accounts")

    # Unique constraint: one provider account per user
    __table_args__ = (
        UniqueConstraint('provider', 'provider_user_id', name='uix_provider_user'),
    )

    def __repr__(self) -> str:
        """String representation of the OAuth account."""
        return f"<OAuthAccount(id={self.id}, provider='{self.provider}', user_id={self.user_id})>"
