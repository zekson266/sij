"""
JWT token utilities for authentication.

Provides functions to create and decode JWT access tokens.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt

from app.config import settings
from app.schemas.auth import TokenData


def create_access_token(
    user_id: UUID,
    email: str,
    tenant_id: Optional[UUID] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: User UUID
        email: User email address
        tenant_id: Optional tenant UUID (if user is in tenant context)
        role: Optional user role in tenant
        expires_delta: Optional custom expiration time (defaults to settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    Returns:
        Encoded JWT token string
        
    Example:
        >>> from uuid import uuid4
        >>> token = create_access_token(uuid4(), "user@example.com")
        >>> len(token) > 50
        True
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Token payload
    to_encode = {
        "sub": str(user_id),  # Subject (user ID)
        "email": email,
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at
        "type": "user",  # Token type
    }
    
    # Add tenant context if provided
    if tenant_id:
        to_encode["tenant_id"] = str(tenant_id)
        to_encode["role"] = role
        to_encode["type"] = "tenant_user"
    
    # Encode and return token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string to decode
        
    Returns:
        TokenData object if token is valid, None otherwise
        
    Example:
        >>> from uuid import uuid4
        >>> user_id = uuid4()
        >>> token = create_access_token(user_id, "user@example.com")
        >>> data = decode_token(token)
        >>> data.user_id == user_id
        True
    """
    try:
        # Decode token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        # Extract data
        user_id = UUID(payload.get("sub"))
        email = payload.get("email")
        tenant_id = payload.get("tenant_id")
        role = payload.get("role")
        token_type = payload.get("type", "user")
        
        # Convert tenant_id to UUID if present
        if tenant_id:
            tenant_id = UUID(tenant_id)
        
        return TokenData(
            user_id=user_id,
            email=email,
            tenant_id=tenant_id,
            role=role,
            type=token_type,
        )
    except (JWTError, ValueError, KeyError) as e:
        # Invalid token, expired, or missing required fields
        return None

