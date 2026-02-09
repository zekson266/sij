"""
Location model for ROPA lookup table.

Represents a geographic location that can be referenced in repositories.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.modules.ropa.enums import LocationType
from app.modules.ropa.models.enum_utils import create_enum_column


class Location(Base):
    """
    Location model representing a geographic location.
    
    Used as lookup table for geographic location fields in repositories.
    Global locations shared across all tenants (where repositories store data).
    """
    
    __tablename__ = "ropa_locations"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False, unique=True)  # Global uniqueness
    type = create_enum_column(LocationType, nullable=False, index=True)
    country_code = Column(String(10), nullable=True)  # ISO country code (countries only)
    region = Column(String(100), nullable=True)  # Region label (e.g., "EU", "APAC")
    parent_id = Column(UUID(as_uuid=True), ForeignKey("ropa_locations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    parent = relationship("Location", remote_side="Location.id")

    def __repr__(self) -> str:
        """String representation of the location."""
        return f"<Location(id={self.id}, name='{self.name}')>"
