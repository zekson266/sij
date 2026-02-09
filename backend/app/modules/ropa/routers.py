"""
ROPA module API routes.

Handles all ROPA-related HTTP endpoints.
Routes are prefixed with /ropa/ to indicate this is a module.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.tenant import Tenant
from app.services.tenant_user import TenantUserService
from app.shared.modules import require_module
from app.utils.rbac import has_permission
from app.modules.ropa.schemas.repository import RepositoryCreate, RepositoryUpdate, RepositoryResponse
from app.modules.ropa.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse
from app.modules.ropa.schemas.data_element import DataElementCreate, DataElementUpdate, DataElementResponse
from app.modules.ropa.schemas.dpia import DPIACreate, DPIAUpdate, DPIAResponse
from app.modules.ropa.schemas.risk import RiskCreate, RiskUpdate, RiskResponse
from app.modules.ropa.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.modules.ropa.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.modules.ropa.schemas.system import SystemCreate, SystemUpdate, SystemResponse
from app.modules.ropa.schemas.suggestion_job import (
    SuggestionJobRequest,
    SuggestionJobResponse,
    SuggestionJobStatus,
    SuggestionJobListResponse,
    SuggestionJobListItem,
)
from app.modules.ropa.services.repository import RepositoryService
from app.modules.ropa.services.activity import ActivityService
from app.modules.ropa.services.data_element import DataElementService
from app.modules.ropa.services.dpia import DPIAService
from app.modules.ropa.services.risk import RiskService
from app.modules.ropa.services.suggestion_job import SuggestionJobService
from app.modules.ropa.services.department import DepartmentService
from app.modules.ropa.services.location import LocationService
from app.modules.ropa.services.system import SystemService
from app.modules.ropa.services.context_builder import ROPAContextBuilder
from app.modules.ropa.tasks import process_suggestion_job
from app.modules.ropa.metadata import (
    REPOSITORY_FIELD_METADATA,
    ACTIVITY_FIELD_METADATA,
    DATA_ELEMENT_FIELD_METADATA,
    DPIA_FIELD_METADATA,
    RISK_FIELD_METADATA,
)
from app.modules.ropa.enums import ROPAEntityType
from app.exceptions import NotFoundError, ConflictError

router = APIRouter(
    prefix="/api/tenants/{tenant_id}/ropa",
    tags=["ropa"],
)


def _check_ropa_permission(
    db: Session,
    tenant_id: UUID,
    user: User,
    permission: str
) -> None:
    """
    Check if user has ROPA permission for the tenant.
    
    Uses RBAC system to check if user has the required permission.
    
    Args:
        db: Database session
        tenant_id: Tenant UUID
        user: Current user
        permission: Required permission (e.g., "ropa:read", "ropa:create")
        
    Raises:
        HTTPException: If user is not a member or doesn't have required permission
    """
    try:
        tenant_user = TenantUserService.get_by_tenant_and_user(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
        )
        if not tenant_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not an active member of this tenant",
            )
        if not has_permission(tenant_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have permission to {permission.replace('ropa:', '')} ROPA entities",
            )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this tenant to access ROPA",
        )


# ============================================================================
# Repository Routes
# ============================================================================

@router.post(
    "/repositories",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_repository(
    tenant_id: UUID,
    repository_data: RepositoryCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new repository for a tenant.
    
    If name is not provided, creates a default repository with name "Repository 1".
    This allows the form to always be in edit mode.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    try:
        # If name is not provided, use default name
        if not repository_data.data_repository_name or repository_data.data_repository_name.strip() == "":
            # Find next available default name
            existing_repos = RepositoryService.list_by_tenant(db, tenant_id)
            existing_names = {repo.data_repository_name for repo in existing_repos}
            
            default_name = "Repository 1"
            counter = 1
            while default_name in existing_names:
                counter += 1
                default_name = f"Repository {counter}"
            
            # Create a new RepositoryCreate with default name
            repository_dict = repository_data.model_dump(exclude_unset=True)
            repository_dict['data_repository_name'] = default_name
            repository_data = RepositoryCreate(**repository_dict)
        
        repository = RepositoryService.create(db, tenant_id, repository_data)
        return repository
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/repositories",
    response_model=List[RepositoryResponse],
)
def list_repositories(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all repositories for a tenant."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    repositories = RepositoryService.list_by_tenant(db, tenant_id)
    return repositories


@router.get(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
)
def get_repository(
    tenant_id: UUID,
    repository_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a repository by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        repository = RepositoryService.get_by_id(db, repository_id, tenant_id)
        return repository
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
)
def update_repository(
    tenant_id: UUID,
    repository_id: UUID,
    repository_data: RepositoryUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a repository."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        repository = RepositoryService.update(
            db, repository_id, tenant_id, repository_data
        )
        return repository
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/repositories/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_repository(
    tenant_id: UUID,
    repository_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a repository (cascade deletes activities)."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        RepositoryService.delete(db, repository_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# Activity Routes
# ============================================================================

@router.post(
    "/repositories/{repository_id}/activities",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    tenant_id: UUID,
    repository_id: UUID,
    activity_data: ActivityCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new activity for a repository.
    
    If name is not provided, creates a default activity with name "Activity 1".
    This allows the form to always be in edit mode.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    # Ensure data_repository_id in data matches path parameter
    activity_data.data_repository_id = repository_id
    
    try:
        # If processing_activity_name is not provided or is just whitespace, use default name
        # Note: model_validator converts empty string to single space, so check for that too
        if not activity_data.processing_activity_name or activity_data.processing_activity_name.strip() == "" or activity_data.processing_activity_name == " ":
            # Find next available default name
            existing_activities = ActivityService.list_by_repository(db, repository_id, tenant_id)
            existing_names = {activity.processing_activity_name for activity in existing_activities}
            
            default_name = "Activity 1"
            counter = 1
            while default_name in existing_names:
                counter += 1
                default_name = f"Activity {counter}"
            
            # Create a new ActivityCreate with default name
            activity_dict = activity_data.model_dump(exclude_unset=True)
            activity_dict['processing_activity_name'] = default_name
            activity_data = ActivityCreate(**activity_dict)
        
        activity = ActivityService.create(db, tenant_id, activity_data)
        return activity
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/repositories/{repository_id}/activities",
    response_model=List[ActivityResponse],
)
def list_activities(
    tenant_id: UUID,
    repository_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all activities for a repository."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        activities = ActivityService.list_by_repository(
            db, repository_id, tenant_id
        )
        return activities
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/activities/{activity_id}",
    response_model=ActivityResponse,
)
def get_activity(
    tenant_id: UUID,
    activity_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an activity by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        activity = ActivityService.get_by_id(db, activity_id, tenant_id)
        return activity
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/activities/{activity_id}",
    response_model=ActivityResponse,
)
def update_activity(
    tenant_id: UUID,
    activity_id: UUID,
    activity_data: ActivityUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an activity."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        activity = ActivityService.update(
            db, activity_id, tenant_id, activity_data
        )
        return activity
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/activities/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_activity(
    tenant_id: UUID,
    activity_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an activity (cascade deletes data elements and DPIAs)."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        ActivityService.delete(db, activity_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# Data Element Routes
# ============================================================================

@router.post(
    "/activities/{activity_id}/data-elements",
    response_model=DataElementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_data_element(
    tenant_id: UUID,
    activity_id: UUID,
    data_element_data: DataElementCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new data element for an activity.
    
    If name is not provided, creates a default data element with name "Data Element 1".
    This allows the form to always be in edit mode.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    # Ensure processing_activity_id in data matches path parameter
    data_element_data.processing_activity_id = activity_id
    
    try:
        data_element = DataElementService.create(
            db, tenant_id, data_element_data
        )
        return data_element
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/activities/{activity_id}/data-elements",
    response_model=List[DataElementResponse],
)
def list_data_elements(
    tenant_id: UUID,
    activity_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all data elements for an activity."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        data_elements = DataElementService.list_by_activity(
            db, activity_id, tenant_id
        )
        return data_elements
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/data-elements/{data_element_id}",
    response_model=DataElementResponse,
)
def get_data_element(
    tenant_id: UUID,
    data_element_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a data element by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        data_element = DataElementService.get_by_id(
            db, data_element_id, tenant_id
        )
        return data_element
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/data-elements/{data_element_id}",
    response_model=DataElementResponse,
)
def update_data_element(
    tenant_id: UUID,
    data_element_id: UUID,
    data_element_data: DataElementUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a data element."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        data_element = DataElementService.update(
            db, data_element_id, tenant_id, data_element_data
        )
        return data_element
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/data-elements/{data_element_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_data_element(
    tenant_id: UUID,
    data_element_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a data element."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        DataElementService.delete(db, data_element_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# DPIA Routes
# ============================================================================

@router.post(
    "/activities/{activity_id}/dpias",
    response_model=DPIAResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dpia(
    tenant_id: UUID,
    activity_id: UUID,
    dpia_data: DPIACreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new DPIA for an activity.
    
    If title is not provided, creates a default DPIA with title "DPIA 1".
    This allows the form to always be in edit mode.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    # Ensure processing_activity_id in data matches path parameter
    dpia_data.processing_activity_id = activity_id
    
    try:
        # If title is not provided or is just whitespace, use default title
        # Note: model_validator converts empty string to single space, so check for that too
        if not dpia_data.title or dpia_data.title.strip() == "" or dpia_data.title == " ":
            # Find next available default title
            existing_dpias = DPIAService.list_by_activity(db, activity_id, tenant_id)
            existing_titles = {dpia.title for dpia in existing_dpias}
            
            default_title = "DPIA 1"
            counter = 1
            while default_title in existing_titles:
                counter += 1
                default_title = f"DPIA {counter}"
            
            # Create a new DPIACreate with default title
            dpia_dict = dpia_data.model_dump(exclude_unset=True)
            dpia_dict['title'] = default_title
            dpia_data = DPIACreate(**dpia_dict)
        
        dpia = DPIAService.create(db, tenant_id, dpia_data)
        return dpia
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/activities/{activity_id}/dpias",
    response_model=List[DPIAResponse],
)
def list_dpias(
    tenant_id: UUID,
    activity_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all DPIAs for an activity."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        dpias = DPIAService.list_by_activity(db, activity_id, tenant_id)
        return dpias
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/dpias/{dpia_id}",
    response_model=DPIAResponse,
)
def get_dpia(
    tenant_id: UUID,
    dpia_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a DPIA by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        dpia = DPIAService.get_by_id(db, dpia_id, tenant_id)
        return dpia
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/dpias/{dpia_id}",
    response_model=DPIAResponse,
)
def update_dpia(
    tenant_id: UUID,
    dpia_id: UUID,
    dpia_data: DPIAUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a DPIA."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        dpia = DPIAService.update(db, dpia_id, tenant_id, dpia_data)
        return dpia
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/dpias/{dpia_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_dpia(
    tenant_id: UUID,
    dpia_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a DPIA (cascade deletes risks)."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        DPIAService.delete(db, dpia_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# Risk Routes
# ============================================================================

@router.post(
    "/dpias/{dpia_id}/risks",
    response_model=RiskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(
    tenant_id: UUID,
    dpia_id: UUID,
    risk_data: RiskCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new risk for a DPIA.
    
    If title is not provided, creates a default risk with title "Risk 1".
    This allows the form to always be in edit mode.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    # Ensure dpia_id in data matches path parameter
    risk_data.dpia_id = dpia_id
    
    try:
        # If title is not provided or is just whitespace, use default title
        # Note: model_validator converts empty string to single space, so check for that too
        if not risk_data.title or risk_data.title.strip() == "" or risk_data.title == " ":
            # Find next available default title
            existing_risks = RiskService.list_by_dpia(db, dpia_id, tenant_id)
            existing_titles = {risk.title for risk in existing_risks}
            
            default_title = "Risk 1"
            counter = 1
            while default_title in existing_titles:
                counter += 1
                default_title = f"Risk {counter}"
            
            # Create a new RiskCreate with default title
            risk_dict = risk_data.model_dump(exclude_unset=True)
            risk_dict['title'] = default_title
            risk_data = RiskCreate(**risk_dict)
        
        risk = RiskService.create(db, tenant_id, risk_data)
        return risk
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/dpias/{dpia_id}/risks",
    response_model=List[RiskResponse],
)
def list_risks(
    tenant_id: UUID,
    dpia_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all risks for a DPIA."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        risks = RiskService.list_by_dpia(db, dpia_id, tenant_id)
        return risks
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/risks/{risk_id}",
    response_model=RiskResponse,
)
def get_risk(
    tenant_id: UUID,
    risk_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a risk by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        risk = RiskService.get_by_id(db, risk_id, tenant_id)
        return risk
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/risks/{risk_id}",
    response_model=RiskResponse,
)
def update_risk(
    tenant_id: UUID,
    risk_id: UUID,
    risk_data: RiskUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a risk."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        risk = RiskService.update(db, risk_id, tenant_id, risk_data)
        return risk
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/risks/{risk_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_risk(
    tenant_id: UUID,
    risk_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a risk."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        RiskService.delete(db, risk_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# Metadata Routes (for AI API integration)
# ============================================================================

@router.get(
    "/metadata/repository-fields",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_repository_field_metadata(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get field metadata for Repository form.
    
    Returns JSON Schema compatible structure for AI API integration.
    Includes allowed values, descriptions, examples, and AI hints for each field.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Convert FieldMetadata to JSON Schema format
    metadata = {}
    for field_name, field_meta in REPOSITORY_FIELD_METADATA.items():
        field_schema = {
            "type": field_meta.field_type,
            "description": field_meta.description,
            "required": field_meta.required,
            "examples": field_meta.examples,
        }
        
        if field_meta.ai_hints:
            field_schema["aiHints"] = field_meta.ai_hints
        
        if field_meta.allowed_values:
            # Add enum values
            enum_values = [val.value for val in field_meta.allowed_values]
            field_schema["enum"] = enum_values
            
            # Add enum metadata with descriptions and examples
            enum_metadata = {}
            for enum_val in field_meta.allowed_values:
                enum_metadata[enum_val.value] = {
                    "label": enum_val.label,
                    "description": enum_val.description,
                    "examples": enum_val.examples,
                }
                if enum_val.context:
                    enum_metadata[enum_val.value]["context"] = enum_val.context
                if enum_val.related_values:
                    enum_metadata[enum_val.value]["relatedValues"] = enum_val.related_values
            
            field_schema["enumMetadata"] = enum_metadata
        
        if field_meta.validation_rules:
            field_schema["validationRules"] = field_meta.validation_rules
        
        metadata[field_name] = field_schema
    
    return {
        "formType": "repository",
        "fields": metadata,
        "version": "1.0",
    }


@router.get(
    "/metadata/activity-fields",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_activity_field_metadata(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get field metadata for Activity form.
    
    Returns JSON Schema compatible structure for AI API integration.
    Includes allowed values, descriptions, examples, and AI hints for each field.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Convert FieldMetadata to JSON Schema format
    metadata = {}
    for field_name, field_meta in ACTIVITY_FIELD_METADATA.items():
        field_schema = {
            "type": field_meta.field_type,
            "description": field_meta.description,
            "required": field_meta.required,
            "examples": field_meta.examples,
        }
        
        if field_meta.ai_hints:
            field_schema["aiHints"] = field_meta.ai_hints
        
        if field_meta.allowed_values:
            # Add enum values
            enum_values = [val.value for val in field_meta.allowed_values]
            field_schema["enum"] = enum_values
            
            # Add enum metadata with descriptions and examples
            enum_metadata = {}
            for enum_val in field_meta.allowed_values:
                enum_metadata[enum_val.value] = {
                    "label": enum_val.label,
                    "description": enum_val.description,
                    "examples": enum_val.examples,
                }
                if enum_val.context:
                    enum_metadata[enum_val.value]["context"] = enum_val.context
                if enum_val.related_values:
                    enum_metadata[enum_val.value]["relatedValues"] = enum_val.related_values
            
            field_schema["enumMetadata"] = enum_metadata
        
        if field_meta.validation_rules:
            field_schema["validationRules"] = field_meta.validation_rules
        
        metadata[field_name] = field_schema
    
    return {
        "formType": "activity",
        "fields": metadata,
        "version": "1.0",
    }


@router.get(
    "/metadata/data-element-fields",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_data_element_field_metadata(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get field metadata for DataElement form.
    
    Returns JSON Schema compatible structure for AI API integration.
    Includes allowed values, descriptions, examples, and AI hints for each field.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Convert FieldMetadata to JSON Schema format
    metadata = {}
    for field_name, field_meta in DATA_ELEMENT_FIELD_METADATA.items():
        field_schema = {
            "type": field_meta.field_type,
            "description": field_meta.description,
            "required": field_meta.required,
            "examples": field_meta.examples,
        }
        
        if field_meta.ai_hints:
            field_schema["aiHints"] = field_meta.ai_hints
        
        if field_meta.allowed_values:
            # Add enum values
            enum_values = [val.value for val in field_meta.allowed_values]
            field_schema["enum"] = enum_values
            
            # Add enum metadata with descriptions and examples
            enum_metadata = {}
            for enum_val in field_meta.allowed_values:
                enum_metadata[enum_val.value] = {
                    "label": enum_val.label,
                    "description": enum_val.description,
                    "examples": enum_val.examples,
                }
                if enum_val.context:
                    enum_metadata[enum_val.value]["context"] = enum_val.context
                if enum_val.related_values:
                    enum_metadata[enum_val.value]["relatedValues"] = enum_val.related_values
            
            field_schema["enumMetadata"] = enum_metadata
        
        if field_meta.validation_rules:
            field_schema["validationRules"] = field_meta.validation_rules
        
        metadata[field_name] = field_schema
    
    return {
        "formType": "data_element",
        "fields": metadata,
        "version": "1.0",
    }


@router.get(
    "/metadata/dpia-fields",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_dpia_field_metadata(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get field metadata for DPIA form.
    
    Returns JSON Schema compatible structure for AI API integration.
    Includes allowed values, descriptions, examples, and AI hints for each field.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Convert FieldMetadata to JSON Schema format
    metadata = {}
    for field_name, field_meta in DPIA_FIELD_METADATA.items():
        field_schema = {
            "type": field_meta.field_type,
            "description": field_meta.description,
            "required": field_meta.required,
            "examples": field_meta.examples,
        }
        
        if field_meta.ai_hints:
            field_schema["aiHints"] = field_meta.ai_hints
        
        if field_meta.allowed_values:
            # Add enum values
            enum_values = [val.value for val in field_meta.allowed_values]
            field_schema["enum"] = enum_values
            
            # Add enum metadata with descriptions and examples
            enum_metadata = {}
            for enum_val in field_meta.allowed_values:
                enum_metadata[enum_val.value] = {
                    "label": enum_val.label,
                    "description": enum_val.description,
                    "examples": enum_val.examples,
                }
                if enum_val.context:
                    enum_metadata[enum_val.value]["context"] = enum_val.context
                if enum_val.related_values:
                    enum_metadata[enum_val.value]["relatedValues"] = enum_val.related_values
            
            field_schema["enumMetadata"] = enum_metadata
        
        if field_meta.validation_rules:
            field_schema["validationRules"] = field_meta.validation_rules
        
        metadata[field_name] = field_schema
    
    return {
        "formType": "dpia",
        "fields": metadata,
        "version": "1.0",
    }


@router.get(
    "/metadata/risk-fields",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_risk_field_metadata(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get field metadata for Risk form.
    
    Returns JSON Schema compatible structure for AI API integration.
    Includes allowed values, descriptions, examples, and AI hints for each field.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Convert FieldMetadata to JSON Schema format
    metadata = {}
    for field_name, field_meta in RISK_FIELD_METADATA.items():
        field_schema = {
            "type": field_meta.field_type,
            "description": field_meta.description,
            "required": field_meta.required,
            "examples": field_meta.examples,
        }
        
        if field_meta.ai_hints:
            field_schema["aiHints"] = field_meta.ai_hints
        
        if field_meta.allowed_values:
            # Add enum values
            enum_values = [val.value for val in field_meta.allowed_values]
            field_schema["enum"] = enum_values
            
            # Add enum metadata with descriptions and examples
            enum_metadata = {}
            for enum_val in field_meta.allowed_values:
                enum_metadata[enum_val.value] = {
                    "label": enum_val.label,
                    "description": enum_val.description,
                    "examples": enum_val.examples,
                }
                if enum_val.context:
                    enum_metadata[enum_val.value]["context"] = enum_val.context
                if enum_val.related_values:
                    enum_metadata[enum_val.value]["relatedValues"] = enum_val.related_values
            
            field_schema["enumMetadata"] = enum_metadata
        
        if field_meta.validation_rules:
            field_schema["validationRules"] = field_meta.validation_rules
        
        metadata[field_name] = field_schema
    
    return {
        "formType": "risk",
        "fields": metadata,
        "version": "1.0",
    }


# ============================================================================
# AI Suggestion Job Routes
# ============================================================================

@router.post(
    "/repositories/{repository_id}/suggest-field",
    response_model=SuggestionJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_suggestion_job(
    tenant_id: UUID,
    repository_id: UUID,
    request: SuggestionJobRequest,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new AI suggestion job for a repository field.
    
    Creates a job that will be processed asynchronously by Celery workers.
    Returns immediately with job ID and status.
    """
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Verify repository exists and belongs to tenant
    try:
        repository = RepositoryService.get_by_id(db, repository_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found",
        )
    
    # Build context (repository has no parent context)
    context = ROPAContextBuilder.build_context(
        db=db,
        entity_type=ROPAEntityType.REPOSITORY,
        entity_id=repository_id,
        tenant_id=tenant_id,
        tenant=tenant
    )
    
    # Check if there's already a pending job for this field
    existing_job = SuggestionJobService.get_job_by_field(
        db=db,
        entity_type=ROPAEntityType.REPOSITORY,
        entity_id=repository_id,
        field_name=request.field_name,
        status="pending"
    )
    if existing_job:
        # Return existing job instead of creating duplicate
        return SuggestionJobResponse(
            job_id=existing_job.id,
            status=existing_job.status,
            created_at=existing_job.created_at
        )
    
    # Create job
    job = SuggestionJobService.create_job(
        db=db,
        user_id=current_user.id,
        tenant_id=tenant_id,
        entity_type=ROPAEntityType.REPOSITORY,
        entity_id=repository_id,
        field_name=request.field_name,
        field_type=request.field_type,
        field_label=request.field_label,
        request_data={
            "form_data": request.form_data,
            "current_value": request.current_value,
            "field_options": request.field_options or [],
            **context  # Include parent context
        }
    )
    
    # Enqueue Celery task
    process_suggestion_job.delay(str(job.id))
    
    return SuggestionJobResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )


