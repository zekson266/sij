"""
Department model for ROPA lookup table.

Represents a department or business unit that can own repositories or be referenced in activities.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    """
    Department model representing a business unit or department.
    
    Used as lookup table for business_owner, collection_sources, data_disclosed_to fields.
    Each department belongs to a tenant.
    """
    
    __tablename__ = "ropa_departments"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Unique constraint: one department per name per tenant
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_department_tenant_name'),
    )
    
    def __repr__(self) -> str:
        """String representation of the department."""
        return f"<Department(id={self.id}, tenant_id={self.tenant_id}, name='{self.name}')>"
