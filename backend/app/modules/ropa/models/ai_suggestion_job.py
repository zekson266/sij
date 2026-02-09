"""
AI Suggestion Job model.

Represents a background job for generating AI-powered field suggestions.
Jobs persist across sessions and can be restored after logout/login.
"""

from datetime import datetime
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.modules.ropa.enums import ROPAEntityType


class AISuggestionJob(Base):
    """
    AI Suggestion Job model for tracking AI-powered field suggestions.
    
    Jobs are created when a user requests a suggestion for a form field.
    The job is processed asynchronously by Celery workers, and results
    are stored in the database for persistence across sessions.
    
    Supports multiple ROPA entity types: Repository, Activity, DataElement, DPIA, Risk.
    Uses polymorphic pattern with entity_type + entity_id.
    
    Attributes:
        id: Unique identifier (UUID)
        user_id: Foreign key to users table
        tenant_id: Foreign key to tenants table
        entity_type: Type of ROPA entity (repository, activity, data_element, dpia, risk)
        entity_id: ID of the ROPA entity
        field_name: Name of the field being suggested (e.g., "description")
        field_type: Type of field (text, select, multi-select, boolean, etc.)
        field_label: Human-readable label for the field
        status: Job status (pending, processing, completed, failed)
        error_message: Error message if job failed
        request_data: JSONB field containing form context and field options
        general_statement: AI-generated general explanation
        suggestions: JSONB array of suggested values
        openai_model: OpenAI model used (e.g., "gpt-4o-mini")
        openai_tokens_used: Total tokens consumed
        openai_cost_usd: Cost in USD (stored as Decimal for precision)
        created_at: Creation timestamp
        updated_at: Last update timestamp
        completed_at: Completion timestamp
    """
    
    __tablename__ = "ai_suggestion_jobs"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # User & Tenant context
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Entity reference (polymorphic pattern)
    entity_type = Column(String(50), nullable=False, index=True)  # repository, activity, data_element, dpia, risk
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Field information
    field_name = Column(String(100), nullable=False, index=True)
    field_type = Column(String(50), nullable=False)  # text, select, multi-select, boolean, date, etc.
    field_label = Column(String(255), nullable=False)
    
    # Job status
    status = Column(String(50), nullable=False, index=True)  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Request data (stored for reference/retry)
    request_data = Column(JSONB, nullable=False)  # Contains: form_data, current_value, field_options, parent_context
    
    # Response data (when completed)
    general_statement = Column(Text, nullable=True)
    suggestions = Column(JSONB, nullable=True)  # Array of suggested values
    
    # Cost tracking
    openai_model = Column(String(50), nullable=True)  # gpt-4o-mini, gpt-4o, etc.
    openai_tokens_used = Column(Integer, nullable=True)  # Total tokens (prompt + completion)
    openai_cost_usd = Column(Numeric(10, 6), nullable=True)  # Cost in USD (6 decimal places for precision)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    # Note: One-way relationships to core models - User and Tenant don't have back_populates
    # to maintain core model independence from modules. Use service methods to query jobs.
    user = relationship("User")
    tenant = relationship("Tenant")
    
    # Composite index for efficient queries
    __table_args__ = (
        Index('ix_ai_suggestion_jobs_entity_type_id_field', 'entity_type', 'entity_id', 'field_name'),
    )
    
    def __repr__(self) -> str:
        """String representation of the job."""
        return f"<AISuggestionJob(id={self.id}, entity_type='{self.entity_type}', entity_id={self.entity_id}, field_name='{self.field_name}', status='{self.status}')>"

