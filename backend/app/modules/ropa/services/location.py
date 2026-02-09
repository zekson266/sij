"""
Location service for ROPA module.

Handles all location-related database operations and business rules.
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modules.ropa.models.location import Location
from app.modules.ropa.schemas.location import LocationCreate, LocationUpdate
from app.exceptions import NotFoundError, ConflictError


class LocationService:
    """Service for location operations (global locations)."""

    @staticmethod
    def create(db: Session, location_data: LocationCreate) -> Location:
        """Create a new global location."""
        location_dict = location_data.model_dump(exclude_unset=True)
        
        location = Location(**location_dict)
        
        try:
            db.add(location)
            db.commit()
            db.refresh(location)
            return location
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create location: {str(e)}")

    @staticmethod
    def get_by_id(db: Session, location_id: UUID) -> Location:
        """Get location by ID."""
        location = db.query(Location).filter(
            Location.id == location_id
        ).first()
        
        if not location:
            raise NotFoundError(f"Location with ID {location_id} not found")
        
        return location

    @staticmethod
    def get_all(db: Session) -> List[Location]:
        """List all global locations."""
        return db.query(Location).order_by(Location.name.asc()).all()

    @staticmethod
    def update(
        db: Session,
        location_id: UUID,
        location_data: LocationUpdate
    ) -> Location:
        """Update a location."""
        location = LocationService.get_by_id(db, location_id)
        
        update_dict = location_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(location, field, value)
        
        try:
            db.commit()
            db.refresh(location)
            return location
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to update location: {str(e)}")

    @staticmethod
    def delete(db: Session, location_id: UUID) -> None:
        """Delete a location."""
        location = LocationService.get_by_id(db, location_id)
        db.delete(location)
        db.commit()
