"""
DPIA service for ROPA module.

Handles all DPIA-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.dpia import DPIA
from app.modules.ropa.schemas.dpia import DPIACreate, DPIAUpdate
from app.modules.ropa.services.activity import ActivityService
from app.exceptions import NotFoundError, ConflictError


class DPIAService:
    """Service for DPIA operations."""

    @staticmethod
    def create(
        db: Session,
        tenant_id: UUID,
        dpia_data: DPIACreate
    ) -> DPIA:
        """
        Create a new DPIA for an activity.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID (for security check)
            dpia_data: DPIA creation data
            
        Returns:
            Created DPIA instance
            
        Raises:
            NotFoundError: If activity not found or doesn't belong to tenant
            ConflictError: If DPIA creation fails
        """
        # Verify activity belongs to tenant
        ActivityService.get_by_id(db, dpia_data.processing_activity_id, tenant_id)
        
        dpia = DPIA(
            processing_activity_id=dpia_data.processing_activity_id,
            title=dpia_data.title,
            description=dpia_data.description,
            status=dpia_data.status,
        )
        
        try:
            db.add(dpia)
            db.commit()
            db.refresh(dpia)
            return dpia
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create DPIA: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, dpia_id: UUID, tenant_id: UUID) -> DPIA:
        """
        Get DPIA by ID for a specific tenant.
        
        Args:
            db: Database session
            dpia_id: DPIA UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            DPIA instance
            
        Raises:
            NotFoundError: If DPIA not found or doesn't belong to tenant
        """
        dpia = db.query(DPIA).filter(
            DPIA.id == dpia_id
        ).first()
        
        if not dpia:
            raise NotFoundError(f"DPIA with ID {dpia_id} not found")
        
        # Verify it belongs to tenant through activity
        ActivityService.get_by_id(db, dpia.processing_activity_id, tenant_id)
        
        return dpia

    @staticmethod
    def list_by_activity(
        db: Session,
        activity_id: UUID,
        tenant_id: UUID
    ) -> List[DPIA]:
        """
        List all DPIAs for an activity.
        
        Args:
            db: Database session
            activity_id: Activity UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            List of DPIA instances
        """
        # Verify activity belongs to tenant
        ActivityService.get_by_id(db, activity_id, tenant_id)
        
        return db.query(DPIA).filter(
            DPIA.processing_activity_id == activity_id
        ).order_by(DPIA.created_at.desc()).all()

    @staticmethod
    def update(
        db: Session,
        dpia_id: UUID,
        tenant_id: UUID,
        dpia_data: DPIAUpdate
    ) -> DPIA:
        """
        Update a DPIA.
        
        Args:
            db: Database session
            dpia_id: DPIA UUID
            tenant_id: Tenant UUID (for security check)
            dpia_data: DPIA update data
            
        Returns:
            Updated DPIA instance
            
        Raises:
            NotFoundError: If DPIA not found
        """
        dpia = DPIAService.get_by_id(db, dpia_id, tenant_id)
        
        # Update fields
        update_data = dpia_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(dpia, field, value)
        
        try:
            db.commit()
            db.refresh(dpia)
            return dpia
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update DPIA: {str(e)}")

    @staticmethod
    def delete(db: Session, dpia_id: UUID, tenant_id: UUID) -> None:
        """
        Delete a DPIA (cascade deletes risks).
        
        Args:
            db: Database session
            dpia_id: DPIA UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If DPIA not found
        """
        dpia = DPIAService.get_by_id(db, dpia_id, tenant_id)
        
        try:
            db.delete(dpia)
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to delete DPIA: {str(e)}")



