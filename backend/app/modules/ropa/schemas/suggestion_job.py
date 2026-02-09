"""
Suggestion Job schemas.

Pydantic models for AI suggestion job requests and responses.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SuggestionJobRequest(BaseModel):
    """Request to create a suggestion job."""
    
    field_name: str = Field(..., description="Name of the field (e.g., 'description')")
    field_type: str = Field(..., description="Type of field (text, select, multi-select, boolean, etc.)")
    field_label: str = Field(..., description="Human-readable label for the field")
    current_value: str = Field(default="", description="Current value of the field")
    form_data: Dict = Field(..., description="All form fields as context")
    field_options: Optional[List[str]] = Field(default=None, description="Available options for select fields")


class SuggestionJobResponse(BaseModel):
    """Response when creating a suggestion job."""
    
    job_id: UUID = Field(..., description="Job ID")
    status: str = Field(..., description="Job status (pending, processing, completed, failed)")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True


class SuggestionJobStatus(BaseModel):
    """Status of a suggestion job."""
    
    job_id: UUID
    status: str = Field(..., description="Job status (pending, processing, completed, failed)")
    field_name: str
    field_label: str
    general_statement: Optional[str] = Field(None, description="General explanation from AI")
    suggestions: Optional[List] = Field(None, description="List of suggested values")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    openai_model: Optional[str] = Field(None, description="OpenAI model used")
    openai_tokens_used: Optional[int] = Field(None, description="Tokens consumed")
    openai_cost_usd: Optional[float] = Field(None, description="Cost in USD")
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SuggestionJobListItem(BaseModel):
    """Item in a list of suggestion jobs."""
    
    job_id: UUID
    field_name: str
    field_label: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SuggestionJobListResponse(BaseModel):
    """Response when listing suggestion jobs."""
    
    jobs: List[SuggestionJobListItem] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")


