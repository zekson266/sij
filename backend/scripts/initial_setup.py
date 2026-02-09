#!/usr/bin/env python3
"""
Initial setup script for creating initial users and tenants.

This script should be run after database migrations are complete.
It creates initial admin users and tenants based on environment variables.

Usage:
    python scripts/initial_setup.py
    OR
    docker compose exec backend python scripts/initial_setup.py

Environment Variables:
    INITIAL_ADMIN_EMAIL: Email for initial admin user (optional)
    INITIAL_ADMIN_PASSWORD: Password for initial admin user (optional)
    INITIAL_ADMIN_FIRST_NAME: First name for initial admin (optional)
    INITIAL_ADMIN_LAST_NAME: Last name for initial admin (optional)
    INITIAL_TENANT_NAME: Name for initial tenant (optional)
    INITIAL_TENANT_EMAIL: Email for initial tenant (optional)
    SKIP_INITIAL_SETUP: Set to "1" to skip setup (optional)
"""

import os
import sys
from uuid import uuid4

# Add parent directory to path to import app modules
# When running in Docker, /app is the working directory
if os.path.exists("/app"):
    sys.path.insert(0, "/app")
else:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from uuid import UUID
from app.database import SessionLocal
from app.services.user import UserService
from app.services.tenant import TenantService
from app.services.tenant_user import TenantUserService
from app.schemas.user import UserCreate
from app.schemas.tenant import TenantCreate
from app.utils.password import hash_password
from app.modules.ropa.services.location import LocationService
from app.modules.ropa.services.department import DepartmentService
from app.modules.ropa.schemas.location import LocationCreate
from app.modules.ropa.schemas.department import DepartmentCreate


def create_initial_admin(db: Session) -> tuple[bool, str]:
    """
    Create initial admin user if it doesn't exist.
    
    Returns:
        (created, message) tuple
    """
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD", "").strip()
    
    if not admin_email or not admin_password:
        return False, "Skipping admin creation (INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD not set)"
    
    # Check if admin already exists
    existing_admin = UserService.get_by_email(db, admin_email)
    if existing_admin:
        return False, f"Admin user already exists: {admin_email}"
    
    # Create admin user
    try:
        admin_user = UserService.create(db, UserCreate(
            email=admin_email,
            password=admin_password,
            first_name=os.getenv("INITIAL_ADMIN_FIRST_NAME", "Admin").strip() or "Admin",
            last_name=os.getenv("INITIAL_ADMIN_LAST_NAME", "User").strip() or "User",
        ))
        
        # Mark as superuser and verified
        admin_user.is_superuser = True
        admin_user.is_email_verified = True
        db.commit()
        db.refresh(admin_user)
        
        return True, f"Admin user created: {admin_email}"
    except Exception as e:
        db.rollback()
        return False, f"Failed to create admin user: {str(e)}"


def create_initial_tenant(db: Session, admin_user_id=None) -> tuple[bool, str]:
    """
    Create initial tenant if it doesn't exist.
    
    Args:
        admin_user_id: Optional admin user ID to add as owner
        
    Returns:
        (created, message) tuple
    """
    tenant_name = os.getenv("INITIAL_TENANT_NAME", "").strip()
    tenant_email = os.getenv("INITIAL_TENANT_EMAIL", "").strip()
    
    if not tenant_name:
        return False, "Skipping tenant creation (INITIAL_TENANT_NAME not set)"
    
    if not tenant_email:
        tenant_email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
        if not tenant_email:
            return False, "Skipping tenant creation (INITIAL_TENANT_EMAIL not set)"
    
    # Check if tenant already exists (by name or slug)
    from app.models.tenant import Tenant
    existing_tenant = db.query(Tenant).filter(
        (Tenant.name == tenant_name) | (Tenant.slug == tenant_name.lower().replace(" ", "-"))
    ).first()
    
    if existing_tenant:
        return False, f"Tenant already exists: {tenant_name}"
    
    # Create tenant
    try:
        tenant = TenantService.create(db, TenantCreate(
            name=tenant_name,
            email=tenant_email,
        ))
        
        # Add admin as owner if provided
        if admin_user_id:
            try:
                TenantUserService.invite_user(
                    db,
                    tenant_id=tenant.id,
                    user_id=admin_user_id,
                    role="owner",
                    inviter_role=None,  # No inviter for initial setup
                )
                return True, f"Tenant created: {tenant_name} (admin added as owner)"
            except Exception as e:
                # Tenant created but failed to add admin
                return True, f"Tenant created: {tenant_name} (failed to add admin: {str(e)})"
        
        return True, f"Tenant created: {tenant_name}"
    except Exception as e:
        db.rollback()
        return False, f"Failed to create tenant: {str(e)}"


