"""
System model for ROPA lookup table.

Represents a system that can interface with repositories.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class System(Base):
    """
    System model representing a system that interfaces with repositories.
    
    Used as lookup table for system_interfaces field in repositories.
    Each system belongs to a tenant.
    """
    
    __tablename__ = "ropa_systems"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    system_type = Column(String(100), nullable=True)  # e.g., "API", "Database", "File System"
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Unique constraint: one system per name per tenant
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_system_tenant_name'),
    )
    
    def __repr__(self) -> str:
        """String representation of the system."""
        return f"<System(id={self.id}, tenant_id={self.tenant_id}, name='{self.name}')>"
