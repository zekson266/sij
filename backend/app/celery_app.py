"""
Celery application configuration for background task processing.

This module configures Celery for handling async tasks like AI suggestion jobs.
"""

from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    "booker",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,  # Disable prefetching for better task distribution
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks to prevent memory leaks
)

# Import tasks to register them
# This import must be at the end to avoid circular imports
# Tasks will be imported when celery worker starts
try:
    from app.modules.ropa import tasks  # noqa: F401
except ImportError:
    # Tasks module may not exist yet during initial setup
    pass

__all__ = ["celery_app"]

