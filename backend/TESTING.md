# Backend Testing Guide

Comprehensive guide for writing and running backend tests using pytest and FastAPI TestClient.

## Quick Start

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_admin.py

# Run specific test function
pytest tests/test_admin.py::test_list_all_users_as_superuser

# Run with coverage
pytest --cov=app --cov-report=html

# Run tests in watch mode (requires pytest-watch)
ptw
```

## Test Structure

Tests are organized in the `backend/tests/` directory:

```
backend/tests/
├── __init__.py
├── conftest.py          # Shared fixtures and configuration
├── test_admin.py        # Admin endpoint tests
├── test_dependencies.py # Dependency injection tests
└── test_*.py           # Other test files
```

## Test Configuration

### pytest.ini

Located at `backend/pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts = 
    -v
    --strict-markers
    --tb=short
```

### Test Database

Tests use an **in-memory SQLite database** (not PostgreSQL) for speed and isolation:
- Each test gets a fresh database
- Tables are created before each test
- Tables are dropped after each test
- No need to clean up data manually

## Available Fixtures

All fixtures are defined in `tests/conftest.py` and available to all tests.

### Database Fixtures

#### `db`
- **Scope**: `function` (fresh database per test)
- **Returns**: SQLAlchemy session
- **Usage**: Direct database access for setup/verification

```python
def test_something(db):
    # Create test data directly
    user = User(email="test@example.com", ...)
    db.add(user)
    db.commit()
    
    # Query database
    found = db.query(User).filter(User.email == "test@example.com").first()
    assert found is not None
```

#### `client`
- **Scope**: `function`
- **Returns**: FastAPI TestClient
- **Usage**: Make HTTP requests to API endpoints
- **Note**: Automatically uses test database via dependency override

```python
def test_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
```

### User Fixtures

#### `regular_user`
- **Returns**: User model (non-superuser)
- **Email**: `regular@example.com`
- **Password**: `password123` (hashed)
- **Status**: Active, email verified, not superuser

#### `superuser`
- **Returns**: User model (superuser)
- **Email**: `admin@example.com`
- **Password**: `password123` (hashed)
- **Status**: Active, email verified, is superuser

### Token Fixtures

#### `regular_user_token`
- **Returns**: JWT access token string
- **User**: Regular user (from `regular_user` fixture)
- **Usage**: Authenticate requests as regular user

#### `superuser_token`
- **Returns**: JWT access token string
- **User**: Superuser (from `superuser` fixture)
- **Usage**: Authenticate requests as superuser

### Tenant Fixtures

#### `test_tenant`
- **Returns**: Tenant model
- **Name**: "Test Company"
- **Slug**: "test-company"
- **Email**: "test@example.com"
- **Status**: Active, not verified, free tier

## Writing Tests

### Basic Test Structure

```python
"""
Tests for [feature/endpoint name].
"""

import pytest


def test_feature_name(client, db):
    """Test description of what this test verifies."""
    # Arrange: Set up test data
    # Act: Perform the action
    # Assert: Verify the result
    pass
