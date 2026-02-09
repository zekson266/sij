"""
OAuth service for handling third-party authentication.

Handles Google OAuth authentication, user creation/linking, and token management.
"""

from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.user import User
from app.models.oauth_account import OAuthAccount
from app.schemas.oauth import OAuthProvider, OAuthAccountCreate
from app.services.user import UserService
from app.exceptions import AuthenticationError, ValidationError
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class OAuthService:
    """Service for OAuth operations."""

    @staticmethod
    def verify_google_token(credential: str) -> Dict[str, Any]:
        """
        Verify Google OAuth token and extract user information.

        Args:
            credential: Google OAuth credential (JWT token)

        Returns:
            Dict containing user info from Google

        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            # Verify the issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise AuthenticationError("Invalid token issuer")

            return {
                'provider_user_id': idinfo['sub'],
                'email': idinfo['email'],
                'email_verified': idinfo.get('email_verified', False),
                'first_name': idinfo.get('given_name'),
                'last_name': idinfo.get('family_name'),
                'picture': idinfo.get('picture'),
            }

        except ValueError as e:
            logger.error(f"Google token verification failed: {str(e)}")
            raise AuthenticationError("Invalid Google token")
        except Exception as e:
            logger.error(f"Unexpected error verifying Google token: {str(e)}")
            raise AuthenticationError("Failed to verify Google token")

    @staticmethod
    def get_oauth_account(
        db: Session,
        provider: OAuthProvider,
        provider_user_id: str
    ) -> Optional[OAuthAccount]:
        """
        Get OAuth account by provider and provider user ID.

        Args:
            db: Database session
            provider: OAuth provider
            provider_user_id: User ID from provider

        Returns:
            OAuthAccount if found, None otherwise
        """
        return db.query(OAuthAccount).filter(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id
        ).first()

    @staticmethod
    def create_oauth_account(
        db: Session,
        oauth_data: OAuthAccountCreate
    ) -> OAuthAccount:
        """
        Create a new OAuth account link.

        Args:
            db: Database session
            oauth_data: OAuth account creation data

        Returns:
            Created OAuthAccount instance
        """
        oauth_account = OAuthAccount(
            user_id=oauth_data.user_id,
            provider=oauth_data.provider,
            provider_user_id=oauth_data.provider_user_id,
            provider_email=oauth_data.provider_email,
            access_token=oauth_data.access_token,
            refresh_token=oauth_data.refresh_token,
            token_expires_at=oauth_data.token_expires_at,
        )

        db.add(oauth_account)
        db.commit()
        db.refresh(oauth_account)
        return oauth_account

    @staticmethod
    def get_or_create_user_from_google(
        db: Session,
        google_info: Dict[str, Any]
    ) -> User:
        """
        Get existing user or create new user from Google OAuth data.

        This implements auto-linking: if a user with the same email exists,
        the Google account is linked to that user.

        Args:
            db: Database session
            google_info: User information from Google

        Returns:
            User instance (existing or newly created)
        """
        provider_user_id = google_info['provider_user_id']
        email = google_info['email']

        # Check if OAuth account already exists
        oauth_account = OAuthService.get_oauth_account(
            db, OAuthProvider.GOOGLE, provider_user_id
        )

        if oauth_account:
            # OAuth account exists, return associated user
            return oauth_account.user

        # OAuth account doesn't exist - check if user with email exists
        existing_user = UserService.get_by_email(db, email)

        if existing_user:
            # User exists - link Google account to existing user
            logger.info(f"Linking Google account to existing user: {email}")

            # Set email as verified since Google verified it
            if not existing_user.is_email_verified:
                existing_user.is_email_verified = True
                db.commit()
                db.refresh(existing_user)

            # Create OAuth account link
            oauth_data = OAuthAccountCreate(
                user_id=existing_user.id,
                provider=OAuthProvider.GOOGLE,
                provider_user_id=provider_user_id,
                provider_email=email,
            )
            OAuthService.create_oauth_account(db, oauth_data)

            return existing_user

        # No existing user - create new user
        logger.info(f"Creating new user from Google OAuth: {email}")

        # Create user directly (bypass UserCreate schema since OAuth users don't need password)
        user = User(
            email=email.lower(),
            hashed_password=None,  # OAuth-only user
            first_name=google_info.get('first_name'),
            last_name=google_info.get('last_name'),
            avatar_url=google_info.get('picture'),
            is_active=True,
            is_email_verified=True,  # Google verified the email
            is_superuser=False,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Create OAuth account link
        oauth_data = OAuthAccountCreate(
            user_id=user.id,
            provider=OAuthProvider.GOOGLE,
            provider_user_id=provider_user_id,
            provider_email=email,
        )
        OAuthService.create_oauth_account(db, oauth_data)

        return user

    @staticmethod
    def link_oauth_to_user(
        db: Session,
        user_id: UUID,
        provider: OAuthProvider,
        provider_user_id: str,
        provider_email: Optional[str] = None
    ) -> OAuthAccount:
        """
        Link an OAuth account to an existing user.

        Args:
            db: Database session
            user_id: User ID to link to
            provider: OAuth provider
            provider_user_id: User ID from provider
            provider_email: Email from provider

        Returns:
            Created OAuthAccount

        Raises:
            ValidationError: If OAuth account already linked to different user
        """
        # Check if OAuth account already exists
        existing = OAuthService.get_oauth_account(db, provider, provider_user_id)

        if existing:
            if existing.user_id == user_id:
                # Already linked to this user
                return existing
            else:
                raise ValidationError(
                    f"{provider.value.title()} account is already linked to another user"
                )

        # Create new OAuth link
        oauth_data = OAuthAccountCreate(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
        )

        return OAuthService.create_oauth_account(db, oauth_data)

    @staticmethod
    def unlink_oauth_from_user(
        db: Session,
        user_id: UUID,
        provider: OAuthProvider
    ) -> bool:
        """
        Unlink an OAuth account from a user.

        Args:
            db: Database session
            user_id: User ID
            provider: OAuth provider to unlink

        Returns:
            True if unlinked, False if not found

        Raises:
            ValidationError: If this is user's only auth method and no password set
        """
        # Get the user
        user = UserService.get_by_id(db, user_id)

        # Find the OAuth account
        oauth_account = db.query(OAuthAccount).filter(
            OAuthAccount.user_id == user_id,
            OAuthAccount.provider == provider
        ).first()

        if not oauth_account:
            return False

        # Check if user has password set
        if not user.hashed_password:
            # User has no password - check if they have other OAuth accounts
            other_oauth_count = db.query(OAuthAccount).filter(
                OAuthAccount.user_id == user_id,
                OAuthAccount.id != oauth_account.id
            ).count()

            if other_oauth_count == 0:
                raise ValidationError(
                    "Cannot unlink last authentication method. Set a password first."
                )

        # Safe to unlink
        db.delete(oauth_account)
        db.commit()
        return True
