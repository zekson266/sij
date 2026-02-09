"""
User service for business logic and data access.

Handles all user operations including:
- User registration
- User authentication
- User profile management
"""

from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.exceptions import NotFoundError, ConflictError, ValidationError, AuthenticationError
from app.utils.password import hash_password, verify_password


class UserService:
    """Service for user operations."""
    
    @staticmethod
    def create(
        db: Session,
        user_data: UserCreate,
    ) -> User:
        """
        Create a new user (registration).
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created User instance
            
        Raises:
            ConflictError: If email already exists
            ValidationError: If validation fails
        """
        # Check if user with email already exists
        existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
        if existing_user:
            raise ConflictError("User with this email already exists")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            avatar_url=user_data.avatar_url,
            is_active=True,
            is_email_verified=False,
            is_superuser=False,
            user_metadata=user_data.user_metadata,
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to create user due to constraint violation")
    
    @staticmethod
    def get_by_id(db: Session, user_id: UUID) -> User:
        """
        Get user by ID.
        
        Args:
            db: Database session
            user_id: User UUID
            
        Returns:
            User instance
            
        Raises:
            NotFoundError: If user not found
        """
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")
        
        return user
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            db: Database session
            email: User email address
            
        Returns:
            User instance or None if not found
        """
        return db.query(User).filter(User.email == email.lower()).first()
    
    @staticmethod
    def authenticate(
        db: Session,
        email: str,
        password: str,
    ) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Args:
            db: Database session
            email: User email address
            password: Plain text password
            
        Returns:
            User instance if authentication successful, None otherwise
        """
        user = UserService.get_by_email(db, email)
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        # Update last login timestamp
        user.last_login_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def update(
        db: Session,
        user_id: UUID,
        user_data: UserUpdate,
    ) -> User:
        """
        Update user information.
        
        Args:
            db: Database session
            user_id: User UUID
            user_data: Update data
            
        Returns:
            Updated User instance
            
        Raises:
            NotFoundError: If user not found
            ConflictError: If email already exists
        """
        user = UserService.get_by_id(db, user_id)
        
        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Handle password update separately (needs hashing)
        if "password" in update_data:
            update_data["hashed_password"] = hash_password(update_data.pop("password"))
        
        # Handle email update (lowercase)
        if "email" in update_data:
            # Check if new email already exists
            existing = db.query(User).filter(
                User.email == update_data["email"].lower(),
                User.id != user_id
            ).first()
            if existing:
                raise ConflictError("User with this email already exists")
            update_data["email"] = update_data["email"].lower()
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        try:
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to update user due to constraint violation")
    
    @staticmethod
    def deactivate(db: Session, user_id: UUID) -> User:
        """
        Deactivate user account (soft delete).
        
        Args:
            db: Database session
            user_id: User UUID
            
        Returns:
            Updated User instance
            
        Raises:
            NotFoundError: If user not found
        """
        user = UserService.get_by_id(db, user_id)
        
        user.is_active = False
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def verify_email(db: Session, user_id: UUID) -> User:
        """
        Mark user email as verified.
        
        Args:
            db: Database session
            user_id: User UUID
            
        Returns:
            Updated User instance
            
        Raises:
            NotFoundError: If user not found
        """
        user = UserService.get_by_id(db, user_id)
        
        user.is_email_verified = True
        
        db.commit()
        db.refresh(user)
        return user

