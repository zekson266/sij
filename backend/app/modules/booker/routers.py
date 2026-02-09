"""
Booker module API routes.

Handles all appointment/booking-related HTTP endpoints.
Routes are prefixed with /booker/ to indicate this is a module.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, date as date_type

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.tenant import Tenant
from app.modules.booker.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.modules.booker.services.appointment import AppointmentService
from app.services.tenant_user import TenantUserService
from app.shared.modules import require_module
from app.utils.access_control import can_access_feature
from app.exceptions import NotFoundError, ConflictError, ValidationError

router = APIRouter(
    prefix="/api/tenants/{tenant_id}/booker",
    tags=["booker"],
)


@router.post(
    "/appointments",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    tenant_id: UUID,
    appointment_data: AppointmentCreate,
    tenant: Tenant = Depends(require_module("booker")),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Create a new appointment for a tenant.
    
    Access control is based on tenant's access_control settings:
    - members_only: Requires authentication and membership
    - authenticated_only: Requires authentication (any user)
    - public: No authentication required (guest bookings)
    
    - **service_type**: Type of service (consultation, follow-up, check-up)
    - **appointment_date**: Date and time of the appointment
    - **appointment_time**: Time slot (e.g., "9:00 AM", "2:00 PM")
    - **notes**: Optional notes for the appointment
    """
    # Check membership status
    is_member = False
    if current_user:
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db,
                tenant_id=tenant_id,
                user_id=current_user.id,
            )
            is_member = tenant_user.is_active if tenant_user else False
        except NotFoundError:
            is_member = False
    
    # Check access control
    if not can_access_feature(
        tenant=tenant,
        feature="booking",
        current_user=current_user,
        is_member=is_member,
    ):
        # Determine appropriate error message
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to book appointments",
            )
        elif not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this tenant to book appointments",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    
    # For public bookings without authentication, user_id will be None
    # The service will handle this appropriately
    user_id = current_user.id if current_user else None
    
    # Create appointment
    try:
        appointment = AppointmentService.create(
            db=db,
            appointment_data=appointment_data,
            tenant=tenant,  # Pass tenant object for timezone context
            user_id=user_id,
        )
        return appointment
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e.message),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create appointment",
        )


@router.get(
    "/appointments",
    response_model=List[AppointmentResponse],
)
def list_tenant_appointments(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("booker")),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List appointments for a tenant.
    
    Requires authentication.
    """
    appointments = AppointmentService.get_by_tenant(
        db=db,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        status=status,
    )
    
    return appointments


@router.get(
    "/appointments/available-slots",
    response_model=List[str],
)
def get_available_slots(
    tenant_id: UUID,
    appointment_date: str = Query(..., description="Date to check for available slots (YYYY-MM-DD)", alias="date"),
    service_type: Optional[str] = Query(None, description="Optional service type to filter by. Each service has its own independent calendar."),
    tenant: Tenant = Depends(require_module("booker")),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Get list of booked time slots for a specific tenant, date, and optionally service type.
    
    Each service type has its own independent calendar. If service_type is provided,
    only returns slots booked for that service. If omitted, returns all booked slots
    (useful for admin views or backward compatibility).
    
    Returns a list of time slot strings that are already booked (e.g., ["9:00 AM", "2:00 PM"]).
    The frontend can use this to filter out unavailable slots from the available list.
    
    This endpoint is public (no authentication required) as availability information
    is not sensitive and users need to see it before attempting to book.
    """
    # Parse date string to date object
    try:
        parsed_date = datetime.strptime(appointment_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD",
        )
    
    booked_slots = AppointmentService.get_booked_slots(
        db=db,
        tenant_id=tenant_id,
        appointment_date=parsed_date,
        service_type=service_type,
    )
    return booked_slots


@router.get(
    "/appointments/first-available-date",
    response_model=str,
)
def get_first_available_date(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("booker")),
    service_type: Optional[str] = Query(None, description="Optional service type to filter by. Each service has its own independent calendar."),
    max_days_ahead: int = Query(60, ge=1, le=365, description="Maximum number of days to search ahead (default: 60)"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Get the first date with available slots for a tenant and optionally service type.
    
    Each service type has its own independent calendar. If service_type is provided,
    only checks slots for that service. If omitted, checks all services combined.
    
    Returns the first date (YYYY-MM-DD format) with available slots, or today if all dates
    are fully booked within the search range.
    
    This endpoint is public (no authentication required) as availability information
    is not sensitive and users need to see it before attempting to book.
    """
    first_date = AppointmentService.get_first_available_date(
        db=db,
        tenant=tenant,  # Pass tenant object for timezone context
        service_type=service_type,
        max_days_ahead=max_days_ahead,
    )
    
    # If no date found with available slots, return 404
    if first_date is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No available dates found within the next {max_days_ahead} days. Please try again later or contact the tenant.",
        )
    
    # Return date as YYYY-MM-DD string
    return first_date.strftime("%Y-%m-%d")


@router.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse,
)
def get_appointment(
    tenant_id: UUID,
    appointment_id: UUID,
    tenant: Tenant = Depends(require_module("booker")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a single appointment by ID.
    
    Requires authentication. User must either:
    - Be the owner of the appointment, OR
    - Be a member (admin/owner) of the tenant that owns the appointment
    """
    # Get appointment
    try:
        appointment = AppointmentService.get_by_id(db, appointment_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    
    # Verify appointment belongs to tenant
    if appointment.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    
    # Check authorization: user owns appointment OR is tenant admin/owner
    is_owner = appointment.user_id == current_user.id
    
    if not is_owner:
        # Check if user is tenant admin/owner
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db,
                tenant_id=tenant_id,
                user_id=current_user.id,
            )
            if not tenant_user.is_active or tenant_user.role not in ["admin", "owner"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view this appointment",
                )
        except NotFoundError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this appointment",
            )
    
    return appointment


@router.patch(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse,
)
def update_appointment(
    tenant_id: UUID,
    appointment_id: UUID,
    appointment_data: AppointmentUpdate,
    tenant: Tenant = Depends(require_module("booker")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update an appointment.
    
    Requires authentication. User must either:
    - Be the owner of the appointment (can update their own), OR
    - Be a member (admin/owner) of the tenant that owns the appointment (can manage all)
    
    All fields are optional. Only provided fields will be updated.
    
    - **service_type**: Type of service (consultation, follow-up, check-up)
    - **appointment_date**: Date and time of the appointment
    - **appointment_time**: Time slot (e.g., "9:00 AM", "2:00 PM")
    - **status**: Appointment status (pending, confirmed, cancelled, completed)
    - **notes**: Optional notes for the appointment
    """
    # Get appointment
    try:
        appointment = AppointmentService.get_by_id(db, appointment_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    
    # Verify appointment belongs to tenant
    if appointment.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    
    # Check authorization: user owns appointment OR is tenant admin/owner
    is_owner = appointment.user_id == current_user.id
    is_tenant_admin = False
    
    if not is_owner:
        # Check if user is tenant admin/owner
        try:
            tenant_user = TenantUserService.get_by_tenant_and_user(
                db,
                tenant_id=tenant_id,
                user_id=current_user.id,
            )
            if tenant_user.is_active and tenant_user.role in ["admin", "owner"]:
                is_tenant_admin = True
        except NotFoundError:
            pass
        
        if not is_tenant_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this appointment",
            )
    
    # Update appointment
    try:
        updated_appointment = AppointmentService.update(
            db=db,
            appointment_id=appointment_id,
            appointment_data=appointment_data,
            tenant=tenant,  # Pass tenant for timezone validation
        )
        return updated_appointment
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e.message),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update appointment",
        )

