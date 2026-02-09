"""
Repository service for ROPA module.

Handles all repository-related database operations and business rules.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.repository import Repository
from app.modules.ropa.schemas.repository import RepositoryCreate, RepositoryUpdate
from app.exceptions import NotFoundError, ConflictError


class RepositoryService:
    """Service for repository operations."""

    @staticmethod
    def _normalize_uuid_arrays(repository_dict: dict) -> dict:
        """Convert UUID objects to strings for JSONB UUID arrays."""
        uuid_array_fields = [
            "geographical_location_ids",
            "access_location_ids",
            "interface_location_ids",
            "system_interfaces",
        ]
        for field in uuid_array_fields:
            if field in repository_dict and repository_dict[field] is not None:
                repository_dict[field] = [str(item) for item in repository_dict[field]]
        return repository_dict

    @staticmethod
    def create(db: Session, tenant_id: UUID, repository_data: RepositoryCreate) -> Repository:
        """
        Create a new repository for a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            repository_data: Repository creation data
            
        Returns:
            Created Repository instance
            
        Raises:
            ConflictError: If repository creation fails
        """
        # Convert Pydantic model to dict and add tenant_id
        repository_dict = repository_data.model_dump(exclude_unset=True)
        repository_dict = RepositoryService._normalize_uuid_arrays(repository_dict)
        repository_dict['tenant_id'] = tenant_id
        
        repository = Repository(**repository_dict)
        
        try:
            db.add(repository)
            db.commit()
            db.refresh(repository)
            return repository
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create repository: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, repository_id: UUID, tenant_id: UUID) -> Repository:
        """
        Get repository by ID for a specific tenant.
        
        Args:
            db: Database session
            repository_id: Repository UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            Repository instance
            
        Raises:
            NotFoundError: If repository not found or doesn't belong to tenant
        """
        repository = db.query(Repository).filter(
            Repository.id == repository_id,
            Repository.tenant_id == tenant_id
        ).first()
        
        if not repository:
            raise NotFoundError(f"Repository with ID {repository_id} not found")
        
        return repository

    @staticmethod
    def list_by_tenant(db: Session, tenant_id: UUID) -> List[Repository]:
        """
        List all repositories for a tenant.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID
            
        Returns:
            List of Repository instances
        """
        return db.query(Repository).filter(
            Repository.tenant_id == tenant_id
        ).order_by(Repository.data_repository_name.asc()).all()

    @staticmethod
    def update(
        db: Session,
        repository_id: UUID,
        tenant_id: UUID,
        repository_data: RepositoryUpdate
    ) -> Repository:
        """
        Update a repository.
        
        Args:
            db: Database session
            repository_id: Repository UUID
            tenant_id: Tenant UUID (for security check)
            repository_data: Repository update data
            
        Returns:
            Updated Repository instance
            
        Raises:
            NotFoundError: If repository not found
        """
        repository = RepositoryService.get_by_id(db, repository_id, tenant_id)
        
        # Update fields
        update_data = repository_data.model_dump(exclude_unset=True)
        update_data = RepositoryService._normalize_uuid_arrays(update_data)
        for field, value in update_data.items():
            setattr(repository, field, value)
        
        try:
            db.commit()
            db.refresh(repository)
            return repository
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update repository: {str(e)}")

    @staticmethod
    def delete(db: Session, repository_id: UUID, tenant_id: UUID) -> None:
        """
        Delete a repository (cascade deletes activities, etc.).
        
        Args:
            db: Database session
            repository_id: Repository UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If repository not found
        """
        repository = RepositoryService.get_by_id(db, repository_id, tenant_id)
        
        try:
            db.delete(repository)
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to delete repository: {str(e)}")

