"""
Activity service for ROPA module.

Handles all activity-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.activity import Activity
from app.modules.ropa.schemas.activity import ActivityCreate, ActivityUpdate
from app.modules.ropa.services.repository import RepositoryService
from app.exceptions import NotFoundError, ConflictError


class ActivityService:
    """Service for activity operations."""

    @staticmethod
    def create(
        db: Session,
        tenant_id: UUID,
        activity_data: ActivityCreate
    ) -> Activity:
        """
        Create a new activity for a repository.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID (for security check)
            activity_data: Activity creation data
            
        Returns:
            Created Activity instance
            
        Raises:
            NotFoundError: If repository not found or doesn't belong to tenant
            ConflictError: If activity creation fails
        """
        # Verify repository belongs to tenant
        RepositoryService.get_by_id(db, activity_data.data_repository_id, tenant_id)
        
        # Get all fields from the schema (exclude unset to only get provided values)
        activity_dict = activity_data.model_dump(exclude_unset=True)
        
        # Create activity with all provided fields
        activity = Activity(**activity_dict)
        
        try:
            db.add(activity)
            db.commit()
            db.refresh(activity)
            return activity
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create activity: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, activity_id: UUID, tenant_id: UUID) -> Activity:
        """
        Get activity by ID for a specific tenant.
        
        Args:
            db: Database session
            activity_id: Activity UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            Activity instance
            
        Raises:
            NotFoundError: If activity not found or doesn't belong to tenant
        """
        activity = db.query(Activity).join(
            Activity.repository
        ).filter(
            Activity.id == activity_id,
            Activity.repository.has(tenant_id=tenant_id)
        ).first()
        
        if not activity:
            raise NotFoundError(f"Activity with ID {activity_id} not found")
        
        return activity

    @staticmethod
    def list_by_repository(
        db: Session,
        data_repository_id: UUID,
        tenant_id: UUID
    ) -> List[Activity]:
        """
        List all activities for a repository.
        
        Args:
            db: Database session
            data_repository_id: Repository UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            List of Activity instances
        """
        # Verify repository belongs to tenant
        RepositoryService.get_by_id(db, data_repository_id, tenant_id)
        
        return db.query(Activity).filter(
            Activity.data_repository_id == data_repository_id
        ).order_by(Activity.created_at.desc()).all()

    @staticmethod
    def update(
        db: Session,
        activity_id: UUID,
        tenant_id: UUID,
        activity_data: ActivityUpdate
    ) -> Activity:
        """
        Update an activity.
        
        Args:
            db: Database session
            activity_id: Activity UUID
            tenant_id: Tenant UUID (for security check)
            activity_data: Activity update data
            
        Returns:
            Updated Activity instance
            
        Raises:
            NotFoundError: If activity not found
        """
        activity = ActivityService.get_by_id(db, activity_id, tenant_id)
        
        # Update fields
        update_data = activity_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(activity, field, value)
        
        try:
            db.commit()
            db.refresh(activity)
            return activity
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update activity: {str(e)}")

    @staticmethod
    def delete(db: Session, activity_id: UUID, tenant_id: UUID) -> None:
        """
        Delete an activity (cascade deletes data elements and DPIAs).
        
        Args:
            db: Database session
            activity_id: Activity UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If activity not found
        """
        activity = ActivityService.get_by_id(db, activity_id, tenant_id)
        
        try:
            db.delete(activity)
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to delete activity: {str(e)}")



