"""
OAuth API routes.

Handles Google OAuth authentication flow.
"""

from fastapi import APIRouter, Depends, Response, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.oauth import GoogleOAuthRequest
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse
from app.schemas.common import SuccessResponse
from app.services.oauth import OAuthService
from app.utils.jwt import create_access_token
from app.routers.auth import set_auth_cookie
from app.exceptions import AuthenticationError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/auth",
    tags=["oauth"],
)


@router.post("/google", response_model=TokenResponse)
def google_oauth_login(
    oauth_request: GoogleOAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate or register user with Google OAuth.

    This endpoint handles the complete Google OAuth flow:
    1. Verifies the Google credential (JWT token)
    2. Checks if user exists (by email or OAuth account)
    3. If user exists: logs them in and links Google account if not already linked
    4. If user doesn't exist: creates new user with Google account linked
    5. Returns access token and sets HttpOnly cookie

    Auto-linking: If a user with the same email exists, the Google account
    is automatically linked to that existing user.

    Args:
        oauth_request: Google OAuth credential from frontend
        response: FastAPI Response object for setting cookies
        db: Database session

    Returns:
        TokenResponse with access token and user information
    """
    try:
        # Verify Google token and get user info
        google_info = OAuthService.verify_google_token(oauth_request.credential)

        # Get or create user from Google info (with auto-linking)
        user = OAuthService.get_or_create_user_from_google(db, google_info)

        # Create access token
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
        )

        # Set secure HttpOnly cookie
        set_auth_cookie(response, access_token)

        logger.info(f"Google OAuth successful for user: {user.email}")

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except AuthenticationError as e:
        logger.warning(f"Google OAuth authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error in Google OAuth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Google authentication",
        )
