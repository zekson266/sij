"""
Data Element model.

Represents a type of personal data processed in an activity.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DataElement(Base):
    """
    Data Element model representing types of personal data processed.
    
    Each data element belongs to an activity.
    Comprehensive model for GDPR Article 30 compliance.
    
    Attributes:
        id: Unique identifier (UUID)
        processing_activity_id: Foreign key to activities table
        category: Data category (data_category)
        data_elements: Array of data element types (JSONB)
        special_lawful_basis: Special lawful basis for processing (JSONB)
        secondary_use: Whether data is used for secondary purposes (BOOLEAN)
        encryption_in_transit: Whether data is encrypted in transit (BOOLEAN)
        safeguards: Safeguards applied to data (TEXT)
        retention_period_days: Data retention period in days (INTEGER)
        disposition_method: Method of data disposition (TEXT)
        comments: Comments (JSONB)
        data_minimization_justification: Justification for data minimization (TEXT)
        data_accuracy_requirements: Data accuracy requirements (TEXT)
        data_storage_location: Data storage location (JSONB)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "ropa_data_elements"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    processing_activity_id = Column(UUID(as_uuid=True), ForeignKey("ropa_activities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ========== Basic Identification ==========
    category = Column(String(100), nullable=True)  # data_category (e.g., "Contact data", "Identity data")
    
    # ========== Data Elements ==========
    data_elements = Column(JSONB, nullable=True)  # Array of data element types (multi-choice: "Name", "Email", "Phone", etc.)
    special_lawful_basis = Column(JSONB, nullable=True)  # Special lawful basis (multi-choice: "Explicit Consent", "Employment Obligations", etc.)
    secondary_use = Column(Boolean, default=False, nullable=False)  # Whether data is used for secondary purposes
    encryption_in_transit = Column(Boolean, default=False, nullable=False)  # Whether data is encrypted in transit
    safeguards = Column(Text, nullable=True)  # Safeguards applied to data (multiline text)
    retention_period_days = Column(Integer, nullable=True)  # Data retention period in days
    disposition_method = Column(Text, nullable=True)  # Method of data disposition (multiline text)
    comments = Column(JSONB, nullable=True)  # Comments (multi-choice static list, stored as string array)
    data_minimization_justification = Column(Text, nullable=True)  # Justification for data minimization (multiline text)
    data_accuracy_requirements = Column(Text, nullable=True)  # Data accuracy requirements (multiline text)
    data_storage_location = Column(JSONB, nullable=True)  # Data storage location (multi-choice: "On-premise", "Cloud", "Hybrid", "Local Device")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    activity = relationship("Activity", back_populates="data_elements")
    
    def __repr__(self) -> str:
        """String representation of the data element."""
        return f"<DataElement(id={self.id}, processing_activity_id={self.processing_activity_id}, category='{self.category}')>"



