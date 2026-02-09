"""
Appointment service for business logic and data access.

Handles all appointment-related database operations and business rules.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, func

from app.modules.booker.models.appointment import Appointment
from app.models.tenant import Tenant
from app.models.user import User
from app.modules.booker.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.exceptions import NotFoundError, ConflictError, ValidationError
from app.utils.password import hash_password


class AppointmentService:
    """Service for appointment operations."""

    @staticmethod
    def _get_tenant_today(tenant: Tenant) -> date:
        """
        Get today's date in the tenant's timezone.

        Args:
            tenant: Tenant instance with timezone information

        Returns:
            Today's date in tenant's timezone
        """
        try:
            tz = ZoneInfo(tenant.timezone or 'UTC')
        except Exception:
            # Fallback to UTC if timezone is invalid
            tz = ZoneInfo('UTC')

        return datetime.now(tz).date()

    @staticmethod
    def _get_or_create_guest_user(db: Session) -> User:
        """
        Get or create a guest user for public bookings.
        
        Args:
            db: Database session
            
        Returns:
            Guest User instance
        """
        # Try to find existing guest user
        guest_email = "guest@booker.app"
        guest_user = db.query(User).filter(User.email == guest_email).first()
        
        if guest_user:
            return guest_user
        
        # Create guest user if it doesn't exist
        # Use a random password hash (guest users can't log in)
        dummy_password = hash_password("guest_user_no_login_allowed")
        guest_user = User(
            email=guest_email,
            hashed_password=dummy_password,
            first_name="Guest",
            last_name="User",
            is_active=True,
            is_email_verified=False,
            is_superuser=False,
        )
        
        try:
            db.add(guest_user)
            db.commit()
            db.refresh(guest_user)
            return guest_user
        except IntegrityError:
            db.rollback()
            # If creation fails (e.g., race condition), try to get it again
            guest_user = db.query(User).filter(User.email == guest_email).first()
            if guest_user:
                return guest_user
            raise ConflictError("Failed to create guest user")
    
    @staticmethod
    def create(
        db: Session,
        appointment_data: AppointmentCreate,
        tenant: Tenant,
        user_id: Optional[UUID],
    ) -> Appointment:
        """
        Create a new appointment.

        Args:
            db: Database session
            appointment_data: Appointment creation data
            tenant: Tenant instance (for timezone context)
            user_id: User UUID (from context)

        Returns:
            Created Appointment instance

        Raises:
            ValidationError: If appointment date is in the past
            ConflictError: If time slot is already booked
        """
        # Get today's date in tenant's timezone for validation
        tenant_today = AppointmentService._get_tenant_today(tenant)

        # Validate appointment date is not in the past (in tenant's timezone)
        if appointment_data.appointment_date < tenant_today:
            raise ValidationError("Cannot create appointment in the past")

        # Check if time slot is already booked for this tenant, date, and service type
        # Each service type has its own independent calendar
        # Note: No func.date() needed anymore since appointment_date is DATE type
        existing = db.query(Appointment).filter(
            and_(
                Appointment.tenant_id == tenant.id,
                Appointment.appointment_date == appointment_data.appointment_date,
                Appointment.appointment_time == appointment_data.appointment_time,
                Appointment.service_type == appointment_data.service_type,  # Service-specific calendar
                Appointment.status.in_(["pending", "confirmed"]),  # Only check active appointments
            )
        ).first()

        if existing:
            raise ConflictError(f"Time slot {appointment_data.appointment_time} is already booked for {appointment_data.service_type} on this date")

        # For public bookings without a user, use guest user and validate contact info
        if user_id is None:
            # Validate guest contact information
            if not appointment_data.guest_name:
                raise ValidationError("Name is required for guest bookings")

            if not appointment_data.guest_email and not appointment_data.guest_phone:
                raise ValidationError("Email or phone number is required for guest bookings")

            guest_user = AppointmentService._get_or_create_guest_user(db)
            user_id = guest_user.id

        # Create appointment - appointment_date is already a date object
        appointment = Appointment(
            tenant_id=tenant.id,
            user_id=user_id,
            service_type=appointment_data.service_type,
            appointment_date=appointment_data.appointment_date,  # Plain DATE object
            appointment_time=appointment_data.appointment_time,
            status="pending",
            notes=appointment_data.notes,
            # Guest contact fields (only populated for anonymous bookings)
            guest_name=appointment_data.guest_name,
            guest_email=appointment_data.guest_email,
            guest_phone=appointment_data.guest_phone,
        )

        try:
            db.add(appointment)
            db.commit()
            db.refresh(appointment)
            return appointment
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to create appointment due to constraint violation")
    
    @staticmethod
    def get_by_id(db: Session, appointment_id: UUID) -> Appointment:
        """
        Get appointment by ID.

        Args:
            db: Database session
            appointment_id: Appointment UUID

        Returns:
            Appointment instance

        Raises:
            NotFoundError: If appointment not found
        """
        appointment = db.query(Appointment).options(joinedload(Appointment.user)).filter(Appointment.id == appointment_id).first()
        
        if not appointment:
            raise NotFoundError(f"Appointment with ID {appointment_id} not found")
        
        return appointment
    
    @staticmethod
    def get_by_tenant(
        db: Session,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> List[Appointment]:
        """
        Get appointments for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter

        Returns:
            List of Appointment instances
        """
        query = db.query(Appointment).options(joinedload(Appointment.user)).filter(Appointment.tenant_id == tenant_id)
        
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_user(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> List[Appointment]:
        """
        Get appointments for a user.

        Args:
            db: Database session
            user_id: User UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter

        Returns:
            List of Appointment instances
        """
        query = db.query(Appointment).options(joinedload(Appointment.user)).filter(Appointment.user_id == user_id)
        
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_booked_slots(
        db: Session,
        tenant_id: UUID,
        appointment_date: date,
        service_type: Optional[str] = None,
    ) -> List[str]:
        """
        Get list of booked time slots for a specific date and optionally service type.

        Each service type has its own independent calendar. If service_type is provided,
        only returns slots booked for that service. If None, returns all booked slots
        (useful for admin views or backward compatibility).

        Args:
            db: Database session
            tenant_id: Tenant UUID
            appointment_date: Date to check (plain date object)
            service_type: Optional service type to filter by. If None, returns all services.

        Returns:
            List of booked time slot strings (e.g., ["9:00 AM", "2:00 PM"])
        """
        # No func.date() needed - appointment_date is already DATE type
        query = db.query(Appointment).filter(
            and_(
                Appointment.tenant_id == tenant_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_(["pending", "confirmed"]),  # Only active appointments
            )
        )

        # Filter by service type if provided
        if service_type is not None:
            query = query.filter(Appointment.service_type == service_type)

        appointments = query.all()

        return [appt.appointment_time for appt in appointments]
    
    @staticmethod
    def get_first_available_date(
        db: Session,
        tenant: Tenant,
        service_type: Optional[str] = None,
        max_days_ahead: int = 60,
        total_slots_per_day: int = 9,
    ) -> Optional[date]:
        """
        Find the first date with available slots for a tenant and optionally service type.

        Each service type has its own independent calendar. If service_type is provided,
        only checks slots for that service. If None, checks all services combined.

        Args:
            db: Database session
            tenant: Tenant instance (for timezone context)
            service_type: Optional service type to filter by. If None, checks all services.
            max_days_ahead: Maximum number of days to search ahead (default: 60)
            total_slots_per_day: Total number of time slots per day (default: 9 for 9 AM - 5 PM)

        Returns:
            First date with available slots, or None if all dates are fully booked within range
        """
        # Start from today in tenant's timezone
        start_date = AppointmentService._get_tenant_today(tenant)
        end_date = start_date + timedelta(days=max_days_ahead)

        # Iterate through dates starting from today, checking each one until we find available slots
        # This ensures we find the truly first available date chronologically, including dates
        # with zero appointments (which wouldn't appear in a grouped query)
        current_date = start_date
        while current_date <= end_date:
            # Count bookings for this specific date
            date_query = db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.tenant_id == tenant.id,
                    Appointment.appointment_date == current_date,
                    Appointment.status.in_(["pending", "confirmed"]),  # Only active appointments
                )
            )

            if service_type is not None:
                date_query = date_query.filter(Appointment.service_type == service_type)

            booked_count = date_query.scalar() or 0

            # If this date has available slots, return it
            if booked_count < total_slots_per_day:
                return current_date

            # Move to next day
            current_date += timedelta(days=1)

        # If we've checked all dates in range and none have available slots, return None
        return None
    
    @staticmethod
    def update(
        db: Session,
        appointment_id: UUID,
        appointment_data: AppointmentUpdate,
        tenant: Optional[Tenant] = None,
    ) -> Appointment:
        """
        Update an appointment.

        Args:
            db: Database session
            appointment_id: Appointment UUID
            appointment_data: Appointment update data
            tenant: Optional Tenant instance (for timezone validation if updating date)

        Returns:
            Updated Appointment instance

        Raises:
            NotFoundError: If appointment not found
            ValidationError: If validation fails
        """
        appointment = AppointmentService.get_by_id(db, appointment_id)

        # Update fields if provided
        if appointment_data.service_type is not None:
            appointment.service_type = appointment_data.service_type
        if appointment_data.appointment_date is not None:
            # Validate date is not in the past (in tenant's timezone)
            if tenant:
                tenant_today = AppointmentService._get_tenant_today(tenant)
                if appointment_data.appointment_date < tenant_today:
                    raise ValidationError("Cannot set appointment date in the past")
            else:
                # Fallback if tenant not provided (use UTC)
                if appointment_data.appointment_date < datetime.now(ZoneInfo('UTC')).date():
                    raise ValidationError("Cannot set appointment date in the past")
            appointment.appointment_date = appointment_data.appointment_date
        if appointment_data.appointment_time is not None:
            appointment.appointment_time = appointment_data.appointment_time
        if appointment_data.status is not None:
            appointment.status = appointment_data.status
        if appointment_data.notes is not None:
            appointment.notes = appointment_data.notes

        try:
            db.commit()
            db.refresh(appointment)
            return appointment
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to update appointment due to constraint violation")
    
    @staticmethod
    def cancel(
        db: Session,
        appointment_id: UUID,
    ) -> Appointment:
        """
        Cancel an appointment (soft delete by setting status to cancelled).
        
        Args:
            db: Database session
            appointment_id: Appointment UUID
            
        Returns:
            Updated Appointment instance
            
        Raises:
            NotFoundError: If appointment not found
        """
        appointment = AppointmentService.get_by_id(db, appointment_id)
        appointment.status = "cancelled"
        
        try:
            db.commit()
            db.refresh(appointment)
            return appointment
        except IntegrityError as e:
            db.rollback()
            raise ConflictError("Failed to cancel appointment")



