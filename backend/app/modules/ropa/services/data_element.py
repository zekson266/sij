"""
Data Element service for ROPA module.

Handles all data element-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.data_element import DataElement
from app.modules.ropa.schemas.data_element import DataElementCreate, DataElementUpdate
from app.modules.ropa.services.activity import ActivityService
from app.exceptions import NotFoundError, ConflictError


class DataElementService:
    """Service for data element operations."""

    @staticmethod
    def create(
        db: Session,
        tenant_id: UUID,
        data_element_data: DataElementCreate
    ) -> DataElement:
        """
        Create a new data element for an activity.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID (for security check)
            data_element_data: Data element creation data
            
        Returns:
            Created DataElement instance
            
        Raises:
            NotFoundError: If activity not found or doesn't belong to tenant
            ConflictError: If data element creation fails
        """
        # Verify activity belongs to tenant
        ActivityService.get_by_id(db, data_element_data.processing_activity_id, tenant_id)
        
        data_element_dict = data_element_data.model_dump(exclude_unset=True)
        data_element = DataElement(**data_element_dict)
        
        try:
            db.add(data_element)
            db.commit()
            db.refresh(data_element)
            return data_element
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create data element: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, data_element_id: UUID, tenant_id: UUID) -> DataElement:
        """
        Get data element by ID for a specific tenant.
        
        Args:
            db: Database session
            data_element_id: Data element UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            DataElement instance
            
        Raises:
            NotFoundError: If data element not found or doesn't belong to tenant
        """
        data_element = db.query(DataElement).join(
            DataElement.activity
        ).join(
            DataElement.activity.property.mapper.class_.repository
        ).filter(
            DataElement.id == data_element_id,
            DataElement.activity.has(
                DataElement.activity.property.mapper.class_.repository.has(tenant_id=tenant_id)
            )
        ).first()
        
        # Simpler approach: get and verify through activity
        data_element = db.query(DataElement).filter(
            DataElement.id == data_element_id
        ).first()
        
        if not data_element:
            raise NotFoundError(f"Data element with ID {data_element_id} not found")
        
        # Verify it belongs to tenant through activity
        ActivityService.get_by_id(db, data_element.processing_activity_id, tenant_id)
        
        return data_element

    @staticmethod
    def list_by_activity(
        db: Session,
        activity_id: UUID,
        tenant_id: UUID
    ) -> List[DataElement]:
        """
        List all data elements for an activity.
        
        Args:
            db: Database session
            activity_id: Activity UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            List of DataElement instances
        """
        # Verify activity belongs to tenant
        ActivityService.get_by_id(db, activity_id, tenant_id)
        
        return db.query(DataElement).filter(
            DataElement.processing_activity_id == activity_id
        ).order_by(DataElement.created_at.desc()).all()

    @staticmethod
    def update(
        db: Session,
        data_element_id: UUID,
        tenant_id: UUID,
        data_element_data: DataElementUpdate
    ) -> DataElement:
        """
        Update a data element.
        
        Args:
            db: Database session
            data_element_id: Data element UUID
            tenant_id: Tenant UUID (for security check)
            data_element_data: Data element update data
            
        Returns:
            Updated DataElement instance
            
        Raises:
            NotFoundError: If data element not found
        """
        data_element = DataElementService.get_by_id(db, data_element_id, tenant_id)
        
        # Update fields
        update_data = data_element_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(data_element, field, value)
        
        try:
            db.commit()
            db.refresh(data_element)
            return data_element
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update data element: {str(e)}")

    @staticmethod
    def delete(db: Session, data_element_id: UUID, tenant_id: UUID) -> None:
        """
        Delete a data element.
        
        Args:
            db: Database session
            data_element_id: Data element UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If data element not found
        """
        data_element = DataElementService.get_by_id(db, data_element_id, tenant_id)
        
        try:
            db.delete(data_element)
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to delete data element: {str(e)}")



