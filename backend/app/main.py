import logging
from typing import Optional
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import get_db
from .exceptions import AppException, DatabaseError
from .schemas.common import HealthResponse, ErrorResponse
from .config import settings
from .routers import tenants, tenant_users, tenant_invitations, auth, admin, oauth, debug
from .modules.booker import routers as booker_routers
from .modules.ropa import routers as ropa_routers
from .dependencies import get_current_user_optional
from .models.user import User

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Booker application API",
    debug=settings.DEBUG
)

# Configure CORS middleware
# This must be added before other middleware and routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.cors_methods_list,
    allow_headers=settings.cors_headers_list,
    expose_headers=["*"],  # Expose all headers to the client
)

logger.info(f"CORS configured with allowed origins: {settings.cors_origins_list}")

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

logger.info("Rate limiting configured")

# Include routers
# Core routers (auth, tenants, etc.)
app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(tenants.router)
app.include_router(tenant_users.router)
app.include_router(tenant_invitations.router)
app.include_router(admin.router)
app.include_router(debug.router)

# Module routers (booker, ropa, etc.)
# Module routes are more specific (include /booker/, /ropa/ prefixes)
app.include_router(booker_routers.router)
app.include_router(ropa_routers.router)

# Global exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    logger.error(
        f"Application error: {exc.message}",
        extra={"status_code": exc.status_code, "path": request.url.path}
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=True,
            message=exc.message,
            status_code=exc.status_code
        ).model_dump()
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database-related exceptions."""
    logger.error(
        f"Database error: {str(exc)}",
        extra={"path": request.url.path},
        exc_info=True
    )
    return JSONResponse(
        status_code=503,
        content=ErrorResponse(
            error=True,
            message="Database operation failed",
            detail="Service temporarily unavailable. Please try again later.",
            status_code=503
        ).model_dump()
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    from .schemas import ErrorDetail
    
    errors = []
    for error in exc.errors():
        errors.append(ErrorDetail(
            field=".".join(str(loc) for loc in error.get("loc", [])),
            message=error.get("msg", "Validation error")
        ))
    
    logger.warning(
        f"Validation error: {[e.model_dump() for e in errors]}",
        extra={"path": request.url.path}
    )
    
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error=True,
            message="Validation error",
            detail="The request contains invalid data",
            errors=errors,
            status_code=422
        ).model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other unhandled exceptions."""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={"path": request.url.path},
        exc_info=True
    )
    
    # Don't expose internal error details in production
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error=True,
            message="Internal server error",
            detail="An unexpected error occurred. Please try again later.",
            status_code=500
        ).model_dump()
    )


@app.get("/api/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint that verifies database connectivity.
    Uses connection pooling via SQLAlchemy dependency injection.
    """
    try:
        # Execute query using SQLAlchemy session
        result = db.execute(text("SELECT current_database() AS db, current_user AS user;"))
        row = result.fetchone()
        
        if not row:
            raise DatabaseError("Unable to retrieve database information")
        
        return HealthResponse(
            status="ok",
            database=row[0],  # current_database()
            db_user=row[1],   # current_user
        )
    except SQLAlchemyError as e:
        logger.error(f"Database health check failed: {str(e)}", exc_info=True)
        raise DatabaseError("Database connection failed")
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        raise DatabaseError("Health check failed")


@app.get("/api/hello")
def hello():
    """Simple hello endpoint for testing."""
    return {"message": f"Hello from FastAPI on {settings.DOMAIN_NAME}"}


@app.get("/api/test-optional-auth")
def test_optional_auth(
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Test endpoint for optional authentication.
    
    This endpoint works with or without authentication.
    """
    if user:
        return {
            "authenticated": True,
            "user_id": str(user.id),
            "email": user.email,
            "message": "You are authenticated"
        }
    else:
        return {
            "authenticated": False,
            "message": "You are not authenticated (this is OK for public endpoints)"
        }
