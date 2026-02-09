"""
Suggestion Job Service.

Handles database operations for AI suggestion jobs.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.modules.ropa.models.ai_suggestion_job import AISuggestionJob
from app.modules.ropa.enums import ROPAEntityType

logger = logging.getLogger(__name__)


class SuggestionJobService:
    """Service for managing AI suggestion jobs."""
    
    @staticmethod
    def create_job(
        db: Session,
        user_id: UUID,
        tenant_id: UUID,
        entity_type: ROPAEntityType,
        entity_id: UUID,
        field_name: str,
        field_type: str,
        field_label: str,
        request_data: Dict
    ) -> AISuggestionJob:
        """
        Create a new suggestion job.
        
        Args:
            db: Database session
            user_id: User ID
            tenant_id: Tenant ID
            entity_type: Type of ROPA entity (repository, activity, data_element, dpia, risk)
            entity_id: ID of the ROPA entity
            field_name: Field name
            field_type: Field type
            field_label: Field label
            request_data: Request data (form_data, current_value, field_options, parent_context)
            
        Returns:
            Created AISuggestionJob instance
        """
        job = AISuggestionJob(
            user_id=user_id,
            tenant_id=tenant_id,
            entity_type=entity_type.value,
            entity_id=entity_id,
            field_name=field_name,
            field_type=field_type,
            field_label=field_label,
            status="pending",
            request_data=request_data
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info(f"Created suggestion job {job.id} for {entity_type.value} {entity_id}, field {field_name}")
        return job
    
    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[AISuggestionJob]:
        """
        Get a job by ID.
        
        Args:
            db: Database session
            job_id: Job ID
            
        Returns:
            AISuggestionJob instance or None
        """
        return db.query(AISuggestionJob).filter(AISuggestionJob.id == job_id).first()
    
    @staticmethod
    def get_job_by_field(
        db: Session,
        entity_type: ROPAEntityType,
        entity_id: UUID,
        field_name: str,
        status: Optional[str] = None
    ) -> Optional[AISuggestionJob]:
        """
        Get the most recent job for a field.
        
        Args:
            db: Database session
            entity_type: Type of ROPA entity
            entity_id: ID of the ROPA entity
            field_name: Field name
            status: Optional status filter
            
        Returns:
            Most recent AISuggestionJob or None
        """
        query = db.query(AISuggestionJob).filter(
            and_(
                AISuggestionJob.entity_type == entity_type.value,
                AISuggestionJob.entity_id == entity_id,
                AISuggestionJob.field_name == field_name
            )
        )
        
        if status:
            query = query.filter(AISuggestionJob.status == status)
        
        return query.order_by(AISuggestionJob.created_at.desc()).first()
    
    @staticmethod
    def list_jobs(
        db: Session,
        entity_type: Optional[ROPAEntityType] = None,
        entity_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        tenant_id: Optional[UUID] = None,
        field_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[AISuggestionJob]:
        """
        List jobs with optional filters.
        
        Args:
            db: Database session
            entity_type: Optional entity type filter
            entity_id: Optional entity ID filter
            user_id: Optional user ID filter
            tenant_id: Optional tenant ID filter
            field_name: Optional field name filter
            status: Optional status filter
            limit: Maximum number of results
            
        Returns:
            List of AISuggestionJob instances
        """
        query = db.query(AISuggestionJob)
        
        if entity_type:
            query = query.filter(AISuggestionJob.entity_type == entity_type.value)
        if entity_id:
            query = query.filter(AISuggestionJob.entity_id == entity_id)
        if user_id:
            query = query.filter(AISuggestionJob.user_id == user_id)
        if tenant_id:
            query = query.filter(AISuggestionJob.tenant_id == tenant_id)
        if field_name:
            query = query.filter(AISuggestionJob.field_name == field_name)
        if status:
            query = query.filter(AISuggestionJob.status == status)
        
        return query.order_by(AISuggestionJob.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def update_status(
        db: Session,
        job_id: UUID,
        status: str,
        error_message: Optional[str] = None
    ) -> Optional[AISuggestionJob]:
        """
        Update job status.
        
        Args:
            db: Database session
            job_id: Job ID
            status: New status
            error_message: Optional error message
            
        Returns:
            Updated AISuggestionJob or None
        """
        job = SuggestionJobService.get_job(db, job_id)
        if not job:
            return None
        
        job.status = status
        if error_message:
            job.error_message = error_message
        job.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(job)
        
        logger.info(f"Updated job {job_id} status to {status}")
        return job
    
    @staticmethod
    def complete_job(
        db: Session,
        job_id: UUID,
        general_statement: str,
        suggestions: List,
        openai_model: str,
        openai_tokens_used: int,
        openai_cost_usd: float
    ) -> Optional[AISuggestionJob]:
        """
        Mark job as completed with results.
        
        Args:
            db: Database session
            job_id: Job ID
            general_statement: General explanation
            suggestions: List of suggestions
            openai_model: Model used
            openai_tokens_used: Tokens consumed
            openai_cost_usd: Cost in USD
            
        Returns:
            Updated AISuggestionJob or None
        """
        job = SuggestionJobService.get_job(db, job_id)
        if not job:
            return None
        
        job.status = "completed"
        job.general_statement = general_statement
        job.suggestions = suggestions
        job.openai_model = openai_model
        job.openai_tokens_used = openai_tokens_used
        job.openai_cost_usd = Decimal(str(openai_cost_usd))  # Convert to Decimal for precision
        job.completed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(job)
        
        logger.info(f"Completed job {job_id} with {len(suggestions)} suggestions, cost: ${openai_cost_usd}")
        return job
    
    @staticmethod
    def fail_job(
        db: Session,
        job_id: UUID,
        error_message: str
    ) -> Optional[AISuggestionJob]:
        """
        Mark job as failed.
        
        Args:
            db: Database session
            job_id: Job ID
            error_message: Error message
            
        Returns:
            Updated AISuggestionJob or None
        """
        job = SuggestionJobService.get_job(db, job_id)
        if not job:
            return None
        
        job.status = "failed"
        job.error_message = error_message
        job.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(job)
        
        logger.error(f"Failed job {job_id}: {error_message}")
        return job
    
    @staticmethod
    def get_total_cost_by_tenant(db: Session, tenant_id: UUID) -> float:
        """Get total OpenAI cost for a tenant."""
        result = db.query(
            db.func.sum(AISuggestionJob.openai_cost_usd)
        ).filter(
            and_(
                AISuggestionJob.tenant_id == tenant_id,
                AISuggestionJob.status == "completed",
                AISuggestionJob.openai_cost_usd.isnot(None)
            )
        ).scalar()
        
        return float(result) if result else 0.0
    
    @staticmethod
    def get_total_cost_by_user(db: Session, user_id: UUID) -> float:
        """Get total OpenAI cost for a user."""
        result = db.query(
            db.func.sum(AISuggestionJob.openai_cost_usd)
        ).filter(
            and_(
                AISuggestionJob.user_id == user_id,
                AISuggestionJob.status == "completed",
                AISuggestionJob.openai_cost_usd.isnot(None)
            )
        ).scalar()
        
        return float(result) if result else 0.0
    
    @staticmethod
    def get_total_cost_by_entity(
        db: Session,
        entity_type: ROPAEntityType,
        entity_id: UUID
    ) -> float:
        """Get total cost for suggestions on an entity."""
        result = db.query(
            db.func.sum(AISuggestionJob.openai_cost_usd)
        ).filter(
            and_(
                AISuggestionJob.entity_type == entity_type.value,
                AISuggestionJob.entity_id == entity_id,
                AISuggestionJob.status == "completed",
                AISuggestionJob.openai_cost_usd.isnot(None)
            )
        ).scalar()
        
        return float(result) if result else 0.0


