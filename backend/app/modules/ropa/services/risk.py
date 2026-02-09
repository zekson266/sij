"""
Risk service for ROPA module.

Handles all risk-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.risk import Risk
from app.modules.ropa.schemas.risk import RiskCreate, RiskUpdate
from app.modules.ropa.services.dpia import DPIAService
from app.exceptions import NotFoundError, ConflictError


class RiskService:
    """Service for risk operations."""

    @staticmethod
    def create(
        db: Session,
        tenant_id: UUID,
        risk_data: RiskCreate
    ) -> Risk:
        """
        Create a new risk for a DPIA.
        
        Args:
            db: Database session
            tenant_id: Tenant UUID (for security check)
            risk_data: Risk creation data
            
        Returns:
            Created Risk instance
            
        Raises:
            NotFoundError: If DPIA not found or doesn't belong to tenant
            ConflictError: If risk creation fails
        """
        # Verify DPIA belongs to tenant
        DPIAService.get_by_id(db, risk_data.dpia_id, tenant_id)
        
        risk = Risk(
            dpia_id=risk_data.dpia_id,
            title=risk_data.title,
            description=risk_data.description,
            severity=risk_data.severity,
            likelihood=risk_data.likelihood,
            mitigation=risk_data.mitigation,
        )
        
        try:
            db.add(risk)
            db.commit()
            db.refresh(risk)
            return risk
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create risk: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, risk_id: UUID, tenant_id: UUID) -> Risk:
        """
        Get risk by ID for a specific tenant.
        
        Args:
            db: Database session
            risk_id: Risk UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            Risk instance
            
        Raises:
            NotFoundError: If risk not found or doesn't belong to tenant
        """
        risk = db.query(Risk).filter(
            Risk.id == risk_id
        ).first()
        
        if not risk:
            raise NotFoundError(f"Risk with ID {risk_id} not found")
        
        # Verify it belongs to tenant through DPIA
        DPIAService.get_by_id(db, risk.dpia_id, tenant_id)
        
        return risk

    @staticmethod
    def list_by_dpia(
        db: Session,
        dpia_id: UUID,
        tenant_id: UUID
    ) -> List[Risk]:
        """
        List all risks for a DPIA.
        
        Args:
            db: Database session
            dpia_id: DPIA UUID
            tenant_id: Tenant UUID (for security check)
            
        Returns:
            List of Risk instances
        """
        # Verify DPIA belongs to tenant
        DPIAService.get_by_id(db, dpia_id, tenant_id)
        
        return db.query(Risk).filter(
            Risk.dpia_id == dpia_id
        ).order_by(Risk.created_at.desc()).all()

    @staticmethod
    def update(
        db: Session,
        risk_id: UUID,
        tenant_id: UUID,
        risk_data: RiskUpdate
    ) -> Risk:
        """
        Update a risk.
        
        Args:
            db: Database session
            risk_id: Risk UUID
            tenant_id: Tenant UUID (for security check)
            risk_data: Risk update data
            
        Returns:
            Updated Risk instance
            
        Raises:
            NotFoundError: If risk not found
        """
        risk = RiskService.get_by_id(db, risk_id, tenant_id)
        
        # Update fields
        update_data = risk_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(risk, field, value)
        
        try:
            db.commit()
            db.refresh(risk)
            return risk
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update risk: {str(e)}")

    @staticmethod
    def delete(db: Session, risk_id: UUID, tenant_id: UUID) -> None:
        """
        Delete a risk.
        
        Args:
            db: Database session
            risk_id: Risk UUID
            tenant_id: Tenant UUID (for security check)
            
        Raises:
            NotFoundError: If risk not found
        """
        risk = RiskService.get_by_id(db, risk_id, tenant_id)
        
        try:
            db.delete(risk)
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to delete risk: {str(e)}")



