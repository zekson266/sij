"""
Pytest configuration and fixtures for testing.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.password import hash_password
from app.utils.jwt import create_access_token
from uuid import uuid4


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Drop tables
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def regular_user(db):
    """Create a regular (non-superuser) user."""
    user = User(
        id=uuid4(),
        email="regular@example.com",
        hashed_password=hash_password("password123"),
        first_name="Regular",
        last_name="User",
        is_active=True,
        is_email_verified=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def superuser(db):
    """Create a superuser."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        hashed_password=hash_password("password123"),
        first_name="Admin",
        last_name="User",
        is_active=True,
        is_email_verified=True,
        is_superuser=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user_token(regular_user):
    """Create JWT token for regular user."""
    return create_access_token(
        user_id=regular_user.id,
        email=regular_user.email,
    )


@pytest.fixture
def superuser_token(superuser):
    """Create JWT token for superuser."""
    return create_access_token(
        user_id=superuser.id,
        email=superuser.email,
    )


@pytest.fixture
def test_tenant(db, superuser):
    """Create a test tenant."""
    tenant = Tenant(
        id=uuid4(),
        name="Test Company",
        slug="test-company",
        email="test@example.com",
        is_active=True,
        is_verified=False,
        subscription_tier="free",
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


