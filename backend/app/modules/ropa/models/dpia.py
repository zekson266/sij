"""
DPIA (Data Protection Impact Assessment) model.

Represents a DPIA associated with a processing activity.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DPIA(Base):
    """
    DPIA model representing a Data Protection Impact Assessment.
    
    Each DPIA belongs to an activity and can have multiple risks.
    Comprehensive model for GDPR Article 35 compliance.
    
    Attributes:
        id: Unique identifier (UUID)
        processing_activity_id: Foreign key to activities table
        title: DPIA title
        description: DPIA description
        status: DPIA status (e.g., "draft", "in_review", "approved", "rejected")
        necessity_proportionality_assessment: Assessment of necessity and proportionality
        assessor: Person who conducted the assessment
        assessment_date: Date when assessment was completed
        dpo_consultation_required: Whether DPO consultation is required
        dpo_consultation_date: Date when DPO was consulted
        supervisory_authority_consultation_required: Whether supervisory authority consultation is required
        supervisory_authority_consultation_date: Date when supervisory authority was consulted
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "ropa_dpias"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    processing_activity_id = Column(UUID(as_uuid=True), ForeignKey("ropa_activities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ========== Basic Identification ==========
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft", nullable=False, index=True)  # draft, in_review, approved, rejected
    
    # ========== Assessment Details ==========
    necessity_proportionality_assessment = Column(Text, nullable=True)  # Assessment of necessity and proportionality
    assessor = Column(String(255), nullable=True)  # Person who conducted the assessment
    assessment_date = Column(DateTime, nullable=True)  # Date when assessment was completed
    
    # ========== Consultation Requirements ==========
    dpo_consultation_required = Column(Boolean, default=False, nullable=False, index=True)  # Whether DPO consultation is required
    dpo_consultation_date = Column(DateTime, nullable=True)  # Date when DPO was consulted
    supervisory_authority_consultation_required = Column(Boolean, default=False, nullable=False, index=True)  # Whether supervisory authority consultation is required
    supervisory_authority_consultation_date = Column(DateTime, nullable=True)  # Date when supervisory authority was consulted
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    activity = relationship("Activity", back_populates="dpias")
    risks = relationship("Risk", back_populates="dpia", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the DPIA."""
        return f"<DPIA(id={self.id}, processing_activity_id={self.processing_activity_id}, title='{self.title}')>"



