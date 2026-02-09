"""
Celery tasks for ROPA module.

Background tasks for processing AI suggestion jobs.
"""

import logging
from uuid import UUID

from app.celery_app import celery_app
from app.database import SessionLocal
from app.services.openai_service import OpenAIService
from app.modules.ropa.services.suggestion_job import SuggestionJobService
from app.modules.ropa.enums import ROPAEntityType
from app.modules.ropa.metadata import (
    REPOSITORY_FIELD_METADATA,
    ACTIVITY_FIELD_METADATA,
    DATA_ELEMENT_FIELD_METADATA,
    DPIA_FIELD_METADATA,
    RISK_FIELD_METADATA,
)

# Import all models to ensure SQLAlchemy relationships are resolved
# This is necessary for Celery workers which run in separate processes
# Note: Appointment import removed - User model no longer has relationship to Appointment
# This decouples core models from module-specific models
from app.models import User, Tenant, TenantUser  # noqa: F401

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_suggestion_job(self, job_id: str):
    """
    Celery task to process AI suggestion job.
    
    This task:
    1. Retrieves the job from database
    2. Calls OpenAI service to generate suggestions
    3. Updates job with results and cost
    4. Handles errors and retries
    
    Args:
        job_id: UUID string of the job to process
    """
    db = SessionLocal()
    try:
        # Convert string to UUID
        job_uuid = UUID(job_id)
        
        # Get job
        job = SuggestionJobService.get_job(db, job_uuid)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        # Update status to processing
        SuggestionJobService.update_status(db, job_uuid, "processing")
        
        # Extract request data
        request_data = job.request_data
        form_data = request_data.get("form_data", {})
        current_value = request_data.get("current_value", "")
        field_options = request_data.get("field_options", [])
        
        # Extract parent context (activity_context, repository_context, dpia_context, company_context, etc.)
        parent_context = {}
        for key in ["repository_context", "activity_context", "dpia_context", "company_context"]:
            if key in request_data:
                parent_context[key] = request_data[key]
        
        # Fetch metadata for the field based on entity type
        field_metadata = None
        try:
            entity_type = ROPAEntityType(job.entity_type)
            metadata_map = {
                ROPAEntityType.REPOSITORY: REPOSITORY_FIELD_METADATA,
                ROPAEntityType.ACTIVITY: ACTIVITY_FIELD_METADATA,
                ROPAEntityType.DATA_ELEMENT: DATA_ELEMENT_FIELD_METADATA,
                ROPAEntityType.DPIA: DPIA_FIELD_METADATA,
                ROPAEntityType.RISK: RISK_FIELD_METADATA,
            }
            
            if entity_type in metadata_map:
                field_metadata = metadata_map[entity_type].get(job.field_name)
                if field_metadata:
                    logger.debug(f"Found metadata for {entity_type.value}.{job.field_name}")
        except (ValueError, KeyError) as e:
            # If metadata lookup fails, continue without it (non-critical)
            logger.debug(f"Could not fetch metadata for {job.entity_type}.{job.field_name}: {e}")
        
        # Call OpenAI service
        openai_service = OpenAIService()
        result = openai_service.suggest_field_value(
            field_name=job.field_name,
            field_type=job.field_type,
            field_label=job.field_label,
            current_value=current_value,
            form_data=form_data,
            field_options=field_options,
            field_metadata=field_metadata,
            parent_context=parent_context
        )
        
        # Post-process suggestions to enforce cardinality rules (safety net)
        logger.debug(f"Post-processing suggestions for field {job.field_name} (type: {job.field_type}), "
                    f"received {len(result['suggestions']) if isinstance(result['suggestions'], list) else 'non-list'} suggestions")
        
        if job.field_type in ['text', 'select', 'textarea', 'multiline', 'enum']:
            # Single-value field: limit to 1 suggestion
            if not isinstance(result["suggestions"], list):
                # Convert to list if not already
                result["suggestions"] = [result["suggestions"]] if result["suggestions"] else [""]
                logger.debug(f"Converted non-list to list for {job.field_name}")
            elif len(result["suggestions"]) == 0:
                # Empty list, add empty string
                result["suggestions"] = [""]
                logger.debug(f"Empty list, added empty string for {job.field_name}")
            elif len(result["suggestions"]) > 1:
                # Multiple suggestions, limit to first one
                original_count = len(result["suggestions"])
                logger.info(
                    f"Limiting suggestions to 1 for single-value field {job.field_name} "
                    f"(received {original_count} suggestions: {result['suggestions']})"
                )
                result["suggestions"] = [result["suggestions"][0]]
                logger.debug(f"Limited to 1 suggestion: {result['suggestions']}")
            else:
                logger.debug(f"Single suggestion already correct for {job.field_name}: {result['suggestions']}")
        elif job.field_type == 'multiselect':
            # Multiselect field: allow multiple, but limit to reasonable number (e.g., 10)
            if isinstance(result["suggestions"], list) and len(result["suggestions"]) > 10:
                logger.info(
                    f"Limiting suggestions to 10 for multiselect field {job.field_name} "
                    f"(received {len(result['suggestions'])} suggestions)"
                )
                result["suggestions"] = result["suggestions"][:10]
            
            # Post-processing: Split comma-separated strings into individual items (safety net)
            if isinstance(result["suggestions"], list):
                processed_suggestions = []
                for item in result["suggestions"]:
                    if isinstance(item, str):
                        # Check for comma-separated values (with or without spaces)
                        if ',' in item:
                            # Split comma-separated string into individual items
                            # Handle both "US, GB, DE" and "US,GB,DE" formats
                            split_items = [s.strip() for s in item.split(',') if s.strip()]
                            if len(split_items) > 1:
                                # Only split if there are actually multiple items
                                processed_suggestions.extend(split_items)
                                logger.info(
                                    f"Split comma-separated string '{item}' into {len(split_items)} items "
                                    f"for multiselect field {job.field_name}"
                                )
                            else:
                                # Single item after split, keep as is
                                processed_suggestions.append(item)
                        else:
                            # No comma, keep as is
                            processed_suggestions.append(item)
                    else:
                        # Not a string, keep as is
                        processed_suggestions.append(item)
                result["suggestions"] = processed_suggestions
        
        # Update job with results and cost
        SuggestionJobService.complete_job(
            db=db,
            job_id=job_uuid,
            general_statement=result["general_statement"],
            suggestions=result["suggestions"],
            openai_model=result["model"],
            openai_tokens_used=result["tokens_used"],
            openai_cost_usd=result["cost_usd"]
        )
        
        logger.info(f"Successfully processed job {job_id}")
        
    except ValueError as e:
        # Invalid UUID or other value error
        logger.error(f"Value error processing job {job_id}: {str(e)}")
        if job_uuid:
            SuggestionJobService.fail_job(db, job_uuid, f"Invalid request: {str(e)}")
        # Don't retry value errors
        raise
    
    except Exception as exc:
        # Log error
        logger.error(f"Error processing job {job_id}: {str(exc)}", exc_info=True)
        
        # Update job with error
        if 'job_uuid' in locals():
            try:
                SuggestionJobService.fail_job(db, job_uuid, str(exc))
            except Exception as update_error:
                logger.error(f"Failed to update job status: {update_error}")
        
        # Retry if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying job {job_id} (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        else:
            logger.error(f"Job {job_id} failed after {self.max_retries} retries")
            raise
    
    finally:
        db.close()


