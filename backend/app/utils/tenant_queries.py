"""
Tenant-scoped query helpers.

Provides utilities for automatically scoping database queries to a tenant.
This ensures data isolation in multi-tenant applications.
"""

from typing import TypeVar, Type, Optional
from uuid import UUID

from sqlalchemy.orm import Session, Query
from sqlalchemy import Column

from app.models.tenant import Tenant

# Type variable for SQLAlchemy models
ModelType = TypeVar("ModelType")


def scope_query_to_tenant(
    query: Query,
    tenant_id: UUID,
    tenant_id_column: Optional[Column] = None,
) -> Query:
    """
    Scope a database query to a specific tenant.
    
    This function adds a filter to ensure only data belonging to the tenant
    is returned. This is the core of tenant data isolation.
    
    Args:
        query: SQLAlchemy query object
        tenant_id: Tenant UUID to scope to
        tenant_id_column: Optional explicit tenant_id column (auto-detected if None)
        
    Returns:
        Query scoped to the tenant
    """
    # If tenant_id_column is provided, use it directly
    if tenant_id_column is not None:
        return query.filter(tenant_id_column == tenant_id)
    
    # Try to auto-detect tenant_id column from model
    # This assumes models have a tenant_id attribute
    model = query.column_descriptions[0]["entity"] if query.column_descriptions else None
    
    if model and hasattr(model, "tenant_id"):
        return query.filter(model.tenant_id == tenant_id)
    
    # If no tenant_id found, return query as-is (no scoping)
    # This allows models without tenant_id to work normally
    return query


def get_tenant_scoped_query(
    db: Session,
    model: Type[ModelType],
    tenant_id: UUID,
) -> Query:
    """
    Create a tenant-scoped query for a model.
    
    This is a convenience function that creates a query and automatically
    scopes it to a tenant.
    
    Args:
        db: Database session
        model: SQLAlchemy model class
        tenant_id: Tenant UUID to scope to
        
    Returns:
        Query scoped to the tenant
        
    Example:
        >>> from app.models.user import User
        >>> query = get_tenant_scoped_query(db, User, tenant_id)
        >>> users = query.all()  # Only users for this tenant
    """
    query = db.query(model)
    
    # Check if model has tenant_id attribute
    if hasattr(model, "tenant_id"):
        return query.filter(model.tenant_id == tenant_id)
    
    # If model doesn't have tenant_id, return unscoped query
    # (some models like Tenant itself don't need scoping)
    return query


def ensure_tenant_access(
    db: Session,
    tenant_id: UUID,
    resource_tenant_id: UUID,
) -> bool:
    """
    Ensure a resource belongs to the specified tenant.
    
    This is a security check to prevent cross-tenant data access.
    
    Args:
        db: Database session
        tenant_id: Tenant ID from context
        resource_tenant_id: Tenant ID of the resource being accessed
        
    Returns:
        True if access is allowed, False otherwise
        
    Raises:
        HTTPException: If tenant IDs don't match (security violation)
    """
    from fastapi import HTTPException, status
    
    if tenant_id != resource_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Resource does not belong to your tenant",
        )
    
    return True

