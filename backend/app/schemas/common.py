"""
Common Pydantic schemas used across the application.
"""

from pydantic import BaseModel
from typing import Optional, Any, Dict, List


class ErrorDetail(BaseModel):
    """Detail about a specific error."""
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: bool = True
    message: str
    detail: Optional[str] = None
    errors: Optional[List[ErrorDetail]] = None
    status_code: int


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    database: Optional[str] = None
    db_user: Optional[str] = None


class SuccessResponse(BaseModel):
    """Standard success response format."""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

