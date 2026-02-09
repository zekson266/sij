"""
Department service for ROPA module.

Handles all department-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.department import Department
from app.modules.ropa.schemas.department import DepartmentCreate, DepartmentUpdate
from app.exceptions import NotFoundError, ConflictError


class DepartmentService:
    """Service for department operations."""

    @staticmethod
    def create(db: Session, tenant_id: UUID, department_data: DepartmentCreate) -> Department:
        """
        Create a new department for a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            department_data: Department creation data
            
        Returns:
            Created Department instance
            
        Raises:
            ConflictError: If department creation fails
        """
        # Convert Pydantic model to dict and add tenant_id
        department_dict = department_data.model_dump(exclude_unset=True)
        department_dict['tenant_id'] = tenant_id
        
        department = Department(**department_dict)
        
        try:
            db.add(department)
            db.commit()
            db.refresh(department)
            return department
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create department: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, department_id: UUID, tenant_id: UUID) -> Department:
        """
        Get department by ID for a specific tenant.
        
        Args:
            db: Database session
            department_id: Department UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            Department instance
            
        Raises:
            NotFoundError: If department not found or doesn't belong to tenant
        """
        department = db.query(Department).filter(
            Department.id == department_id,
            Department.tenant_id == tenant_id
        ).first()
        
        if not department:
            raise NotFoundError(f"Department with ID {department_id} not found")
        
        return department

    @staticmethod
    def list_by_tenant(db: Session, tenant_id: UUID) -> List[Department]:
        """
        List all departments for a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            
        Returns:
            List of Department instances
        """
        return db.query(Department).filter(
            Department.tenant_id == tenant_id
        ).order_by(Department.name.asc()).all()

    @staticmethod
    def update(
        db: Session,
        department_id: UUID,
        tenant_id: UUID,
        department_data: DepartmentUpdate
    ) -> Department:
        """
        Update a department.
        
        Args:
            db: Database session
            department_id: Department UUID
            tenant_id: Tenant UUID (for security check)
            department_data: Department update data
            
        Returns:
            Updated Department instance
            
        Raises:
            NotFoundError: If department not found
            ConflictError: If update fails
        """
        department = DepartmentService.get_by_id(db, department_id, tenant_id)
        
        # Update fields
        update_dict = department_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(department, field, value)
        
        try:
            db.commit()
            db.refresh(department)
            return department
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update department: {str(e)}")

    @staticmethod
    def delete(db: Session, department_id: UUID, tenant_id: UUID) -> None:
        """
        Delete a department.
        
        Args:
            db: Database session
            department_id: Department UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If department not found
        """
        department = DepartmentService.get_by_id(db, department_id, tenant_id)
        db.delete(department)
        db.commit()