def seed_global_locations(db: Session) -> tuple[int, str]:
    """
    Seed global locations (shared across all tenants).
    
    Returns:
        (count, message) tuple - number of locations created
    """
    from app.modules.ropa.models.location import Location
    
    regions_to_create = [
        {"name": "EU", "region": "EU"},
        {"name": "US", "region": "US"},
        {"name": "CA", "region": "CA"},
        {"name": "APAC", "region": "APAC"},
        {"name": "Other", "region": "Other"},
    ]
    countries_to_create = [
        {"name": "United States", "region": "US", "country_code": "US", "parent_region": "US"},
        {"name": "United Kingdom", "region": "EU", "country_code": "GB", "parent_region": "EU"},
        {"name": "Canada", "region": "CA", "country_code": "CA", "parent_region": "CA"},
        {"name": "Australia", "region": "APAC", "country_code": "AU", "parent_region": "APAC"},
    ]

    created_count = 0

    # Seed regions first
    for region_data in regions_to_create:
        existing = db.query(Location).filter(Location.name == region_data["name"]).first()
        if existing:
            continue
        try:
            location_data = LocationCreate(
                name=region_data["name"],
                type="region",
                region=region_data["region"],
            )
            LocationService.create(db, location_data)
            created_count += 1
        except Exception:
            db.rollback()
            continue

    # Load regions for parent mapping
    existing_regions = db.query(Location).filter(Location.type == "region").all()
    regions_by_name = {loc.name: loc for loc in existing_regions}

    # Seed countries
    for country_data in countries_to_create:
        existing = db.query(Location).filter(Location.name == country_data["name"]).first()
        if existing:
            continue
        parent = regions_by_name.get(country_data["parent_region"])
        try:
            location_data = LocationCreate(
                name=country_data["name"],
                type="country",
                region=country_data["region"],
                country_code=country_data["country_code"],
                parent_id=parent.id if parent else None,
            )
            LocationService.create(db, location_data)
            created_count += 1
        except Exception:
            db.rollback()
            continue
    
    if created_count > 0:
        db.commit()
        return created_count, f"Created {created_count} global location(s)"
    return 0, "Global locations already exist"


def seed_tenant_departments(db: Session, tenant_id: UUID) -> tuple[int, str]:
    """
    Seed departments for a tenant.
    
    Args:
        db: Database session
        tenant_id: Tenant UUID
        
    Returns:
        (count, message) tuple - number of departments created
    """
    departments_to_create = [
        {"name": "IT Department", "description": "Information Technology"},
        {"name": "HR Department", "description": "Human Resources"},
        {"name": "Legal Department", "description": "Legal and Compliance"},
        {"name": "Operations", "description": "Business Operations"},
        {"name": "Sales & Marketing", "description": "Sales and Marketing"},
    ]
    
    created_count = 0
    for dept_data in departments_to_create:
        # Check if department already exists for this tenant
        existing = DepartmentService.list_by_tenant(db, tenant_id)
        existing_names = {dept.name for dept in existing}
        if dept_data["name"] in existing_names:
            continue
        
        try:
            department_data = DepartmentCreate(**dept_data)
            DepartmentService.create(db, tenant_id, department_data)
            created_count += 1
        except Exception:
            # Department might already exist, skip
            db.rollback()
            continue
    
    if created_count > 0:
        db.commit()
        return created_count, f"Created {created_count} department(s) for tenant"
    return 0, "Departments already exist for tenant"


def main():
    """Main setup function."""
    # Check if setup should be skipped
    if os.getenv("SKIP_INITIAL_SETUP", "").strip().lower() in ("1", "true", "yes"):
        print("⏭️  Skipping initial setup (SKIP_INITIAL_SETUP is set)")
        return
    
    print("🚀 Starting initial setup...")
    print("=" * 50)
    
    db: Session = SessionLocal()
    
    try:
        # Create initial admin
        print("\n📧 Creating initial admin user...")
        admin_created, admin_message = create_initial_admin(db)
        print(f"   {admin_message}")
        
        admin_user_id = None
        if admin_created:
            admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
            admin_user = UserService.get_by_email(db, admin_email)
            if admin_user:
                admin_user_id = admin_user.id
        
        # Seed global locations (once, before tenant creation)
        print("\n🌍 Seeding global locations...")
        from app.modules.ropa.models.location import Location
        existing_locations = LocationService.get_all(db)
        if not existing_locations:
            loc_count, loc_message = seed_global_locations(db)
            print(f"   {loc_message}")
        else:
            print(f"   Global locations already exist ({len(existing_locations)} locations)")
        
        # Create initial tenant
        print("\n🏢 Creating initial tenant...")
        tenant_created, tenant_message = create_initial_tenant(db, admin_user_id)
        print(f"   {tenant_message}")
        
        # Seed departments for created tenant
        if tenant_created:
            tenant_name = os.getenv("INITIAL_TENANT_NAME", "").strip()
            from app.models.tenant import Tenant
            tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
            if tenant:
                print("\n🏢 Seeding departments for tenant...")
                dept_count, dept_message = seed_tenant_departments(db, tenant.id)
                print(f"   {dept_message}")
        
        print("\n" + "=" * 50)
        print("✅ Initial setup complete!")
        
        if admin_created:
            print(f"\n📝 Admin credentials:")
            print(f"   Email: {os.getenv('INITIAL_ADMIN_EMAIL')}")
            print(f"   Password: {os.getenv('INITIAL_ADMIN_PASSWORD')}")
            print(f"\n⚠️  Please change the admin password after first login!")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

