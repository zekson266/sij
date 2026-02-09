"""
Authentication API routes.

Handles user registration, login, and token management.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.tenant_user import TenantUser
from app.models.tenant_invitation import TenantInvitation, InvitationStatus
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    VerifyEmailRequest, ResendVerificationRequest,
    PasswordResetRequest, PasswordResetConfirm
)
from app.schemas.user import UserResponse
from app.schemas.common import SuccessResponse
from app.services.user import UserService
from app.services.tenant_user import TenantUserService
from app.utils.jwt import create_access_token
from app.utils.tokens import (
    create_verification_token, use_verification_token,
    invalidate_user_tokens
)
from app.utils.email import send_verification_email, send_password_reset_email
from app.models.verification_token import TokenType
from app.exceptions import ConflictError, AuthenticationError, NotFoundError, ValidationError
from app.config import settings

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"],
)

# Rate limiter instance (will be initialized in main.py)
limiter = Limiter(key_func=get_remote_address)


def set_auth_cookie(response: Response, token: str) -> None:
    """
    Set secure HttpOnly authentication cookie.
    
    Args:
        response: FastAPI Response object
        token: JWT access token to store in cookie
    """
    response.set_cookie(
        key="access_token",
        value=token,
        domain=settings.cookie_domain,
        httponly=True,  # Prevent XSS attacks
        secure=settings.COOKIE_SECURE,  # HTTPS only in production
        samesite=settings.COOKIE_SAMESITE,  # CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert minutes to seconds
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """
    Clear authentication cookie.
    
    Args:
        response: FastAPI Response object
    """
    response.delete_cookie(
        key="access_token",
        domain=settings.cookie_domain,
        path="/",
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post("/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")  # 5 registration attempts per minute per IP
def register(
    request: Request,
    register_data: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    Creates a new user account and sends email verification.
    The user must verify their email before logging in.

    Returns:
        SuccessResponse with confirmation message
    """
    try:
        # Convert RegisterRequest to UserCreate
        from app.schemas.user import UserCreate
        user_data = UserCreate(
            email=register_data.email,
            password=register_data.password,
            first_name=register_data.first_name,
            last_name=register_data.last_name,
            phone=register_data.phone,
        )

        # Create user (is_email_verified=False by default)
        user = UserService.create(db, user_data)

        # Auto-link pending invitations for this email
        # Find all pending invitations for this email across all tenants
        from app.services.tenant_invitation import TenantInvitationService
        from app.services.tenant import TenantService
        from app.models.tenant_invitation import TenantInvitation, InvitationStatus
        
        linked_tenants = []
        
        # Find all pending invitations for this email
        pending_invitations = db.query(TenantInvitation).filter(
            TenantInvitation.email == user.email.lower(),
            TenantInvitation.status == InvitationStatus.PENDING,
        ).all()
        
        for invitation in pending_invitations:
            # Check if invitation is still valid
            if invitation.is_valid():
                try:
                    tenant_user = TenantInvitationService.accept_invitation(
                        db,
                        invitation.id,
                        user.id,
                    )
                    if tenant_user:
                        tenant = TenantService.get_by_id(db, invitation.tenant_id)
                        linked_tenants.append({
                            "tenant_id": str(tenant.id),
                            "tenant_name": tenant.name,
                            "role": tenant_user.role,
                        })
                except Exception:
                    # Skip if already linked or other error
                    pass

        # Create verification token
        verification_token = create_verification_token(
            db=db,
            user_id=user.id,
            token_type=TokenType.EMAIL_VERIFICATION,
            expires_in_hours=24,
        )

        # Send verification email
        user_name = f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else None
        email_sent = send_verification_email(
            to_email=user.email,
            verification_token=verification_token.token,
            user_name=user_name,
        )

        # Return success message
        message = "Registration successful! Please check your email to verify your account."
        if linked_tenants:
            tenant_names = ", ".join([t["tenant_name"] for t in linked_tenants])
            message += f" You have been automatically added to: {tenant_names}."

        return SuccessResponse(
            message=message,
            data={
                "email": user.email,
                "email_sent": email_sent,
                "linked_tenants": linked_tenants,
            }
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e.message),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user",
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")  # 5 login attempts per minute per IP (prevents brute force)
def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    tenant_id: Optional[UUID] = Query(None, description="Optional tenant ID to include in token context"),
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return access token.
    
    Optionally accepts a tenant_id query parameter to include tenant context
    in the token. The user must be a member of the specified tenant.
    Sets an HttpOnly cookie for cross-subdomain authentication.
    
    Args:
        login_data: Login credentials (email and password)
        response: FastAPI Response object for setting cookies
        tenant_id: Optional tenant ID to include in token context
        
    Returns:
        TokenResponse with access token and user information
    """
    # Authenticate user
    user = UserService.authenticate(
        db,
        email=login_data.email,
        password=login_data.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # If tenant_id provided, verify user is a member and get role
    tenant_user = None
    if tenant_id:
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db,
                tenant_id=tenant_id,
                user_id=user.id,
            )
            
            if not tenant_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tenant membership is inactive",
                )
        except Exception:
            # User is not a member of this tenant, continue without tenant context
            tenant_user = None
    
    # Create access token
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        tenant_id=tenant_user.tenant_id if tenant_user else None,
        role=tenant_user.role if tenant_user else None,
    )
    
    # Set secure HttpOnly cookie
    set_auth_cookie(response, access_token)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        tenant_id=tenant_user.tenant_id if tenant_user else None,
        role=tenant_user.role if tenant_user else None,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")  # 30 refresh attempts per minute (more lenient for valid users)
def refresh_token(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[UUID] = Query(None, description="Optional tenant ID to switch context"),
    db: Session = Depends(get_db),
):
    """
    Refresh the current user's access token.
    
    Optionally accepts a tenant_id query parameter to switch tenant context.
    The user must be a member of the specified tenant.
    Sets an HttpOnly cookie for cross-subdomain authentication.
    
    Args:
        response: FastAPI Response object for setting cookies
        current_user: Current authenticated user (from token)
        tenant_id: Optional tenant ID to include in new token context
        
    Returns:
        TokenResponse with new access token
    """
    # If tenant_id provided, verify user is a member and get role
    tenant_user = None
    if tenant_id:
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db,
                tenant_id=tenant_id,
                user_id=current_user.id,
            )
            
            if not tenant_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tenant membership is inactive",
                )
        except Exception:
            # User is not a member of this tenant
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this tenant",
            )
    
    # Create new access token
    access_token = create_access_token(
        user_id=current_user.id,
        email=current_user.email,
        tenant_id=tenant_user.tenant_id if tenant_user else None,
        role=tenant_user.role if tenant_user else None,
    )
    
    # Set secure HttpOnly cookie
    set_auth_cookie(response, access_token)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
        tenant_id=tenant_user.tenant_id if tenant_user else None,
        role=tenant_user.role if tenant_user else None,
    )


@router.post("/logout", response_model=SuccessResponse)
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    """
    Logout user by clearing authentication cookie.
    
    Args:
        response: FastAPI Response object for clearing cookies
        current_user: Current authenticated user (from token)
        
    Returns:
        SuccessResponse indicating successful logout
    """
    # Clear authentication cookie
    clear_auth_cookie(response)
    
    return SuccessResponse(
        message="Logged out successfully"
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information.
    
    Returns:
        UserResponse with current user information
    """
    return UserResponse.model_validate(current_user)


