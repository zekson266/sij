"""
System service for ROPA module.

Handles all system-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.system import System
from app.modules.ropa.schemas.system import SystemCreate, SystemUpdate
from app.exceptions import NotFoundError, ConflictError


class SystemService:
    """Service for system operations."""

    @staticmethod
    def create(db: Session, tenant_id: UUID, system_data: SystemCreate) -> System:
        """Create a new system for a tenant."""
        system_dict = system_data.model_dump(exclude_unset=True)
        system_dict['tenant_id'] = tenant_id
        
        system = System(**system_dict)
        
        try:
            db.add(system)
            db.commit()
            db.refresh(system)
            return system
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create system: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, system_id: UUID, tenant_id: UUID) -> System:
        """Get system by ID for a specific tenant."""
        system = db.query(System).filter(
            System.id == system_id,
            System.tenant_id == tenant_id
        ).first()
        
        if not system:
            raise NotFoundError(f"System with ID {system_id} not found")
        
        return system

    @staticmethod
    def list_by_tenant(db: Session, tenant_id: UUID) -> List[System]:
        """List all systems for a tenant."""
        return db.query(System).filter(
            System.tenant_id == tenant_id
        ).order_by(System.name.asc()).all()

    @staticmethod
    def update(
        db: Session,
        system_id: UUID,
        tenant_id: UUID,
        system_data: SystemUpdate
    ) -> System:
        """Update a system."""
        system = SystemService.get_by_id(db, system_id, tenant_id)
        
        update_dict = system_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(system, field, value)
        
        try:
            db.commit()
            db.refresh(system)
            return system
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update system: {str(e)}")

    @staticmethod
    def delete(db: Session, system_id: UUID, tenant_id: UUID) -> None:
        """Delete a system."""
        system = SystemService.get_by_id(db, system_id, tenant_id)
        db.delete(system)
        db.commit()
