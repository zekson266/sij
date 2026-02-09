"""
Appointment Pydantic schemas for request/response validation.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AppointmentBase(BaseModel):
    """Base appointment schema with common fields."""
    service_type: str = Field(..., min_length=1, max_length=100, description="Type of service (consultation, follow-up, check-up, etc.)")
    appointment_date: date = Field(..., description="Date of the appointment (YYYY-MM-DD format, timezone-agnostic)")
    appointment_time: str = Field(..., min_length=1, max_length=50, description="Time slot (e.g., '9:00 AM', '2:00 PM')")
    notes: Optional[str] = Field(None, description="Optional notes for the appointment")

    # Guest contact fields (for anonymous bookings)
    # At least one of guest_email or guest_phone is required for guest bookings
    guest_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Guest name (required for anonymous bookings)")
    guest_email: Optional[str] = Field(None, max_length=255, description="Guest email (required for anonymous bookings if phone not provided)")
    guest_phone: Optional[str] = Field(None, max_length=50, description="Guest phone (required for anonymous bookings if email not provided)")
    
    @field_validator("service_type")
    @classmethod
    def validate_service_type(cls, v: str) -> str:
        """Validate service type."""
        allowed_types = ["consultation", "follow-up", "check-up"]
        if v.lower() not in allowed_types:
            # Allow custom service types but normalize
            return v.lower().strip()
        return v.lower()
    
    @field_validator("appointment_time")
    @classmethod
    def validate_appointment_time(cls, v: str) -> str:
        """Validate and normalize time format."""
        if v:
            v = v.strip()
            # Basic validation - should contain time format
            if not any(char.isdigit() for char in v):
                raise ValueError("Time must contain numbers")
        return v

    @field_validator("guest_email")
    @classmethod
    def validate_guest_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate guest email format."""
        if v:
            v = v.strip().lower()
            # Basic email validation
            if '@' not in v or '.' not in v.split('@')[-1]:
                raise ValueError("Invalid email format")
        return v


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""
    # tenant_id and user_id will come from context (authenticated user, route param)
    pass


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment (all fields optional)."""
    service_type: Optional[str] = Field(None, min_length=1, max_length=100)
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = Field(None, min_length=1, max_length=50)
    status: Optional[str] = Field(None, max_length=50, description="Appointment status (pending, confirmed, cancelled, completed)")
    notes: Optional[str] = None
    
    @field_validator("service_type")
    @classmethod
    def validate_service_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate service type."""
        if v:
            allowed_types = ["consultation", "follow-up", "check-up"]
            if v.lower() not in allowed_types:
                return v.lower().strip()
            return v.lower()
        return v
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate status."""
        if v:
            allowed_statuses = ["pending", "confirmed", "cancelled", "completed"]
            if v.lower() not in allowed_statuses:
                raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
            return v.lower()
        return v


class UserBasic(BaseModel):
    """Basic user information for appointment responses."""
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class AppointmentResponse(AppointmentBase):
    """Schema for appointment response (includes read-only fields)."""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    user: Optional[UserBasic] = None  # User details (populated for registered users)
    status: str = Field(..., description="Appointment status (pending, confirmed, cancelled, completed)")
    created_at: datetime
    updated_at: datetime

    # Guest contact fields are included from AppointmentBase
    # These will be populated for anonymous bookings, None for authenticated users

    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy models