@router.get("/tenants", response_model=list)
def get_user_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all tenants the current user belongs to.
    
    Returns:
        List of tenant-user relationships with tenant information
    """
    from app.schemas.tenant_user import TenantUserResponse
    from app.models.tenant import Tenant
    from app.utils.rbac import get_user_permissions
    
    tenant_users = TenantUserService.list_user_tenants(
        db,
        user_id=current_user.id,
        is_active=True,
    )
    
    # Enrich with tenant information
    result = []
    for tu in tenant_users:
        tenant = db.query(Tenant).filter(Tenant.id == tu.tenant_id).first()
        if tenant:
            tenant_user_data = TenantUserResponse.model_validate(tu).model_dump()
            tenant_user_data["effective_permissions"] = sorted(get_user_permissions(tu))
            result.append({
                "tenant_user": TenantUserResponse(**tenant_user_data),
                "tenant": {
                    "id": tenant.id,
                    "name": tenant.name,
                    "slug": tenant.slug,
                    "domain": tenant.domain,
                }
            })
    
    return result


@router.post("/verify-email", response_model=SuccessResponse)
def verify_email(
    verify_data: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """
    Verify user email address using verification token.
    
    Args:
        verify_data: Email verification token
        
    Returns:
        SuccessResponse indicating email was verified
    """
    # Get and use token
    verification_token = use_verification_token(
        db,
        token=verify_data.token,
        token_type=TokenType.EMAIL_VERIFICATION,
    )
    
    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    
    # Verify user email
    user = UserService.verify_email(db, verification_token.user_id)
    
    return SuccessResponse(
        message="Email verified successfully",
        data={"user_id": str(user.id), "email": user.email}
    )


@router.post("/resend-verification", response_model=SuccessResponse)
def resend_verification(
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Resend email verification token.
    
    Invalidates existing unused tokens and creates a new one.
    
    Args:
        resend_data: User email address
        
    Returns:
        SuccessResponse (token is sent via email in production)
    """
    # Get user by email
    user = UserService.get_by_email(db, resend_data.email)
    
    if not user:
        # Don't reveal if user exists (security best practice)
        return SuccessResponse(
            message="If the email exists, a verification link has been sent"
        )
    
    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )
    
    # Invalidate existing tokens
    invalidate_user_tokens(db, user.id, TokenType.EMAIL_VERIFICATION)
    
    # Create new token
    verification_token = create_verification_token(
        db,
        user_id=user.id,
        token_type=TokenType.EMAIL_VERIFICATION,
        expires_in_hours=24,
    )
    
    # Send verification email
    user_name = f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else None
    email_sent = send_verification_email(
        to_email=user.email,
        verification_token=verification_token.token,
        user_name=user_name,
    )
    
    response_data = {}
    if not email_sent:
        # In development/testing, include token in response if email sending failed
        response_data["token"] = verification_token.token
        response_data["note"] = "Email sending disabled or failed - token included for testing"
    
    return SuccessResponse(
        message="Verification email sent" if email_sent else "Verification token created (email sending disabled)",
        data=response_data
    )


