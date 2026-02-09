"""
Password hashing utilities using bcrypt.

Provides secure password hashing and verification functions.
"""

from passlib.context import CryptContext

# Create password context with bcrypt
# bcrypt is a strong, adaptive hashing algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
        
    Example:
        >>> hashed = hash_password("mySecurePassword123")
        >>> len(hashed) > 50  # Bcrypt hashes are always long
        True
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Previously hashed password to compare against
        
    Returns:
        True if password matches, False otherwise
        
    Example:
        >>> hashed = hash_password("mySecurePassword123")
        >>> verify_password("mySecurePassword123", hashed)
        True
        >>> verify_password("wrongPassword", hashed)
        False
    """
    return pwd_context.verify(plain_password, hashed_password)