```

### Testing API Endpoints

#### Unauthenticated Request

```python
def test_endpoint_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/protected-endpoint")
    
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]
```

#### Authenticated Request (Regular User)

```python
def test_endpoint_with_auth(client, regular_user_token):
    """Test endpoint with regular user authentication."""
    response = client.get(
        "/api/endpoint",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "expected_field" in data
```

#### Authenticated Request (Superuser)

```python
def test_admin_endpoint_as_superuser(client, superuser_token):
    """Test admin endpoint with superuser."""
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
```

#### Testing Authorization (403 Forbidden)

```python
def test_endpoint_as_regular_user(client, regular_user_token):
    """Test that regular user cannot access admin endpoint."""
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 403
    assert "Superuser access required" in response.json()["detail"]
```

### Testing POST Requests

```python
def test_create_resource(client, superuser_token):
    """Test creating a new resource."""
    response = client.post(
        "/api/resources",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={
            "name": "Test Resource",
            "description": "Test description"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Resource"
    assert "id" in data
```

### Testing PATCH Requests

```python
def test_update_resource(client, superuser_token, test_tenant):
    """Test updating a resource."""
    response = client.patch(
        f"/api/tenants/{test_tenant.id}",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={
            "name": "Updated Name"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
```

### Testing DELETE Requests

```python
def test_delete_resource(client, superuser_token, test_tenant):
    """Test deleting a resource."""
    response = client.delete(
        f"/api/tenants/{test_tenant.id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    
    # Verify deletion
    get_response = client.get(
        f"/api/tenants/{test_tenant.id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert get_response.status_code == 404
```

### Testing Query Parameters

```python
def test_list_with_filters(client, superuser_token, regular_user, superuser):
    """Test filtering resources by query parameters."""
    # Filter by superuser
    response = client.get(
        "/api/admin/users?is_superuser=true",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(user["is_superuser"] is True for user in data)
    
    # Filter by non-superuser
    response = client.get(
        "/api/admin/users?is_superuser=false",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(user["is_superuser"] is False for user in data)
```

### Testing Validation Errors

```python
def test_validation_error(client, superuser_token):
    """Test that invalid data returns validation error."""
    response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={
            "email": "invalid-email",  # Invalid email format
            "password": "123"  # Too short
        }
    )
    
    assert response.status_code == 422
    data = response.json()
    assert "validation error" in data["message"].lower()
    assert "errors" in data
```

### Testing Database State

```python
def test_database_state(db, client, superuser_token):
    """Test that database state is correct after operation."""
    # Create resource via API
    response = client.post(
        "/api/resources",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={"name": "Test"}
    )
    resource_id = response.json()["id"]
    
    # Verify in database directly
    from app.models.resource import Resource
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    assert resource is not None
    assert resource.name == "Test"
```

### Creating Custom Test Data

```python
def test_custom_scenario(db, client, superuser_token):
    """Test with custom test data."""
    # Create custom user
    from app.models.user import User
    from app.utils.password import hash_password
    from uuid import uuid4
    
    custom_user = User(
        id=uuid4(),
        email="custom@example.com",
        hashed_password=hash_password("custompass"),
        is_active=True,
        is_email_verified=True,
    )
    db.add(custom_user)
    db.commit()
    
    # Use in test
    response = client.get(
        f"/api/users/{custom_user.id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
```

## Test Patterns

### Pattern 1: Authentication Testing

Always test three scenarios:
1. **Unauthenticated** (401)
2. **Regular user** (200 or 403)
3. **Superuser** (200)

```python
def test_endpoint_without_auth(client):
    """Test unauthenticated access."""
    response = client.get("/api/protected")
    assert response.status_code == 401

def test_endpoint_as_regular_user(client, regular_user_token):
    """Test as regular user."""
    response = client.get(
        "/api/protected",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    # May be 200 or 403 depending on endpoint

def test_endpoint_as_superuser(client, superuser_token):
    """Test as superuser."""
    response = client.get(
        "/api/protected",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
```

### Pattern 2: CRUD Operations

Test all CRUD operations:

```python
def test_create(client, superuser_token):
    """Test CREATE."""
    response = client.post("/api/resources", ...)
    assert response.status_code == 201

def test_read(client, superuser_token, test_resource):
    """Test READ."""
    response = client.get(f"/api/resources/{test_resource.id}", ...)
    assert response.status_code == 200

def test_update(client, superuser_token, test_resource):
    """Test UPDATE."""
    response = client.patch(f"/api/resources/{test_resource.id}", ...)
    assert response.status_code == 200

def test_delete(client, superuser_token, test_resource):
    """Test DELETE."""
    response = client.delete(f"/api/resources/{test_resource.id}", ...)
    assert response.status_code == 200
```

### Pattern 3: Filtering and Pagination

```python
def test_list_with_filters(client, superuser_token):
    """Test filtering and pagination."""
    # Test filter
    response = client.get(
        "/api/resources?is_active=true&skip=0&limit=10",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["is_active"] is True for item in data)
    assert len(data) <= 10
```

## Best Practices

### 1. Test Naming

Use descriptive names that explain what is being tested:

```python
# Good
def test_list_all_users_as_superuser(client, superuser_token):
def test_create_tenant_requires_authentication(client):
def test_update_tenant_as_owner_succeeds(client, owner_token, test_tenant):

# Bad
def test_users(client):
def test_tenant(client):
```

### 2. Test Organization

Group related tests in the same file:
- `test_admin.py` - Admin endpoint tests
- `test_auth.py` - Authentication tests
- `test_tenants.py` - Tenant endpoint tests
- `test_services.py` - Service layer tests

### 3. Use Fixtures

Leverage existing fixtures instead of creating test data manually:

```python
# Good - uses fixture
def test_something(client, superuser_token, test_tenant):
    response = client.get(f"/api/tenants/{test_tenant.id}", ...)

# Bad - creates data manually
def test_something(client, db, superuser_token):
    tenant = Tenant(name="Test", ...)
    db.add(tenant)
    db.commit()
    response = client.get(f"/api/tenants/{tenant.id}", ...)
```

### 4. Test Isolation

Each test should be independent:
- Don't rely on test execution order
- Don't share state between tests
- Use fixtures for setup (they're isolated per test)

### 5. Assertions

Be specific with assertions:

```python
# Good
assert response.status_code == 200
assert response.json()["name"] == "Expected Name"
assert len(response.json()) >= 2

# Bad
assert response.status_code == 200  # Only checks status, not data
```

### 6. Test Error Cases

Test both success and failure cases:

```python
def test_success_case(client, superuser_token):
    """Test successful operation."""
    # ...

def test_not_found(client, superuser_token):
    """Test 404 error."""
    response = client.get(
        "/api/resources/non-existent-id",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 404

def test_validation_error(client, superuser_token):
    """Test validation error."""
    # ...
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific file
pytest tests/test_admin.py

# Run specific test
pytest tests/test_admin.py::test_list_all_users_as_superuser

# Run tests matching pattern
pytest -k "admin"
```

### With Coverage

```bash
# Install coverage tool
pip install pytest-cov

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Generate HTML coverage report
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### In Docker

```bash
# Run tests in backend container
docker compose exec backend pytest

# Run with verbose output
docker compose exec backend pytest -v

# Run specific test
docker compose exec backend pytest tests/test_admin.py::test_list_all_users_as_superuser
```

## Troubleshooting

### Import Errors

If you get import errors:
```bash
# Make sure you're in the backend directory or using Docker
cd backend
pytest

# Or use Docker
docker compose exec backend pytest
```

### Database Connection Errors

Tests use in-memory SQLite, so connection errors usually mean:
- Fixtures aren't being used correctly
- Database session isn't being overridden properly

Check that you're using the `client` fixture (which handles database override).

### Fixture Not Found

If pytest can't find a fixture:
- Check that it's defined in `conftest.py`
- Verify fixture name spelling
- Make sure fixture is in function parameters

### Tests Failing Due to State

If tests fail intermittently:
- Check that tests are isolated (not sharing state)
- Verify fixtures are scoped correctly
- Make sure database is being reset between tests

## Example Test File

Complete example of a test file:

```python
"""
Tests for tenant API endpoints.
"""

import pytest


def test_create_tenant_requires_auth(client):
    """Test that creating tenant requires authentication."""
    response = client.post(
        "/api/tenants",
        json={
            "name": "Test Company",
            "email": "test@example.com"
        }
    )
    assert response.status_code == 401


def test_create_tenant_as_authenticated_user(client, regular_user_token):
    """Test creating tenant as authenticated user."""
    response = client.post(
        "/api/tenants",
        headers={"Authorization": f"Bearer {regular_user_token}"},
        json={
            "name": "Test Company",
            "email": "test@example.com"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Company"
    assert "id" in data


def test_list_tenants_public(client, test_tenant):
    """Test that listing tenants is public."""
    response = client.get("/api/tenants")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    tenant_ids = [t["id"] for t in data]
    assert str(test_tenant.id) in tenant_ids


def test_update_tenant_requires_auth(client, test_tenant):
    """Test that updating tenant requires authentication."""
    response = client.patch(
        f"/api/tenants/{test_tenant.id}",
        json={"name": "Updated Name"}
    )
    assert response.status_code == 401


def test_update_tenant_as_owner(client, superuser_token, test_tenant):
    """Test updating tenant as owner."""
    response = client.patch(
        f"/api/tenants/{test_tenant.id}",
        headers={"Authorization": f"Bearer {superuser_token}"},
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
```

## Next Steps

1. **Write tests for new endpoints** - Follow the patterns above
2. **Add service layer tests** - Test business logic directly
3. **Add integration tests** - Test complete workflows
4. **Set up CI/CD** - Run tests automatically on commits

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/core/testing.html)

