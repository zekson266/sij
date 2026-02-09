"""
Appointment model.

Represents a booking/appointment made by a user for a tenant's service.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Appointment(Base):
    """
    Appointment model representing a booking made by a user.

    Each appointment is associated with:
    - A tenant (the service provider)
    - A user (the person making the booking)
    - A service type, date, and time

    Attributes:
        id: Unique identifier (UUID)
        tenant_id: Foreign key to tenants table
        user_id: Foreign key to users table
        service_type: Type of service (consultation, follow-up, check-up, etc.)
        appointment_date: Date of the appointment (DATE type, timezone-agnostic)
        appointment_time: Time slot of the appointment (e.g., "9:00 AM")
        status: Appointment status (pending, confirmed, cancelled, completed)
        notes: Optional notes for the appointment
        guest_name: Guest name (for anonymous bookings, nullable for authenticated users)
        guest_email: Guest email (for anonymous bookings, nullable for authenticated users)
        guest_phone: Guest phone (for anonymous bookings, nullable for authenticated users)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    __tablename__ = "appointments"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Appointment details
    service_type = Column(String(100), nullable=False, index=True)
    appointment_date = Column(Date, nullable=False, index=True)  # Plain DATE (no timezone), e.g., 2025-01-15
    appointment_time = Column(String(50), nullable=False)  # e.g., "9:00 AM", "2:00 PM"
    
    # Status
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, confirmed, cancelled, completed
    
    # Optional notes
    notes = Column(Text, nullable=True)

    # Guest contact information (for anonymous bookings)
    # These fields are populated when user_id points to the guest user
    # For authenticated users, contact info comes from the User model
    guest_name = Column(String(255), nullable=True)
    guest_email = Column(String(255), nullable=True, index=True)
    guest_phone = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships (optional, for easier querying)
    # Note: One-way relationship - User model doesn't have back_populates
    # to maintain core model independence from modules
    # tenant = relationship("Tenant", back_populates="appointments")
    user = relationship("User")
    
    def __repr__(self) -> str:
        """String representation of the appointment."""
        return f"<Appointment(id={self.id}, tenant_id={self.tenant_id}, user_id={self.user_id}, date={self.appointment_date}, time={self.appointment_time})>"



