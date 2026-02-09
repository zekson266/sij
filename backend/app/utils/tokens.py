"""
Token generation utilities for email verification and password reset.

Generates secure, time-limited tokens for one-time use operations.
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.verification_token import VerificationToken, TokenType


def generate_verification_token() -> str:
    """
    Generate a secure random token for email verification or password reset.
    
    Returns:
        URL-safe random token string (32 bytes = 43 characters)
    """
    return secrets.token_urlsafe(32)


def create_verification_token(
    db: Session,
    user_id: UUID,
    token_type: TokenType,
    expires_in_hours: int = 24,
) -> VerificationToken:
    """
    Create a verification token for a user.
    
    Args:
        db: Database session
        user_id: User UUID
        token_type: Type of token (email_verification or password_reset)
        expires_in_hours: Hours until token expires (default: 24)
        
    Returns:
        Created VerificationToken instance
    """
    # Generate unique token
    token = generate_verification_token()
    
    # Ensure token is unique
    while db.query(VerificationToken).filter(VerificationToken.token == token).first():
        token = generate_verification_token()
    
    # Create token record
    verification_token = VerificationToken(
        user_id=user_id,
        token=token,
        token_type=token_type,
        expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
    )
    
    db.add(verification_token)
    db.commit()
    db.refresh(verification_token)
    
    return verification_token


def get_verification_token(
    db: Session,
    token: str,
    token_type: Optional[TokenType] = None,
) -> Optional[VerificationToken]:
    """
    Get a verification token by token string.
    
    Args:
        db: Database session
        token: Token string
        token_type: Optional token type filter
        
    Returns:
        VerificationToken if found and valid, None otherwise
    """
    query = db.query(VerificationToken).filter(VerificationToken.token == token)
    
    if token_type:
        query = query.filter(VerificationToken.token_type == token_type)
    
    verification_token = query.first()
    
    if not verification_token:
        return None
    
    # Check if token is valid
    if not verification_token.is_valid():
        return None
    
    return verification_token


def use_verification_token(
    db: Session,
    token: str,
    token_type: Optional[TokenType] = None,
) -> Optional[VerificationToken]:
    """
    Mark a verification token as used.
    
    Args:
        db: Database session
        token: Token string
        token_type: Optional token type filter
        
    Returns:
        VerificationToken if found and valid, None otherwise
    """
    verification_token = get_verification_token(db, token, token_type)
    
    if not verification_token:
        return None
    
    # Mark as used
    verification_token.is_used = True
    verification_token.used_at = datetime.utcnow()
    
    db.commit()
    db.refresh(verification_token)
    
    return verification_token


def invalidate_user_tokens(
    db: Session,
    user_id: UUID,
    token_type: TokenType,
) -> int:
    """
    Invalidate all unused tokens of a specific type for a user.
    
    Args:
        db: Database session
        user_id: User UUID
        token_type: Token type to invalidate
        
    Returns:
        Number of tokens invalidated
    """
    count = db.query(VerificationToken).filter(
        VerificationToken.user_id == user_id,
        VerificationToken.token_type == token_type,
        VerificationToken.is_used == False,
    ).update({"is_used": True, "used_at": datetime.utcnow()})
    
    db.commit()
    return count










