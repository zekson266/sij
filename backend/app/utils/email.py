"""
Email sending utilities.

Handles sending emails for verification, password reset, and other notifications.
Supports SMTP with TLS/SSL.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """
    Send an email via SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional, auto-generated from HTML if not provided)
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.SMTP_ENABLED:
        logger.warning(f"SMTP disabled - would send email to {to_email} with subject: {subject}")
        logger.debug(f"Email body: {html_body[:200]}...")
        return False
    
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        
        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, "plain")
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)
        
        # Connect to SMTP server
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        
        # Authenticate and send
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_verification_email(
    to_email: str,
    verification_token: str,
    user_name: Optional[str] = None,
) -> bool:
    """
    Send email verification email.
    
    Args:
        to_email: User email address
        verification_token: Verification token
        user_name: Optional user name for personalization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    verification_url = f"https://{settings.DOMAIN_NAME}/verify-email?token={verification_token}"
    
    subject = "Verify your email address"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .button:hover {{ background-color: #0056b3; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Verify Your Email Address</h2>
            <p>Hello{f' {user_name}' if user_name else ''},</p>
            <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
            <p><a href="{verification_url}" class="button">Verify Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""
    Verify Your Email Address
    
    Hello{f' {user_name}' if user_name else ''},
    
    Thank you for registering! Please verify your email address by visiting:
    {verification_url}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, you can safely ignore this email.
    """
    
    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(
    to_email: str,
    reset_token: str,
    user_name: Optional[str] = None,
) -> bool:
    """
    Send password reset email.
    
    Args:
        to_email: User email address
        reset_token: Password reset token
        user_name: Optional user name for personalization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    reset_url = f"https://{settings.DOMAIN_NAME}/reset-password?token={reset_token}"
    
    subject = "Reset your password"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .button:hover {{ background-color: #c82333; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Reset Your Password</h2>
            <p>Hello{f' {user_name}' if user_name else ''},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <p><a href="{reset_url}" class="button">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <div class="warning">
                <p><strong>Important:</strong> This link will expire in 1 hour.</p>
            </div>
            <div class="footer">
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""
    Reset Your Password
    
    Hello{f' {user_name}' if user_name else ''},
    
    We received a request to reset your password. Visit this link to reset it:
    {reset_url}
    
    Important: This link will expire in 1 hour.
    
    If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    """
    
    return send_email(to_email, subject, html_body, text_body)


def send_invitation_email(
    to_email: str,
    invitation_token: str,
    tenant_name: str,
    inviter_name: Optional[str] = None,
    role: str = "member",
) -> bool:
    """
    Send tenant invitation email.
    
    Args:
        to_email: Recipient email address
        invitation_token: Invitation token for acceptance link
        tenant_name: Name of the tenant/organization
        inviter_name: Optional name of person sending invitation
        role: Role being assigned (member, admin, etc.)
        
    Returns:
        True if email sent successfully, False otherwise
    """
    invitation_url = f"https://{settings.DOMAIN_NAME}/accept-invitation?token={invitation_token}"
    
    subject = f"Invitation to join {tenant_name}"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .button:hover {{ background-color: #0056b3; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            .info-box {{ background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>You've been invited!</h2>
            <p>Hello,</p>
            <p>
                {f'<strong>{inviter_name}</strong> has' if inviter_name else 'You have been'} 
                invited to join <strong>{tenant_name}</strong> as a <strong>{role}</strong>.
            </p>
            <div class="info-box">
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>If you already have an account, click the button below to accept the invitation</li>
                    <li>If you don't have an account yet, you can register and the invitation will be automatically linked</li>
                </ul>
            </div>
            <p><a href="{invitation_url}" class="button">Accept Invitation</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{invitation_url}">{invitation_url}</a></p>
            <p>This invitation will expire in 7 days.</p>
            <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""
    You've been invited!
    
    Hello,
    
    {f'{inviter_name} has' if inviter_name else 'You have been'} 
    invited to join {tenant_name} as a {role}.
    
    What happens next?
    - If you already have an account, visit the link below to accept the invitation
    - If you don't have an account yet, you can register and the invitation will be automatically linked
    
    Accept invitation: {invitation_url}
    
    This invitation will expire in 7 days.
    
    If you didn't expect this invitation, you can safely ignore this email.
    """
    
    return send_email(to_email, subject, html_body, text_body)











