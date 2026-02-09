"""
Verification token model.

Stores email verification and password reset tokens.
Tokens are time-limited and single-use.
"""

from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
import enum


class TokenType(str, enum.Enum):
    """Token type enumeration."""
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class VerificationToken(Base):
    """
    Verification token model for email verification and password reset.
    
    Tokens are single-use and expire after a configured time period.
    
    Attributes:
        id: Unique identifier (UUID)
        user_id: Foreign key to users table
        token: Unique token string (hashed or UUID)
        token_type: Type of token (email_verification or password_reset)
        is_used: Whether token has been used
        expires_at: Token expiration timestamp
        created_at: Creation timestamp
        used_at: Timestamp when token was used (optional)
    """
    
    __tablename__ = "verification_tokens"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign key
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Token data
    token = Column(String(255), nullable=False, unique=True, index=True)
    token_type = Column(Enum(TokenType, values_callable=lambda x: [e.value for e in x], name='tokentype'), nullable=False, index=True)
    
    # Status
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Relationship
    user = relationship("User", backref="verification_tokens")
    
    def is_expired(self) -> bool:
        """Check if token is expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)."""
        return not self.is_used and not self.is_expired()
    
    def __repr__(self) -> str:
        """String representation of the token."""
        return f"<VerificationToken(id={self.id}, type={self.token_type}, used={self.is_used})>"