# IMPORTANT: /jobs route MUST come before /{job_id} route
# FastAPI matches routes in registration order, and literal paths must come before parameterized paths
@router.get(
    "/repositories/{repository_id}/suggest-field/jobs",
    response_model=SuggestionJobListResponse,
)
def list_suggestion_jobs(
    tenant_id: UUID,
    repository_id: UUID,
    field_name: Optional[str] = None,
    status: Optional[str] = None,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List suggestion jobs for a repository."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Verify repository exists
    try:
        RepositoryService.get_by_id(db, repository_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found",
        )
    
    jobs = SuggestionJobService.list_jobs(
        db=db,
        entity_type=ROPAEntityType.REPOSITORY,
        entity_id=repository_id,
        user_id=current_user.id,
        tenant_id=tenant_id,
        field_name=field_name,
        status=status
    )
    
    return SuggestionJobListResponse(
        jobs=[
            SuggestionJobListItem(
                job_id=job.id,
                field_name=job.field_name,
                field_label=job.field_label,
                status=job.status,
                created_at=job.created_at,
                completed_at=job.completed_at
            )
            for job in jobs
        ],
        total=len(jobs)
    )


# This route uses /job/{job_id} instead of /{job_id} to avoid route matching conflicts
@router.get(
    "/repositories/{repository_id}/suggest-field/job/{job_id}",
    response_model=SuggestionJobStatus,
)
def get_suggestion_job(
    tenant_id: UUID,
    repository_id: UUID,
    job_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of a suggestion job."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    job = SuggestionJobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    # Verify job belongs to user, tenant, and entity
    if (job.user_id != current_user.id or 
        job.tenant_id != tenant_id or 
        job.entity_type != ROPAEntityType.REPOSITORY.value or
        job.entity_id != repository_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return SuggestionJobStatus(
        job_id=job.id,
        status=job.status,
        field_name=job.field_name,
        field_label=job.field_label,
        general_statement=job.general_statement,
        suggestions=job.suggestions,
        error_message=job.error_message,
        openai_model=job.openai_model,
        openai_tokens_used=job.openai_tokens_used,
        openai_cost_usd=float(job.openai_cost_usd) if job.openai_cost_usd else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at
    )


# ============================================================================
# Activity Suggestion Routes
# ============================================================================

@router.post(
    "/activities/{activity_id}/suggest-field",
    response_model=SuggestionJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_activity_suggestion_job(
    tenant_id: UUID,
    activity_id: UUID,
    request: SuggestionJobRequest,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI suggestion job for an activity field."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    # Verify activity exists and belongs to tenant
    try:
        ActivityService.get_by_id(db, activity_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    
    # Build context (includes repository)
    context = ROPAContextBuilder.build_context(
        db=db,
        entity_type=ROPAEntityType.ACTIVITY,
        entity_id=activity_id,
        tenant_id=tenant_id,
        tenant=tenant
    )
    
    # Check if there's already a pending job for this field
    existing_job = SuggestionJobService.get_job_by_field(
        db=db,
        entity_type=ROPAEntityType.ACTIVITY,
        entity_id=activity_id,
        field_name=request.field_name,
        status="pending"
    )
    if existing_job:
        return SuggestionJobResponse(
            job_id=existing_job.id,
            status=existing_job.status,
            created_at=existing_job.created_at
        )
    
    # Create job
    job = SuggestionJobService.create_job(
        db=db,
        user_id=current_user.id,
        tenant_id=tenant_id,
        entity_type=ROPAEntityType.ACTIVITY,
        entity_id=activity_id,
        field_name=request.field_name,
        field_type=request.field_type,
        field_label=request.field_label,
        request_data={
            "form_data": request.form_data,
            "current_value": request.current_value,
            "field_options": request.field_options or [],
            **context
        }
    )
    
    process_suggestion_job.delay(str(job.id))
    
    return SuggestionJobResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )


@router.get(
    "/activities/{activity_id}/suggest-field/jobs",
    response_model=SuggestionJobListResponse,
)
def list_activity_suggestion_jobs(
    tenant_id: UUID,
    activity_id: UUID,
    field_name: Optional[str] = None,
    status: Optional[str] = None,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List suggestion jobs for an activity."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        ActivityService.get_by_id(db, activity_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    
    jobs = SuggestionJobService.list_jobs(
        db=db,
        entity_type=ROPAEntityType.ACTIVITY,
        entity_id=activity_id,
        user_id=current_user.id,
        tenant_id=tenant_id,
        field_name=field_name,
        status=status
    )
    
    return SuggestionJobListResponse(
        jobs=[
            SuggestionJobListItem(
                job_id=job.id,
                field_name=job.field_name,
                field_label=job.field_label,
                status=job.status,
                created_at=job.created_at,
                completed_at=job.completed_at
            )
            for job in jobs
        ],
        total=len(jobs)
    )


@router.get(
    "/activities/{activity_id}/suggest-field/job/{job_id}",
    response_model=SuggestionJobStatus,
)
def get_activity_suggestion_job(
    tenant_id: UUID,
    activity_id: UUID,
    job_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of an activity suggestion job."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    job = SuggestionJobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if (job.user_id != current_user.id or 
        job.tenant_id != tenant_id or 
        job.entity_type != ROPAEntityType.ACTIVITY.value or
        job.entity_id != activity_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return SuggestionJobStatus(
        job_id=job.id,
        status=job.status,
        field_name=job.field_name,
        field_label=job.field_label,
        general_statement=job.general_statement,
        suggestions=job.suggestions,
        error_message=job.error_message,
        openai_model=job.openai_model,
        openai_tokens_used=job.openai_tokens_used,
        openai_cost_usd=float(job.openai_cost_usd) if job.openai_cost_usd else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at
    )


# ============================================================================
# DataElement Suggestion Routes
# ============================================================================

@router.post(
    "/data-elements/{data_element_id}/suggest-field",
    response_model=SuggestionJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_data_element_suggestion_job(
    tenant_id: UUID,
    data_element_id: UUID,
    request: SuggestionJobRequest,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI suggestion job for a data element field."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        DataElementService.get_by_id(db, data_element_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data element not found",
        )
    
    context = ROPAContextBuilder.build_context(
        db=db,
        entity_type=ROPAEntityType.DATA_ELEMENT,
        entity_id=data_element_id,
        tenant_id=tenant_id,
        tenant=tenant
    )
    
    existing_job = SuggestionJobService.get_job_by_field(
        db=db,
        entity_type=ROPAEntityType.DATA_ELEMENT,
        entity_id=data_element_id,
        field_name=request.field_name,
        status="pending"
    )
    if existing_job:
        return SuggestionJobResponse(
            job_id=existing_job.id,
            status=existing_job.status,
            created_at=existing_job.created_at
        )
    
    job = SuggestionJobService.create_job(
        db=db,
        user_id=current_user.id,
        tenant_id=tenant_id,
        entity_type=ROPAEntityType.DATA_ELEMENT,
        entity_id=data_element_id,
        field_name=request.field_name,
        field_type=request.field_type,
        field_label=request.field_label,
        request_data={
            "form_data": request.form_data,
            "current_value": request.current_value,
            "field_options": request.field_options or [],
            **context
        }
    )
    
    process_suggestion_job.delay(str(job.id))
    
    return SuggestionJobResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )


@router.get(
    "/data-elements/{data_element_id}/suggest-field/jobs",
    response_model=SuggestionJobListResponse,
)
def list_data_element_suggestion_jobs(
    tenant_id: UUID,
    data_element_id: UUID,
    field_name: Optional[str] = None,
    status: Optional[str] = None,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List suggestion jobs for a data element."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        DataElementService.get_by_id(db, data_element_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data element not found",
        )
    
    jobs = SuggestionJobService.list_jobs(
        db=db,
        entity_type=ROPAEntityType.DATA_ELEMENT,
        entity_id=data_element_id,
        user_id=current_user.id,
        tenant_id=tenant_id,
        field_name=field_name,
        status=status
    )
    
    return SuggestionJobListResponse(
        jobs=[
            SuggestionJobListItem(
                job_id=job.id,
                field_name=job.field_name,
                field_label=job.field_label,
                status=job.status,
                created_at=job.created_at,
                completed_at=job.completed_at
            )
            for job in jobs
        ],
        total=len(jobs)
    )


@router.get(
    "/data-elements/{data_element_id}/suggest-field/job/{job_id}",
    response_model=SuggestionJobStatus,
)
def get_data_element_suggestion_job(
    tenant_id: UUID,
    data_element_id: UUID,
    job_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of a data element suggestion job."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    job = SuggestionJobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if (job.user_id != current_user.id or 
        job.tenant_id != tenant_id or 
        job.entity_type != ROPAEntityType.DATA_ELEMENT.value or
        job.entity_id != data_element_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return SuggestionJobStatus(
        job_id=job.id,
        status=job.status,
        field_name=job.field_name,
        field_label=job.field_label,
        general_statement=job.general_statement,
        suggestions=job.suggestions,
        error_message=job.error_message,
        openai_model=job.openai_model,
        openai_tokens_used=job.openai_tokens_used,
        openai_cost_usd=float(job.openai_cost_usd) if job.openai_cost_usd else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at
    )


# ============================================================================
# DPIA Suggestion Routes
# ============================================================================

@router.post(
    "/dpias/{dpia_id}/suggest-field",
    response_model=SuggestionJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dpia_suggestion_job(
    tenant_id: UUID,
    dpia_id: UUID,
    request: SuggestionJobRequest,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI suggestion job for a DPIA field."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        DPIAService.get_by_id(db, dpia_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DPIA not found",
        )
    
    context = ROPAContextBuilder.build_context(
        db=db,
        entity_type=ROPAEntityType.DPIA,
        entity_id=dpia_id,
        tenant_id=tenant_id,
        tenant=tenant
    )
    
    existing_job = SuggestionJobService.get_job_by_field(
        db=db,
        entity_type=ROPAEntityType.DPIA,
        entity_id=dpia_id,
        field_name=request.field_name,
        status="pending"
    )
    if existing_job:
        return SuggestionJobResponse(
            job_id=existing_job.id,
            status=existing_job.status,
            created_at=existing_job.created_at
        )
    
    job = SuggestionJobService.create_job(
        db=db,
        user_id=current_user.id,
        tenant_id=tenant_id,
        entity_type=ROPAEntityType.DPIA,
        entity_id=dpia_id,
        field_name=request.field_name,
        field_type=request.field_type,
        field_label=request.field_label,
        request_data={
            "form_data": request.form_data,
            "current_value": request.current_value,
            "field_options": request.field_options or [],
            **context
        }
    )
    
    process_suggestion_job.delay(str(job.id))
    
    return SuggestionJobResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )


@router.get(
    "/dpias/{dpia_id}/suggest-field/jobs",
    response_model=SuggestionJobListResponse,
)
def list_dpia_suggestion_jobs(
    tenant_id: UUID,
    dpia_id: UUID,
    field_name: Optional[str] = None,
    status: Optional[str] = None,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List suggestion jobs for a DPIA."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        DPIAService.get_by_id(db, dpia_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DPIA not found",
        )
    
    jobs = SuggestionJobService.list_jobs(
        db=db,
        entity_type=ROPAEntityType.DPIA,
        entity_id=dpia_id,
        user_id=current_user.id,
        tenant_id=tenant_id,
        field_name=field_name,
        status=status
    )
    
    return SuggestionJobListResponse(
        jobs=[
            SuggestionJobListItem(
                job_id=job.id,
                field_name=job.field_name,
                field_label=job.field_label,
                status=job.status,
                created_at=job.created_at,
                completed_at=job.completed_at
            )
            for job in jobs
        ],
        total=len(jobs)
    )


@router.get(
    "/dpias/{dpia_id}/suggest-field/job/{job_id}",
    response_model=SuggestionJobStatus,
)
def get_dpia_suggestion_job(
    tenant_id: UUID,
    dpia_id: UUID,
    job_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of a DPIA suggestion job."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    job = SuggestionJobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if (job.user_id != current_user.id or 
        job.tenant_id != tenant_id or 
        job.entity_type != ROPAEntityType.DPIA.value or
        job.entity_id != dpia_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return SuggestionJobStatus(
        job_id=job.id,
        status=job.status,
        field_name=job.field_name,
        field_label=job.field_label,
        general_statement=job.general_statement,
        suggestions=job.suggestions,
        error_message=job.error_message,
        openai_model=job.openai_model,
        openai_tokens_used=job.openai_tokens_used,
        openai_cost_usd=float(job.openai_cost_usd) if job.openai_cost_usd else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at
    )


# ============================================================================
# Risk Suggestion Routes
# ============================================================================

@router.post(
    "/risks/{risk_id}/suggest-field",
    response_model=SuggestionJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_risk_suggestion_job(
    tenant_id: UUID,
    risk_id: UUID,
    request: SuggestionJobRequest,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI suggestion job for a risk field."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        RiskService.get_by_id(db, risk_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found",
        )
    
    context = ROPAContextBuilder.build_context(
        db=db,
        entity_type=ROPAEntityType.RISK,
        entity_id=risk_id,
        tenant_id=tenant_id,
        tenant=tenant
    )
    
    existing_job = SuggestionJobService.get_job_by_field(
        db=db,
        entity_type=ROPAEntityType.RISK,
        entity_id=risk_id,
        field_name=request.field_name,
        status="pending"
    )
    if existing_job:
        return SuggestionJobResponse(
            job_id=existing_job.id,
            status=existing_job.status,
            created_at=existing_job.created_at
        )
    
    job = SuggestionJobService.create_job(
        db=db,
        user_id=current_user.id,
        tenant_id=tenant_id,
        entity_type=ROPAEntityType.RISK,
        entity_id=risk_id,
        field_name=request.field_name,
        field_type=request.field_type,
        field_label=request.field_label,
        request_data={
            "form_data": request.form_data,
            "current_value": request.current_value,
            "field_options": request.field_options or [],
            **context
        }
    )
    
    process_suggestion_job.delay(str(job.id))
    
    return SuggestionJobResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )


@router.get(
    "/risks/{risk_id}/suggest-field/jobs",
    response_model=SuggestionJobListResponse,
)
def list_risk_suggestion_jobs(
    tenant_id: UUID,
    risk_id: UUID,
    field_name: Optional[str] = None,
    status: Optional[str] = None,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List suggestion jobs for a risk."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        RiskService.get_by_id(db, risk_id, tenant_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found",
        )
    
    jobs = SuggestionJobService.list_jobs(
        db=db,
        entity_type=ROPAEntityType.RISK,
        entity_id=risk_id,
        user_id=current_user.id,
        tenant_id=tenant_id,
        field_name=field_name,
        status=status
    )
    
    return SuggestionJobListResponse(
        jobs=[
            SuggestionJobListItem(
                job_id=job.id,
                field_name=job.field_name,
                field_label=job.field_label,
                status=job.status,
                created_at=job.created_at,
                completed_at=job.completed_at
            )
            for job in jobs
        ],
        total=len(jobs)
    )


@router.get(
    "/risks/{risk_id}/suggest-field/job/{job_id}",
    response_model=SuggestionJobStatus,
)
def get_risk_suggestion_job(
    tenant_id: UUID,
    risk_id: UUID,
    job_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of a risk suggestion job."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    job = SuggestionJobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if (job.user_id != current_user.id or 
        job.tenant_id != tenant_id or 
        job.entity_type != ROPAEntityType.RISK.value or
        job.entity_id != risk_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return SuggestionJobStatus(
        job_id=job.id,
        status=job.status,
        field_name=job.field_name,
        field_label=job.field_label,
        general_statement=job.general_statement,
        suggestions=job.suggestions,
        error_message=job.error_message,
        openai_model=job.openai_model,
        openai_tokens_used=job.openai_tokens_used,
        openai_cost_usd=float(job.openai_cost_usd) if job.openai_cost_usd else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at
    )


# ============================================================================
# Lookup Table Routes (Departments, Locations, Systems, Policy Documents)
# ============================================================================

# Departments
@router.get(
    "/departments",
    response_model=List[DepartmentResponse],
)
def list_departments(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all departments for a tenant."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    departments = DepartmentService.list_by_tenant(db, tenant_id)
    return departments


@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    tenant_id: UUID,
    department_data: DepartmentCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new department for a tenant."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    try:
        if not department_data.name or department_data.name.strip() == "":
            existing_departments = DepartmentService.list_by_tenant(db, tenant_id)
            existing_names = {dept.name for dept in existing_departments}
            
            default_name = "Department 1"
            counter = 1
            while default_name in existing_names:
                counter += 1
                default_name = f"Department {counter}"
            
            department_dict = department_data.model_dump(exclude_unset=True)
            department_dict['name'] = default_name
            department_data = DepartmentCreate(**department_dict)
        
        department = DepartmentService.create(db, tenant_id, department_data)
        return department
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/departments/{department_id}",
    response_model=DepartmentResponse,
)
def get_department(
    tenant_id: UUID,
    department_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a department by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        department = DepartmentService.get_by_id(db, department_id, tenant_id)
        return department
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/departments/{department_id}",
    response_model=DepartmentResponse,
)
def update_department(
    tenant_id: UUID,
    department_id: UUID,
    department_data: DepartmentUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a department."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        department = DepartmentService.update(
            db, department_id, tenant_id, department_data
        )
        return department
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/departments/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_department(
    tenant_id: UUID,
    department_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a department."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        DepartmentService.delete(db, department_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# Global Locations (shared across all tenants, but accessed via tenant routes)
@router.get(
    "/locations",
    response_model=List[LocationResponse],
)
def list_locations(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all global locations (shared across all tenants)."""
    # Check ROPA permission but return global locations
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    # Return global locations (not tenant-specific)
    locations = LocationService.get_all(db)
    return locations


@router.post(
    "/locations",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_location(
    tenant_id: UUID,
    location_data: LocationCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new global location (requires admin/superuser)."""
    # Check ROPA permission
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    # Only superusers can create global locations
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create global locations",
        )
    
    try:
        if not location_data.name or location_data.name.strip() == "":
            existing_locations = LocationService.get_all(db)
            existing_names = {loc.name for loc in existing_locations}
            
            default_name = "Location 1"
            counter = 1
            while default_name in existing_names:
                counter += 1
                default_name = f"Location {counter}"
            
            location_dict = location_data.model_dump(exclude_unset=True)
            location_dict['name'] = default_name
            location_data = LocationCreate(**location_dict)
        
        # Create global location (no tenant_id)
        location = LocationService.create(db, location_data)
        return location
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/locations/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    tenant_id: UUID,
    location_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a global location by ID."""
    # Check ROPA permission
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        location = LocationService.get_by_id(db, location_id)
        return location
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/locations/{location_id}",
    response_model=LocationResponse,
)
def update_location(
    tenant_id: UUID,
    location_id: UUID,
    location_data: LocationUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a global location (requires admin/superuser)."""
    # Check ROPA permission
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    # Only superusers can update global locations
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update global locations",
        )
    
    try:
        location = LocationService.update(db, location_id, location_data)
        return location
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/locations/{location_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_location(
    tenant_id: UUID,
    location_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a global location (requires admin/superuser)."""
    # Check ROPA permission
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    # Only superusers can delete global locations
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete global locations",
        )
    
    try:
        LocationService.delete(db, location_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# Systems
@router.get(
    "/systems",
    response_model=List[SystemResponse],
)
def list_systems(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all systems for a tenant."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    systems = SystemService.list_by_tenant(db, tenant_id)
    return systems


@router.post(
    "/systems",
    response_model=SystemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_system(
    tenant_id: UUID,
    system_data: SystemCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new system for a tenant."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    try:
        if not system_data.name or system_data.name.strip() == "":
            existing_systems = SystemService.list_by_tenant(db, tenant_id)
            existing_names = {sys.name for sys in existing_systems}
            
            default_name = "System 1"
            counter = 1
            while default_name in existing_names:
                counter += 1
                default_name = f"System {counter}"
            
            system_dict = system_data.model_dump(exclude_unset=True)
            system_dict['name'] = default_name
            system_data = SystemCreate(**system_dict)
        
        system = SystemService.create(db, tenant_id, system_data)
        return system
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/systems/{system_id}",
    response_model=SystemResponse,
)
def get_system(
    tenant_id: UUID,
    system_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a system by ID."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:read")
    
    try:
        system = SystemService.get_by_id(db, system_id, tenant_id)
        return system
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/systems/{system_id}",
    response_model=SystemResponse,
)
def update_system(
    tenant_id: UUID,
    system_id: UUID,
    system_data: SystemUpdate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a system."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:update")
    
    try:
        system = SystemService.update(
            db, system_id, tenant_id, system_data
        )
        return system
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.delete(
    "/systems/{system_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_system(
    tenant_id: UUID,
    system_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a system."""
    _check_ropa_permission(db, tenant_id, current_user, "ropa:delete")
    
    try:
        SystemService.delete(db, system_id, tenant_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
