#!/usr/bin/env python3
"""
Create or update a superuser account.

Usage:
    python scripts/create_superuser.py
    OR
    docker compose exec backend python scripts/create_superuser.py

This script will prompt for email and password, or use environment variables.
"""

import os
import sys
import getpass

# Add parent directory to path to import app modules
if os.path.exists("/app"):
    sys.path.insert(0, "/app")
else:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.user import UserService
from app.schemas.user import UserCreate
from app.utils.password import hash_password


def create_or_update_superuser(email: str, password: str, first_name: str = None, last_name: str = None):
    """Create or update a superuser account."""
    db: Session = SessionLocal()
    
    try:
        # Check if user exists
        existing_user = UserService.get_by_email(db, email)
        
        if existing_user:
            # Update existing user to superuser
            print(f"User {email} already exists. Updating to superuser...")
            existing_user.is_superuser = True
            existing_user.is_active = True
            existing_user.is_email_verified = True
            existing_user.hashed_password = hash_password(password)
            if first_name:
                existing_user.first_name = first_name
            if last_name:
                existing_user.last_name = last_name
            db.commit()
            db.refresh(existing_user)
            print(f"✅ Updated {email} to superuser")
            return existing_user
        else:
            # Create new superuser
            print(f"Creating new superuser: {email}...")
            user = UserService.create(db, UserCreate(
                email=email,
                password=password,
                first_name=first_name or "Admin",
                last_name=last_name or "User",
            ))
            user.is_superuser = True
            user.is_email_verified = True
            db.commit()
            db.refresh(user)
            print(f"✅ Created superuser: {email}")
            return user
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


def main():
    """Main function."""
    print("=" * 50)
    print("Create/Update Superuser")
    print("=" * 50)
    
    # Get email from environment or prompt
    email = os.getenv("SUPERUSER_EMAIL", "").strip()
    if not email:
        email = input("Enter email: ").strip()
        if not email:
            print("❌ Email is required")
            sys.exit(1)
    
    # Get password from environment or prompt
    password = os.getenv("SUPERUSER_PASSWORD", "").strip()
    if not password:
        password = getpass.getpass("Enter password: ")
        if not password:
            print("❌ Password is required")
            sys.exit(1)
        password_confirm = getpass.getpass("Confirm password: ")
        if password != password_confirm:
            print("❌ Passwords do not match")
            sys.exit(1)
    
    # Get optional name fields
    first_name = os.getenv("SUPERUSER_FIRST_NAME", "").strip() or None
    last_name = os.getenv("SUPERUSER_LAST_NAME", "").strip() or None
    
    if not first_name:
        first_name = input("Enter first name (optional, press Enter to skip): ").strip() or None
    if not last_name:
        last_name = input("Enter last name (optional, press Enter to skip): ").strip() or None
    
    # Create or update superuser
    user = create_or_update_superuser(email, password, first_name, last_name)
    
    print("\n" + "=" * 50)
    print("✅ Success!")
    print("=" * 50)
    print(f"Email: {user.email}")
    print(f"Superuser: {user.is_superuser}")
    print(f"Active: {user.is_active}")
    print(f"Email Verified: {user.is_email_verified}")
    print("\nYou can now login with these credentials.")


if __name__ == "__main__":
    main()

