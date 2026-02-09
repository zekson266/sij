"""
Processing Activity model.

Represents a data processing activity in the ROPA.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.modules.ropa.enums import ProcessingFrequency


class Activity(Base):
    """
    Processing Activity model representing what processing is done with data.
    
    Each activity belongs to a repository and can have multiple data elements and DPIAs.
    Comprehensive model for GDPR Article 30 compliance.
    
    Attributes:
        id: Unique identifier (UUID)
        data_repository_id: Foreign key to repositories table
        processing_activity_name: Activity name
        purpose: Purpose of processing
        lawful_basis: Lawful basis for processing (e.g., "Consent", "Contract")
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "ropa_activities"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    data_repository_id = Column(UUID(as_uuid=True), ForeignKey("ropa_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ========== Basic Identification ==========
    processing_activity_name = Column(String(255), nullable=False, index=True)
    purpose = Column(String(255), nullable=True)  # Purpose of processing
    lawful_basis = Column(String(100), nullable=True)  # Lawful basis (e.g., "Consent", "Contract")
    
    # ========== New Fields (Part 1) ==========
    legitimate_interest_assessment = Column(Text, nullable=True)  # Assessment of legitimate interests
    data_subject_type = Column(JSONB, nullable=True)  # Array of data subject types (string array)
    collection_sources = Column(JSONB, nullable=True)  # Array of department UUIDs (UUID array from ropa_departments)
    data_disclosed_to = Column(JSONB, nullable=True)  # Array of department UUIDs (UUID array from ropa_departments)
    jit_notice = Column(Text, nullable=True)  # Just-in-time notice information
    consent_process = Column(Text, nullable=True)  # Consent process description
    
    # ========== New Fields (Part 2) ==========
    automated_decision = Column(Boolean, default=False, nullable=False)  # Whether automated decision-making is used
    data_subject_rights = Column(Text, nullable=True)  # Data subject rights information (multiline text)
    dpia_required = Column(Boolean, default=False, nullable=False)  # Whether DPIA is required
    dpia_comment = Column(Text, nullable=True)  # DPIA comments/notes (multiline text)
    dpia_file = Column(String(500), nullable=True)  # DPIA file path (deferred file upload implementation)
    dpia_gpc_link = Column(String(500), nullable=True)  # DPIA GPC web link (URL string)
    children_data = Column(Text, nullable=True)  # Children data information (multiline text)
    parental_consent = Column(Text, nullable=True)  # Parental consent information (multiline text)
    
    # ========== New Fields (Part 3) ==========
    comments = Column(JSONB, nullable=True)  # Comments (multi-choice static list, stored as string array)
    data_retention_policy = Column(String(500), nullable=True)  # Data retention policy web link (URL string)
    processing_frequency = Column(String(50), nullable=True)  # Processing frequency (enum: "Real-time", "Daily", "Weekly", "Monthly", "Ad-hoc")
    legal_jurisdiction = Column(JSONB, nullable=True)  # Legal jurisdiction (multi-choice static list: "GDPR", "PIPEDA", "CCPA", "HIPAA", "LGPD", "Other", stored as string array)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    repository = relationship("Repository", back_populates="activities")
    data_elements = relationship("DataElement", back_populates="activity", cascade="all, delete-orphan")
    dpias = relationship("DPIA", primaryjoin="Activity.id == DPIA.processing_activity_id", back_populates="activity", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the activity."""
        return f"<Activity(id={self.id}, data_repository_id={self.data_repository_id}, processing_activity_name='{self.processing_activity_name}')>"



