"""
Tenant context extraction utilities.

Provides functions to extract tenant context from various sources:
- Path parameters (tenant_id or tenant_slug in URL) - highest priority
- JWT token (tenant_id in token)
- HTTP headers (X-Tenant-ID, X-Tenant-Slug)
- Domain/subdomain (from Host header) - lowest priority

Following RESTful best practices, path parameters are the primary source of tenant
identification since they are explicit, type-safe, and align with resource-based URLs.
"""

from typing import Optional
from uuid import UUID

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.schemas.auth import TokenData


def extract_tenant_from_token(token_data: Optional[TokenData]) -> Optional[UUID]:
    """
    Extract tenant ID from JWT token.
    
    Args:
        token_data: Decoded token data (may be None)
        
    Returns:
        Tenant UUID if present in token, None otherwise
    """
    if token_data and token_data.tenant_id:
        return token_data.tenant_id
    return None


def extract_tenant_from_headers(request: Request) -> Optional[UUID]:
    """
    Extract tenant ID from HTTP headers.
    
    Checks for:
    - X-Tenant-ID header (UUID)
    - X-Tenant-Slug header (slug, will be resolved to UUID)
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tenant UUID if found, None otherwise
    """
    # Check X-Tenant-ID header
    tenant_id_header = request.headers.get("X-Tenant-ID")
    if tenant_id_header:
        try:
            return UUID(tenant_id_header)
        except ValueError:
            # Invalid UUID format
            return None
    
    # Check X-Tenant-Slug header
    tenant_slug_header = request.headers.get("X-Tenant-Slug")
    if tenant_slug_header:
        # We'll need a DB session to resolve slug to ID
        # This will be handled in get_tenant_context
        return None  # Signal that slug needs resolution
    
    return None


def extract_tenant_from_domain(request: Request, db: Session) -> Optional[UUID]:
    """
    Extract tenant from domain/subdomain.
    
    Checks:
    - Full domain match (e.g., "acme.com" -> tenant with domain="acme.com")
    - Subdomain match (e.g., "acme.example.com" -> tenant with slug="acme")
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        Tenant UUID if found, None otherwise
    """
    # Lazy import to avoid circular dependency
    from app.services.tenant import TenantService
    
    host = request.headers.get("Host", "")
    if not host:
        return None
    
    # Remove port if present
    host = host.split(":")[0].lower()
    
    # Try full domain match first
    tenant = TenantService.get_by_domain(db, host)
    if tenant:
        return tenant.id
    
    # Try subdomain match (e.g., "acme.example.com" -> slug="acme")
    parts = host.split(".")
    if len(parts) >= 2:
        # Assume first part is subdomain
        subdomain = parts[0]
        try:
            tenant = TenantService.get_by_slug(db, subdomain)
            return tenant.id
        except Exception:
            # Tenant not found by slug
            pass
    
    return None


def get_tenant_context(
    request: Request,
    db: Session,
    token_data: Optional[TokenData] = None,
    tenant_id: Optional[UUID] = None,
    tenant_slug: Optional[str] = None,
) -> Optional[Tenant]:
    """
    Get tenant context from multiple sources with priority order.
    
    Following RESTful best practices, path parameters are the highest priority source
    of tenant identification since they are explicit, type-safe, and align with
    resource-based URLs.
    
    Priority (highest to lowest):
    1. Path parameter (tenant_id) - explicit UUID in URL (e.g., /api/tenants/{tenant_id}/...)
    2. Path parameter (tenant_slug) - explicit slug in URL (e.g., /api/tenants/slug/{slug}/...)
    3. JWT token (tenant_id) - from authenticated user's token context
    4. X-Tenant-ID header - explicit header (for API clients)
    5. X-Tenant-Slug header - explicit header (for API clients, resolved to ID)
    6. Domain/subdomain - from Host header (for public tenant pages)
    
    Args:
        request: FastAPI request object
        db: Database session
        token_data: Optional decoded JWT token data
        tenant_id: Optional tenant UUID from path parameter (highest priority)
        tenant_slug: Optional tenant slug from path parameter (second priority)
        
    Returns:
        Tenant instance if found, None otherwise
        
    Raises:
        HTTPException: If tenant is required but not found (only for path parameters)
        
    Example:
        ```python
        # In route handler:
        @router.get("/{tenant_id}/members")
        def list_members(
            tenant_id: UUID,  # Path parameter
            tenant: Tenant = Depends(get_current_tenant),  # Uses tenant_id
        ):
            # tenant is already resolved from tenant_id
            ...
        ```
    """
    # Lazy import to avoid circular dependency
    from app.services.tenant import TenantService
    from app.exceptions import NotFoundError
    
    tenant: Optional[Tenant] = None
    
    # Priority 1: Path parameter tenant_id (explicit UUID in URL)
    # This is the highest priority as it's the most explicit and RESTful
    if tenant_id:
        try:
            tenant = TenantService.get_by_id(db, tenant_id)
            return tenant
        except NotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with ID '{tenant_id}' not found",
            )
        except Exception as e:
            # Unexpected error, re-raise as 500
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving tenant: {str(e)}",
            )
    
    # Priority 2: Path parameter tenant_slug (explicit slug in URL)
    if tenant_slug:
        try:
            tenant = TenantService.get_by_slug(db, tenant_slug)
            return tenant
        except NotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with slug '{tenant_slug}' not found",
            )
        except Exception as e:
            # Unexpected error, re-raise as 500
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving tenant: {str(e)}",
            )
    
    # Priority 3: JWT token (tenant_id from authenticated user's context)
    # Useful for cross-tenant operations or when tenant is implicit
    tenant_id_from_token = extract_tenant_from_token(token_data)
    if tenant_id_from_token:
        try:
            tenant = TenantService.get_by_id(db, tenant_id_from_token)
            return tenant
        except Exception:
            # Token has invalid tenant_id, continue to next source
            pass
    
    # Priority 4: X-Tenant-ID header (for API clients)
    tenant_id_header = request.headers.get("X-Tenant-ID")
    if tenant_id_header:
        try:
            tenant_id = UUID(tenant_id_header)
            tenant = TenantService.get_by_id(db, tenant_id)
            return tenant
        except (ValueError, Exception):
            # Invalid UUID or tenant not found, continue
            pass
    
    # Priority 5: X-Tenant-Slug header (for API clients)
    tenant_slug_header = request.headers.get("X-Tenant-Slug")
    if tenant_slug_header:
        try:
            tenant = TenantService.get_by_slug(db, tenant_slug_header)
            return tenant
        except Exception:
            # Tenant not found, continue
            pass
    
    # Priority 6: Domain/subdomain (for public tenant pages)
    tenant_id_from_domain = extract_tenant_from_domain(request, db)
    if tenant_id_from_domain:
        try:
            tenant = TenantService.get_by_id(db, tenant_id_from_domain)
            return tenant
        except Exception:
            pass
    
    # No tenant context found
    return None

