"""
Shared enum utilities for ROPA models.
"""

from sqlalchemy import Column, String
from sqlalchemy.types import TypeDecorator


class EnumValueType(TypeDecorator):
    """Custom type that stores enum values (not names) in the database."""

    impl = String
    cache_ok = True

    def __init__(self, enum_class, length=None, *args, **kwargs):
        # Set a reasonable default length if not provided
        if length is None:
            # Find the longest enum value
            max_length = max(len(member.value) for member in enum_class)
            length = max(max_length, 50)  # At least 50 chars
        super().__init__(length=length, *args, **kwargs)
        self.enum_class = enum_class

    def process_bind_param(self, value, dialect):
        """Convert Python enum to database value."""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        if isinstance(value, str):
            # Already a string, return as-is
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        """Convert database value to Python enum."""
        if value is None:
            return None
        # Handle both string and enum values
        if isinstance(value, self.enum_class):
            return value
        # Find enum member by value (case-insensitive for safety)
        value_str = str(value).lower()
        for member in self.enum_class:
            if member.value.lower() == value_str:
                return member
        # If not found, return the value as-is (might be a new enum value)
        return value


def create_enum_column(enum_class, **kwargs):
    """Create an enum column that stores enum values as strings."""
    # Use String with TypeDecorator instead of Enum to avoid SQLAlchemy detecting PostgreSQL enum types
    return Column(EnumValueType(enum_class), **kwargs)
