"""
Risk model.

Represents a risk identified in a DPIA.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Risk(Base):
    """
    Risk model representing a risk identified in a DPIA.
    
    Each risk belongs to a DPIA.
    Comprehensive model for GDPR Article 35 DPIA risk assessment.
    
    Attributes:
        id: Unique identifier (UUID)
        dpia_id: Foreign key to dpias table
        title: Risk title
        description: Risk description
        severity: Inherent risk severity (e.g., "low", "medium", "high", "critical")
        likelihood: Inherent risk likelihood (e.g., "low", "medium", "high")
        residual_severity: Residual severity after mitigation
        residual_likelihood: Residual likelihood after mitigation
        mitigation: Mitigation measures
        risk_owner: Person responsible for managing the risk
        risk_status: Risk status (e.g., "open", "mitigated", "accepted", "closed")
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "ropa_risks"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    dpia_id = Column(UUID(as_uuid=True), ForeignKey("ropa_dpias.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ========== Basic Identification ==========
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # ========== Risk Assessment ==========
    severity = Column(String(50), nullable=True, index=True)  # Inherent severity: low, medium, high, critical
    likelihood = Column(String(50), nullable=True)  # Inherent likelihood: low, medium, high
    residual_severity = Column(String(50), nullable=True)  # Residual severity after mitigation
    residual_likelihood = Column(String(50), nullable=True)  # Residual likelihood after mitigation
    
    # ========== Risk Management ==========
    mitigation = Column(Text, nullable=True)  # Mitigation measures
    risk_owner = Column(String(255), nullable=True)  # Person responsible for managing the risk
    risk_status = Column(String(50), nullable=True, index=True)  # Status: open, mitigated, accepted, closed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    dpia = relationship("DPIA", back_populates="risks")
    
    def __repr__(self) -> str:
        """String representation of the risk."""
        return f"<Risk(id={self.id}, dpia_id={self.dpia_id}, title='{self.title}')>"



