"""
Tenant service for business logic and data access.

Handles all tenant-related database operations and business rules.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.tenant import Tenant
from app.exceptions import NotFoundError, ConflictError, ValidationError


class TenantService:
    """Service for tenant operations."""
    
    # Default booking service configuration
    DEFAULT_BOOKING_SERVICE = {
        "value": "consultation",
        "label": "Consultation",
        "is_default": True
    }
    
    # Default modules enabled for new tenants
    DEFAULT_MODULES = {
        "booker": True,  # Booking/appointment module
        "ropa": True,    # Record of Processing Activities module
    }
    
    @staticmethod
    def _get_default_booking_services() -> List[Dict[str, Any]]:
        """
        Get default booking services configuration.
        
        Returns:
            List of default service configurations
        """
        return [TenantService.DEFAULT_BOOKING_SERVICE.copy()]
    
    @staticmethod
    def _ensure_default_modules(settings: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ensure default modules are enabled in tenant settings.
        If modules not configured, enable default modules.
        
        Args:
            settings: Current tenant settings dict (may be None)
            
        Returns:
            Updated settings dict with modules configuration
        """
        if settings is None:
            settings = {}
        
        # If modules not configured, add default modules
        if "modules" not in settings:
            settings["modules"] = TenantService.DEFAULT_MODULES.copy()
        else:
            # Ensure all default modules are present (merge with existing)
            for module, enabled in TenantService.DEFAULT_MODULES.items():
                if module not in settings["modules"]:
                    settings["modules"][module] = enabled
        
        return settings
    
    @staticmethod
    def _ensure_booking_services(settings: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ensure booking services exist in tenant settings.
        If not present, add default service configuration.
        
        Args:
            settings: Current tenant settings dict (may be None)
            
        Returns:
            Updated settings dict with booking.services
        """
        if settings is None:
            settings = {}
        
        # Ensure booking key exists
        if "booking" not in settings:
            settings["booking"] = {}
        
        # If services not configured, add default
        if "services" not in settings["booking"] or not settings["booking"]["services"]:
            settings["booking"]["services"] = TenantService._get_default_booking_services()
        
        return settings
    
    @staticmethod
    def get_booking_services(tenant: Tenant) -> List[Dict[str, Any]]:
        """
        Get booking services for a tenant.
        
        Args:
            tenant: Tenant instance
            
        Returns:
            List of service configurations with keys: value, label, is_default
        """
        if not tenant.settings or not isinstance(tenant.settings, dict):
            return TenantService._get_default_booking_services()
        
        module_config = tenant.settings.get("module_config", {})
        if not isinstance(module_config, dict):
            return TenantService._get_default_booking_services()
        
        booking_config = module_config.get("booking", {})
        if not isinstance(booking_config, dict):
            return TenantService._get_default_booking_services()
        
        services = booking_config.get("services")
        if not services:
            return TenantService._get_default_booking_services()
        
        return services
    
    @staticmethod
    def get_default_service(tenant: Tenant) -> Optional[Dict[str, Any]]:
        """
        Get the default service for a tenant.
        
        Args:
            tenant: Tenant instance
            
        Returns:
            Default service config dict or None if no default
        """
        services = TenantService.get_booking_services(tenant)
        
        # Find explicit default
        for service in services:
            if service.get("is_default", False):
                return service
        
        # If only one service, it's the default
        if len(services) == 1:
            return services[0]
        
        return None
    
    @staticmethod
    def create(db: Session, tenant_data) -> Tenant:
        """
        Create a new tenant.
        
        Args:
            db: Database session
            tenant_data: Tenant creation data
            
        Returns:
            Created Tenant instance
            
        Raises:
            ConflictError: If slug or domain already exists
            ValidationError: If validation fails
        """
        # Check if slug already exists
        existing = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
        if existing:
            raise ConflictError(f"Tenant with slug '{tenant_data.slug}' already exists")
        
        # Check if domain already exists (if provided)
        if tenant_data.domain:
            existing = db.query(Tenant).filter(Tenant.domain == tenant_data.domain).first()
            if existing:
                raise ConflictError(f"Tenant with domain '{tenant_data.domain}' already exists")
        
        # Auto-generate slug if not provided
        slug = tenant_data.slug
        if not slug:
            # Generate slug from name
            import re
            slug = tenant_data.name.lower().strip()
            slug = re.sub(r'[^a-z0-9]+', '-', slug)
            slug = re.sub(r'-+', '-', slug).strip('-')
            
            # Ensure uniqueness
            base_slug = slug
            counter = 1
            while db.query(Tenant).filter(Tenant.slug == slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1
        
        # Ensure default modules and booking services are configured in settings
        settings = tenant_data.settings
        settings = TenantService._ensure_default_modules(settings)
        settings = TenantService._ensure_booking_services(settings)
        
        # Create tenant
        tenant = Tenant(
            name=tenant_data.name,
            slug=slug,
            domain=tenant_data.domain,
            email=tenant_data.email,
            phone=tenant_data.phone,
            subscription_tier=tenant_data.subscription_tier,
            tenant_metadata=tenant_data.tenant_metadata,
            settings=settings,
        )
        
        try:
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            return tenant
        except IntegrityError as e:
            db.rollback()
            if "slug" in str(e).lower():
                raise ConflictError(f"Tenant with slug '{slug}' already exists")
            elif "domain" in str(e).lower():
                raise ConflictError(f"Tenant with domain '{tenant_data.domain}' already exists")
            raise ConflictError("Failed to create tenant due to constraint violation")
    
    @staticmethod
    def get_by_id(db: Session, tenant_id: UUID) -> Tenant:
        """
        Get tenant by ID.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            
        Returns:
            Tenant instance
            
        Raises:
            NotFoundError: If tenant not found
        """
        tenant = db.query(Tenant).filter(
            Tenant.id == tenant_id,
            Tenant.deleted_at.is_(None)  # Exclude soft-deleted tenants
        ).first()
        
        if not tenant:
            raise NotFoundError(f"Tenant with ID {tenant_id} not found")
        
        return tenant
    
    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Tenant:
        """
        Get tenant by slug.
        
        Args:
            db: Database session
            slug: Tenant slug
            
        Returns:
            Tenant instance
            
        Raises:
            NotFoundError: If tenant not found
        """
        tenant = db.query(Tenant).filter(
            Tenant.slug == slug,
            Tenant.deleted_at.is_(None)
        ).first()
        
        if not tenant:
            raise NotFoundError(f"Tenant with slug '{slug}' not found")
        
        return tenant
    
    @staticmethod
    def get_by_domain(db: Session, domain: str) -> Optional[Tenant]:
        """
        Get tenant by domain.
        
        Args:
            db: Database session
            domain: Tenant domain
            
        Returns:
            Tenant instance or None if not found
        """
        return db.query(Tenant).filter(
            Tenant.domain == domain,
            Tenant.deleted_at.is_(None)
        ).first()
    
    @staticmethod
    def list_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        is_verified: Optional[bool] = None,
    ) -> List[Tenant]:
        """
        List all tenants with optional filters.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            is_active: Filter by active status
            is_verified: Filter by verified status
            
        Returns:
            List of Tenant instances
        """
        query = db.query(Tenant).filter(Tenant.deleted_at.is_(None))
        
        if is_active is not None:
            query = query.filter(Tenant.is_active == is_active)
        
        if is_verified is not None:
            query = query.filter(Tenant.is_verified == is_verified)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update(db: Session, tenant_id: UUID, tenant_data) -> Tenant:
        """
        Update tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            tenant_data: Tenant update data
            
        Returns:
            Updated Tenant instance
            
        Raises:
            NotFoundError: If tenant not found
            ConflictError: If slug or domain conflict
        """
        tenant = TenantService.get_by_id(db, tenant_id)
        
        # Update fields
        update_data = tenant_data.model_dump(exclude_unset=True)
        
        # Check slug uniqueness if being updated
        if "slug" in update_data:
            existing = db.query(Tenant).filter(
                Tenant.slug == update_data["slug"],
                Tenant.id != tenant_id
            ).first()
            if existing:
                raise ConflictError(f"Tenant with slug '{update_data['slug']}' already exists")
        
        # Check domain uniqueness if being updated
        if "domain" in update_data and update_data["domain"]:
            existing = db.query(Tenant).filter(
                Tenant.domain == update_data["domain"],
                Tenant.id != tenant_id
            ).first()
            if existing:
                raise ConflictError(f"Tenant with domain '{update_data['domain']}' already exists")
        
        # Apply updates
        for field, value in update_data.items():
            # Special handling for settings: merge instead of replace
            if field == "settings" and tenant.settings and isinstance(value, dict):
                # Merge new settings with existing settings
                merged_settings = {**(tenant.settings or {}), **value}
                setattr(tenant, field, merged_settings)
            else:
                setattr(tenant, field, value)
        
        try:
            db.commit()
            db.refresh(tenant)
            return tenant
        except IntegrityError as e:
            db.rollback()
            if "slug" in str(e).lower():
                raise ConflictError("Slug already exists")
            elif "domain" in str(e).lower():
                raise ConflictError("Domain already exists")
            raise ConflictError("Failed to update tenant due to constraint violation")
    
    @staticmethod
    def get_ropa_settings(tenant: Tenant) -> Dict[str, Any]:
        """
        Get ROPA settings from tenant.
        
        Args:
            tenant: Tenant instance
            
        Returns:
            Dictionary with ROPA settings (defaults, ai_preferences)
        """
        if not tenant.settings or not isinstance(tenant.settings, dict):
            return {}
        
        module_config = tenant.settings.get("module_config", {})
        if not isinstance(module_config, dict):
            return {}
        
        ropa_config = module_config.get("ropa", {})
        if isinstance(ropa_config, dict):
            return ropa_config
        
        return {}
    
    @staticmethod
    def get_company_context(tenant: Tenant) -> Dict[str, Any]:
        """
        Get company context from tenant metadata.
        
        Args:
            tenant: Tenant instance
            
        Returns:
            Dictionary with company context information
        """
        if not tenant.tenant_metadata:
            return {}
        
        return tenant.tenant_metadata.get("company", {})
    
    @staticmethod
    def delete(db: Session, tenant_id: UUID, soft_delete: bool = True) -> None:
        """
        Delete tenant (soft delete by default).
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            soft_delete: If True, soft delete (set deleted_at). If False, hard delete.
            
        Raises:
            NotFoundError: If tenant not found
        """
        tenant = TenantService.get_by_id(db, tenant_id)
        
        if soft_delete:
            from datetime import datetime
            tenant.deleted_at = datetime.utcnow()
            db.commit()
        else:
            db.delete(tenant)
            db.commit()

