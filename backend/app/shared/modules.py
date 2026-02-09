"""
Module enablement utilities.

Functions to check and manage module enablement for tenants.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends

from app.models.tenant import Tenant
from app.dependencies import get_current_tenant
from app.database import get_db


def is_module_enabled(tenant: Tenant, module: str) -> bool:
    """
    Check if a module is enabled for a tenant.
    
    Args:
        tenant: Tenant instance
        module: Module name (e.g., 'booker', 'ropa')
        
    Returns:
        True if module is enabled, False otherwise
    """
    if not tenant.settings:
        return False
    
    modules = tenant.settings.get("modules", {})
    return modules.get(module, False)


def require_module(module: str):
    """
    FastAPI dependency factory to require a module to be enabled.
    
    Usage:
        @router.get("/{tenant_id}/endpoint")
        def my_endpoint(
            tenant_id: UUID,
            tenant: Tenant = Depends(require_module("booker")),
            db: Session = Depends(get_db)
        ):
            ...
    
    Args:
        module: Module name to check
        
    Returns:
        Dependency function that raises 404 if module not enabled
    """
    def check_module(
        tenant_id: UUID,
        db: Session = Depends(get_db)
    ) -> Tenant:
        """
        Check if module is enabled for the tenant.
        
        Args:
            tenant_id: Tenant UUID from path parameter
            db: Database session
            
        Returns:
            Tenant instance if module is enabled
            
        Raises:
            HTTPException: 404 if tenant not found or module not enabled
        """
        from app.services.tenant import TenantService
        from app.exceptions import NotFoundError
        
        # Get tenant
        try:
            tenant = TenantService.get_by_id(db, tenant_id)
        except NotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check if module is enabled
        if not is_module_enabled(tenant, module):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module}' is not enabled for this tenant"
            )
        return tenant
    
    return check_module


def get_enabled_modules(tenant: Tenant) -> list[str]:
    """
    Get list of enabled modules for a tenant.
    
    Args:
        tenant: Tenant instance
        
    Returns:
        List of enabled module names
    """
    if not tenant.settings:
        return []
    
    modules = tenant.settings.get("modules", {})
    return [name for name, enabled in modules.items() if enabled]

