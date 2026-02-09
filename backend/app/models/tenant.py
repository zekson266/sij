"""
Tenant model.

Represents a tenant/organization/company in the multi-tenant system.
Each tenant is isolated and has its own data, users, and settings.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class Tenant(Base):
    """
    Tenant model representing an organization/company.
    
    Tenants are isolated entities in the multi-tenant system.
    Each tenant can have multiple users and its own data.
    
    Attributes:
        id: Unique identifier (UUID)
        name: Tenant name (e.g., "Acme Corp")
        slug: URL-friendly unique identifier (e.g., "acme-corp")
        domain: Optional custom domain
        email: Contact email
        phone: Optional contact phone
        is_active: Whether tenant is active
        is_verified: Whether tenant is verified
        subscription_tier: Subscription level (free, pro, enterprise, etc.)
        timezone: Tenant's timezone (IANA format, e.g., "America/New_York", "Europe/Paris")
        metadata: Flexible JSONB field for tenant-specific data
        settings: JSONB field for tenant configuration
        created_at: Creation timestamp
        updated_at: Last update timestamp
        deleted_at: Soft delete timestamp (optional)
    """
    
    __tablename__ = "tenants"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Basic information
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    domain = Column(String(255), nullable=True, unique=True, index=True)
    
    # Contact information
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    
    # Status flags
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False, index=True)
    
    # Subscription and configuration
    subscription_tier = Column(String(50), default="free", nullable=False, index=True)
    timezone = Column(String(50), default="UTC", nullable=False, index=True)  # IANA timezone (e.g., "America/New_York")
    tenant_metadata = Column("metadata", JSONB, nullable=True)  # Flexible tenant-specific data (stored as 'metadata' in DB)
    settings = Column(JSONB, nullable=True)  # Tenant configuration
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
    
    def __repr__(self) -> str:
        """String representation of the tenant."""
        return f"<Tenant(id={self.id}, name='{self.name}', slug='{self.slug}')>"

