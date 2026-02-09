"""
Data Repository model.

Represents a data repository (database, cloud storage, etc.) in the ROPA.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.modules.ropa.models.enum_utils import create_enum_column
from app.modules.ropa.enums import (
    RepositoryStatus,
    DataFormat,
    TransferMechanism,
    DerogationType,
    CrossBorderSafeguards,
    Certification,
    InterfaceType,
)


class Repository(Base):
    """
    Data Repository model representing where data is stored.
    
    Each repository belongs to a tenant and can have multiple activities.
    Comprehensive model for GDPR Article 30 compliance.
    """
    
    __tablename__ = "ropa_repositories"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ========== Basic Identification ==========
    data_repository_name = Column(String(255), nullable=False, index=True)
    data_repository_description = Column(Text, nullable=True)
    external_vendor = Column(String(255), nullable=True)
    business_owner = Column(UUID(as_uuid=True), ForeignKey("ropa_departments.id", ondelete="SET NULL"), nullable=True, index=True)
    data_format = create_enum_column(DataFormat, nullable=True)
    
    # ========== Geographic & Location ==========
    geographical_location_ids = Column(JSONB, nullable=True)  # UUID array from ropa_locations (type=region)
    access_location_ids = Column(JSONB, nullable=True)  # UUID array from ropa_locations (type=country)
    
    # ========== Cross-Border Transfers ==========
    transfer_mechanism = create_enum_column(TransferMechanism, nullable=True)
    derogation_type = create_enum_column(DerogationType, nullable=True)
    cross_border_safeguards = create_enum_column(CrossBorderSafeguards, nullable=True)
    cross_border_transfer_detail = Column(String(255), nullable=True)
    
    # ========== Compliance & Certification ==========
    gdpr_compliant = Column(Boolean, default=False, nullable=False, index=True)
    dpa_url = Column(String(500), nullable=True)  # DPA reference/URL
    dpa_file = Column(String(500), nullable=True)  # File path (deferred implementation)
    vendor_gdpr_compliance = Column(Boolean, nullable=True)
    certification = create_enum_column(Certification, nullable=True)
    
    # ========== Data & Records ==========
    record_count = Column(Integer, nullable=True)  # Validation: >= 0
    
    # ========== System Interfaces ==========
    system_interfaces = Column(JSONB, nullable=True)  # UUID array from ropa_systems table
    interface_type = create_enum_column(InterfaceType, nullable=True)
    interface_location_ids = Column(JSONB, nullable=True)  # UUID array from ropa_locations (type=region)
    
    # ========== Data Recipients ==========
    data_recipients = Column(String(255), nullable=True)
    sub_processors = Column(String(255), nullable=True)
    
    # ========== Operational Status ==========
    status = create_enum_column(RepositoryStatus, default=RepositoryStatus.ACTIVE, nullable=False, index=True)
    
    # ========== Additional Metadata ==========
    comments = Column(JSONB, nullable=True)  # Comments (merged from tags and notes)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    activities = relationship("Activity", back_populates="repository", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the repository."""
        return f"<Repository(id={self.id}, tenant_id={self.tenant_id}, data_repository_name='{self.data_repository_name}')>"

