"""
Shared validators for ROPA schemas.
"""

from typing import Any, Dict


def convert_empty_string_to_space(data: Any, field_name: str) -> Dict[str, Any] | Any:
    """
    Convert empty strings to single space in model data before validation.
    
    This allows empty strings to pass min_length=1 constraints from base classes.
    The router will detect single space and generate default names/titles.
    
    Args:
        data: Input data (dict or other type)
        field_name: Name of the field to check and convert
        
    Returns:
        Modified data dict if input was dict, otherwise unchanged
    """
    if isinstance(data, dict) and field_name in data:
        field_value = data[field_name]
        if field_value == '' or (isinstance(field_value, str) and field_value.strip() == ''):
            data[field_name] = ' '  # Single space passes min_length=1, router handles it
    return data