@router.post("/forgot-password", response_model=SuccessResponse)
@limiter.limit("3/hour")  # 3 password reset requests per hour per IP
def forgot_password(
    request: Request,
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request password reset.
    
    Creates a password reset token and sends it via email.
    
    Args:
        reset_data: User email address
        
    Returns:
        SuccessResponse (token is sent via email in production)
    """
    # Get user by email
    user = UserService.get_by_email(db, reset_data.email)
    
    if not user:
        # Don't reveal if user exists (security best practice)
        return SuccessResponse(
            message="If the email exists, a password reset link has been sent"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive",
        )
    
    # Invalidate existing tokens
    invalidate_user_tokens(db, user.id, TokenType.PASSWORD_RESET)
    
    # Create new token
    reset_token = create_verification_token(
        db,
        user_id=user.id,
        token_type=TokenType.PASSWORD_RESET,
        expires_in_hours=1,  # Password reset tokens expire in 1 hour
    )
    
    # Send password reset email
    user_name = f"{user.first_name} {user.last_name}".strip() if user.first_name or user.last_name else None
    email_sent = send_password_reset_email(
        to_email=user.email,
        reset_token=reset_token.token,
        user_name=user_name,
    )
    
    response_data = {}
    if not email_sent:
        # In development/testing, include token in response if email sending failed
        response_data["token"] = reset_token.token
        response_data["note"] = "Email sending disabled or failed - token included for testing"
    
    return SuccessResponse(
        message="Password reset email sent" if email_sent else "Password reset token created (email sending disabled)",
        data=response_data
    )


@router.post("/reset-password", response_model=SuccessResponse)
def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """
    Reset password using reset token.
    
    Args:
        reset_data: Reset token and new password
        
    Returns:
        SuccessResponse indicating password was reset
    """
    # Get and use token
    verification_token = use_verification_token(
        db,
        token=reset_data.token,
        token_type=TokenType.PASSWORD_RESET,
    )
    
    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    # Update user password
    from app.schemas.user import UserUpdate
    user = UserService.update(
        db,
        user_id=verification_token.user_id,
        user_data=UserUpdate(password=reset_data.new_password),
    )
    
    return SuccessResponse(
        message="Password reset successfully",
        data={"user_id": str(user.id), "email": user.email}
    )


@router.get("/invitation/{token}", response_model=dict)
def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Get invitation details by token (public endpoint).
    
    Used to display invitation information before accepting.
    Does not require authentication.
    
    Returns:
        Invitation details including tenant name, role, and status
    """
    from app.services.tenant_invitation import TenantInvitationService
    from app.services.tenant import TenantService
    
    invitation = TenantInvitationService.get_by_token(db, token)
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )
    
    # Get tenant details
    tenant = TenantService.get_by_id(db, invitation.tenant_id)
    
    return {
        "invitation_id": str(invitation.id),
        "tenant_id": str(invitation.tenant_id),
        "tenant_name": tenant.name,
        "email": invitation.email,
        "role": invitation.role,
        "status": invitation.status.value,
        "expires_at": invitation.expires_at.isoformat(),
        "created_at": invitation.created_at.isoformat(),
    }


@router.post("/invitation/{token}/accept", response_model=SuccessResponse)
def accept_invitation(
    token: str,
    response: Response,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Accept an invitation by token.
    
    If user is authenticated, accepts immediately.
    If user is not authenticated, redirects to login/register.
    
    Returns:
        SuccessResponse with tenant information
    """
    from app.services.tenant_invitation import TenantInvitationService
    from app.services.tenant import TenantService
    
    invitation = TenantInvitationService.get_by_token(db, token)
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )
    
    # If user is not authenticated, they need to login/register first
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to accept invitation. Please login or register first.",
        )
    
    # Verify email matches
    if current_user.email.lower() != invitation.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is for a different email address",
        )
    
    # Accept the invitation
    tenant_user = TenantInvitationService.accept_invitation(
        db,
        invitation.id,
        current_user.id,
    )
    
    # Get tenant details
    tenant = TenantService.get_by_id(db, invitation.tenant_id)
    
    # Optionally create token with tenant context and set cookie
    from app.services.tenant_user import TenantUserService
    tenant_user_relationship = TenantUserService.get_by_tenant_and_user(
        db,
        invitation.tenant_id,
        current_user.id,
    )
    
    access_token = create_access_token(
        user_id=current_user.id,
        email=current_user.email,
        tenant_id=invitation.tenant_id,
        role=tenant_user_relationship.role,
    )
    set_auth_cookie(response, access_token)
    
    return SuccessResponse(
        message=f"Invitation accepted! You are now a {invitation.role} of {tenant.name}.",
        data={
            "tenant_id": str(tenant.id),
            "tenant_name": tenant.name,
            "role": invitation.role,
        }
    )

