"""
ROPA Context Builder service.

Builds hierarchical context for AI suggestions by fetching parent entities.
Context is included in request_data to provide AI with full entity hierarchy.
"""

from typing import Dict, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.ropa.enums import ROPAEntityType
from app.modules.ropa.services.repository import RepositoryService
from app.modules.ropa.services.activity import ActivityService
from app.modules.ropa.services.data_element import DataElementService
from app.modules.ropa.services.dpia import DPIAService
from app.modules.ropa.services.risk import RiskService
from app.services.tenant import TenantService
from app.models.tenant import Tenant
from app.exceptions import NotFoundError


class ROPAContextBuilder:
    """Builds hierarchical context for AI suggestions."""
    
    @staticmethod
    def build_context(
        db: Session,
        entity_type: ROPAEntityType,
        entity_id: UUID,
        tenant_id: UUID,
        tenant: Optional[Tenant] = None
    ) -> Dict:
        """
        Builds context hierarchy based on entity type.
        
        Context hierarchy:
        - Repository → no parent context
        - Activity → includes repository_context
        - DataElement → includes activity_context + repository_context
        - DPIA → includes activity_context + repository_context
        - Risk → includes dpia_context + activity_context + repository_context
        
        Also includes company_context from tenant metadata if tenant is provided.
        
        Args:
            db: Database session
            entity_type: Type of ROPA entity
            entity_id: ID of the entity
            tenant_id: Tenant ID for security validation
            tenant: Optional Tenant instance (if provided, company context will be included)
            
        Returns:
            Dictionary with parent context (to be included in request_data)
            
        Raises:
            NotFoundError: If entity not found or doesn't belong to tenant
        """
        # Build entity-specific context
        if entity_type == ROPAEntityType.REPOSITORY:
            context = {}  # Repository has no parent context
        elif entity_type == ROPAEntityType.ACTIVITY:
            context = ROPAContextBuilder._get_activity_context(db, entity_id, tenant_id)
        elif entity_type == ROPAEntityType.DATA_ELEMENT:
            context = ROPAContextBuilder._get_data_element_context(db, entity_id, tenant_id)
        elif entity_type == ROPAEntityType.DPIA:
            context = ROPAContextBuilder._get_dpia_context(db, entity_id, tenant_id)
        elif entity_type == ROPAEntityType.RISK:
            context = ROPAContextBuilder._get_risk_context(db, entity_id, tenant_id)
        else:
            raise ValueError(f"Unknown entity type: {entity_type}")
        
        # Add company context if tenant is provided
        if tenant:
            company_context = TenantService.get_company_context(tenant)
            if company_context:
                context["company_context"] = company_context
        
        return context
    
    @staticmethod
    def _get_activity_context(db: Session, activity_id: UUID, tenant_id: UUID) -> Dict:
        """Get context for Activity (includes repository)."""
        activity = ActivityService.get_by_id(db, activity_id, tenant_id)
        
        # Get repository
        repository = RepositoryService.get_by_id(db, activity.data_repository_id, tenant_id)
        
        return {
            "repository_context": ROPAContextBuilder._repository_to_dict(repository)
        }
    
    @staticmethod
    def _get_data_element_context(db: Session, data_element_id: UUID, tenant_id: UUID) -> Dict:
        """Get context for DataElement (includes activity + repository)."""
        data_element = DataElementService.get_by_id(db, data_element_id, tenant_id)
        
        # Get activity
        activity = ActivityService.get_by_id(db, data_element.processing_activity_id, tenant_id)
        
        # Get repository
        repository = RepositoryService.get_by_id(db, activity.data_repository_id, tenant_id)
        
        return {
            "activity_context": ROPAContextBuilder._activity_to_dict(activity),
            "repository_context": ROPAContextBuilder._repository_to_dict(repository)
        }
    
    @staticmethod
    def _get_dpia_context(db: Session, dpia_id: UUID, tenant_id: UUID) -> Dict:
        """Get context for DPIA (includes activity + repository)."""
        dpia = DPIAService.get_by_id(db, dpia_id, tenant_id)
        
        # Get activity
        activity = ActivityService.get_by_id(db, dpia.processing_activity_id, tenant_id)
        
        # Get repository
        repository = RepositoryService.get_by_id(db, activity.data_repository_id, tenant_id)
        
        return {
            "activity_context": ROPAContextBuilder._activity_to_dict(activity),
            "repository_context": ROPAContextBuilder._repository_to_dict(repository)
        }
    
    @staticmethod
    def _get_risk_context(db: Session, risk_id: UUID, tenant_id: UUID) -> Dict:
        """Get context for Risk (includes DPIA + activity + repository)."""
        risk = RiskService.get_by_id(db, risk_id, tenant_id)
        
        # Get DPIA
        dpia = DPIAService.get_by_id(db, risk.dpia_id, tenant_id)
        
        # Get activity
        activity = ActivityService.get_by_id(db, dpia.processing_activity_id, tenant_id)
        
        # Get repository
        repository = RepositoryService.get_by_id(db, activity.data_repository_id, tenant_id)
        
        return {
            "dpia_context": ROPAContextBuilder._dpia_to_dict(dpia),
            "activity_context": ROPAContextBuilder._activity_to_dict(activity),
            "repository_context": ROPAContextBuilder._repository_to_dict(repository)
        }
    
    @staticmethod
    def _repository_to_dict(repository) -> Dict:
        """Convert Repository model to dictionary for context."""
        return {
            "id": str(repository.id),
            "data_repository_name": repository.data_repository_name,
            "data_repository_description": repository.data_repository_description,
            "external_vendor": repository.external_vendor,
            "gdpr_compliant": repository.gdpr_compliant,
            "dpa_url": repository.dpa_url,
            "status": repository.status.value if repository.status else None,
            "comments": repository.comments,
            "geographical_location_ids": repository.geographical_location_ids,
            "access_location_ids": repository.access_location_ids,
            "interface_location_ids": repository.interface_location_ids,
            "data_format": repository.data_format.value if repository.data_format else None,
            "transfer_mechanism": repository.transfer_mechanism.value if repository.transfer_mechanism else None,
            "certification": repository.certification.value if repository.certification else None,
        }
    
    @staticmethod
    def _activity_to_dict(activity) -> Dict:
        """Convert Activity model to dictionary for context."""
        return {
            "id": str(activity.id),
            "name": activity.processing_activity_name,
            "purpose": activity.purpose,
            "lawful_basis": activity.lawful_basis,
            # Part 1 fields
            "legitimate_interest_assessment": activity.legitimate_interest_assessment,
            "data_subject_type": activity.data_subject_type,
            "collection_sources": activity.collection_sources,
            "data_disclosed_to": activity.data_disclosed_to,
            "jit_notice": activity.jit_notice,
            "consent_process": activity.consent_process,
            # Part 2 fields
            "automated_decision": activity.automated_decision,
            "data_subject_rights": activity.data_subject_rights,
            "dpia_required": activity.dpia_required,
            "dpia_comment": activity.dpia_comment,
            "dpia_file": activity.dpia_file,
            "dpia_gpc_link": activity.dpia_gpc_link,
            "children_data": activity.children_data,
            "parental_consent": activity.parental_consent,
        }
    
    @staticmethod
    def _dpia_to_dict(dpia) -> Dict:
        """Convert DPIA model to dictionary for context."""
        return {
            "id": str(dpia.id),
            "title": dpia.title,
            "description": dpia.description,
            "status": dpia.status,
            "assessor": dpia.assessor,
        }

