from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from .config import settings

# Database configuration from validated settings
# All values are validated at startup via Pydantic Settings
DB_NAME = settings.POSTGRES_DB
DB_USER = settings.POSTGRES_USER
DB_PASSWORD = settings.POSTGRES_PASSWORD
DB_HOST = settings.POSTGRES_HOST
DB_PORT = settings.POSTGRES_PORT

# Construct database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine with connection pooling
# Pool settings:
# - pool_size: Number of connections to maintain in the pool (default 5)
# - max_overflow: Additional connections beyond pool_size (default 10)
# - pool_pre_ping: Verify connections before using them
# - pool_recycle: Recycle connections after 3600 seconds (1 hour)
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,  # Base pool size
    max_overflow=10,  # Additional connections when needed
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,  # Recycle connections after 1 hour
    connect_args={
        "sslmode": "require"  # SSL required for PostgreSQL
    },
    echo=False  # Set to True for SQL query logging (useful for debugging)
)

# Create SessionLocal class for dependency injection
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


# Dependency function for FastAPI to get database session
def get_db():
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session after the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

