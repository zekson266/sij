"""
Debug logging endpoint for receiving runtime logs from frontend.

Uses Python's logging module (already configured) to log to stdout.
Logs are captured by Docker and can be viewed with `docker logs backend`.
"""

import json
import logging
import time
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)
# Ensure this logger and its handlers are at INFO level
logger.setLevel(logging.INFO)
# Add a handler if none exists (Uvicorn might not propagate)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.propagate = True  # Ensure it propagates to root logger

router = APIRouter(
    prefix="/api/debug",
    tags=["debug"],
)


@router.post("/ingest/{log_id}")
async def ingest_log(
    request: Request,
    log_id: str,
):
    """
    Receive debug logs from frontend and log to stdout via Python logging.
    
    SECURITY: Only enabled when DEBUG=True (disabled in production).
    Logs are captured by Docker and can be viewed with `docker logs backend`.
    """
    # Only allow in debug mode
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debug logging is disabled in production"
        )
    
    try:
        # Read request body
        body = await request.json()
        
        # Add timestamp if missing
        if 'timestamp' not in body:
            body['timestamp'] = int(time.time() * 1000)
        
        # Add log_id to body for tracking
        body['log_id'] = log_id
        
        # Log to stdout (captured by Docker logs)
        # Format as NDJSON for easy parsing
        # Use print() directly - most reliable way to ensure visibility
        import sys
        print(f"DEBUG_LOG: {json.dumps(body)}", file=sys.stderr, flush=True)
        
        return JSONResponse(
            status_code=200,
            content={'status': 'ok'}
        )
    except Exception as e:
        # Don't fail loudly - just log and return error
        logger.warning(f"Debug log ingestion error: {e}")
        return JSONResponse(
            status_code=500,
            content={'status': 'error', 'message': str(e)}
        )


@router.options("/ingest/{log_id}")
async def ingest_log_options(log_id: str):
    """Handle CORS preflight requests."""
    return JSONResponse(
        status_code=200,
        content={}
    )
