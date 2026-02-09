# Architecture Documentation

## Overview

This is a **multi-tenant SaaS application** built with FastAPI, PostgreSQL, and Docker. The architecture follows best practices for scalability, security, and maintainability.

## Core Principles

### 1. Multi-Tenancy (Marketplace Model)
- **Users are global**: A single user can belong to multiple tenants
- **Tenants are isolated**: Each tenant has its own data and settings
- **Flexible relationships**: Users can have different roles in different tenants
- **No hard-coding**: All configuration via environment variables

### 2. Authentication & Authorization
- **JWT-based authentication**: Stateless, scalable
- **Role-Based Access Control (RBAC)**: Hierarchical roles (owner > admin > editor > member > viewer)
- **Permission system**: Granular permissions per role
- **Permissions as source of truth**: Membership APIs return `effective_permissions` for UI gating
- **Email verification**: Required for account activation
- **Password reset**: Secure token-based password recovery

### 3. Database Design
- **PostgreSQL with SSL**: Encrypted connections
- **UUID primary keys**: Better for distributed systems
- **Soft deletes**: `deleted_at` timestamps for data retention
- **JSONB fields**: Flexible metadata storage
- **Connection pooling**: SQLAlchemy with QueuePool
- **Migrations**: Alembic for version-controlled schema changes (single initial migration creates all 15 tables)

### 4. Security
- **Password hashing**: Bcrypt with passlib
- **JWT tokens**: Signed with secret key
- **CORS configuration**: Configurable origins
- **SSL/TLS**: Required for database and web traffic
- **Environment variables**: All secrets in .env (not committed)

## Architecture Layers

### 1. API Layer (`app/routers/`)
- **FastAPI routers**: Organized by domain (auth, tenants, tenant_users)
- **Dependency injection**: Database sessions, authentication, authorization
- **Request/response validation**: Pydantic schemas
- **Error handling**: Centralized exception handlers

### 2. Service Layer (`app/services/`)
- **Business logic**: All database operations and business rules
- **Data access**: SQLAlchemy ORM queries
- **Validation**: Input validation and conflict checking
- **No direct DB access from routers**: All through services

### 3. Model Layer (`app/models/`)
- **SQLAlchemy models**: Database schema representation
- **Relationships**: Foreign keys and relationships
- **Indexes**: Optimized queries
- **Constraints**: Unique constraints, check constraints
- **Decoupling Rule**: Core models (User, Tenant) must NOT have relationships to module models
- **One-Way Relationships**: Module models can reference core models, but not vice versa

### 4. Schema Layer (`app/schemas/`)
- **Pydantic models**: Request/response validation
- **Type safety**: Automatic validation and serialization
- **Documentation**: OpenAPI schema generation

### 5. Utility Layer (`app/utils/`)
- **Password hashing**: `password.py`
- **JWT tokens**: `jwt.py`
- **Verification tokens**: `tokens.py`
- **RBAC utilities**: `rbac.py`
- **Tenant context**: `tenant_context.py`, `tenant_queries.py`

### Tenant Context Resolution Pattern

**Critical**: Tenant context must be resolved from multiple sources with a clear priority order.

**Priority Order (highest to lowest):**
1. **Path parameter `tenant_id`** (UUID in URL) - **RECOMMENDED for tenant-scoped endpoints**
2. Path parameter `tenant_slug` (slug in URL)
3. JWT token `tenant_id` (from authenticated user's context)
4. `X-Tenant-ID` header (for API clients)
5. `X-Tenant-Slug` header (for API clients)
6. Domain/subdomain (for public tenant pages)

**Why Path Parameters First?**
- **Explicit**: Tenant ID is clear in the URL
- **RESTful**: Aligns with resource-based URL design
- **Type-safe**: FastAPI validates UUIDs automatically
- **Debuggable**: Visible in logs and network tools
- **No frontend changes**: Works with existing API calls

**Implementation Pattern:**

```python
# ✅ CORRECT: Path parameter as primary source
@router.get("/{tenant_id}/members")
def list_members(
    tenant_id: UUID,  # Path parameter
    tenant: Tenant = Depends(get_current_tenant),  # FastAPI auto-injects tenant_id
    db: Session = Depends(get_db),
):
    # tenant is already resolved and validated from tenant_id
    ...
```

**Key Files:**
- `backend/app/utils/tenant_context.py` - Core resolution logic
- `backend/app/dependencies.py` - `get_current_tenant()` dependency
- `backend/app/routers/tenant_users.py` - Example usage

**Lessons Learned:**
- Always check path parameters first when they're available in the URL
- FastAPI automatically injects path parameters into dependencies
- Don't rely solely on JWT tokens or headers - they may not always include tenant context
- Path parameters are more explicit and easier to debug than implicit context

### 6. Configuration (`app/config.py`)
- **Pydantic Settings**: Environment variable validation
- **Type safety**: Automatic type conversion
- **Defaults**: Sensible defaults for development
- **Validation**: Fail-fast on invalid configuration

## Database Schema

### Core Tables

1. **users**
   - Global user accounts
   - Email (unique), password hash
   - Personal info, status flags
   - Metadata (JSONB)

2. **tenants**
   - Organizations/companies
   - Name, slug (unique), domain
   - Contact info, subscription tier
   - Settings (JSONB), metadata (JSONB)

3. **tenant_users**
   - Many-to-many relationship
   - User ↔ Tenant with role
   - Permissions (JSONB)
   - Invitation tracking

4. **verification_tokens**
   - Email verification tokens
   - Password reset tokens
   - Single-use, time-limited
   - Expiration tracking

### Model Decoupling Pattern

**Critical Rule**: Core models (User, Tenant) must NEVER have relationships to module-specific models.

#### Why This Matters:
- **Module Independence**: Modules can be disabled/removed without breaking core models
- **SQLAlchemy Initialization**: Core models don't require module imports
- **Celery Workers**: Don't need to import module models for core model usage
- **Scalability**: Adding new modules doesn't clutter core models

#### ✅ CORRECT Pattern:

```python
# Core Model (app/models/user.py)
class User(Base):
    # ✅ NO relationships to module models
    pass

# Module Model (app/modules/booker/models/appointment.py)
class Appointment(Base):
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User")  # ✅ One-way relationship only
```

#### ❌ WRONG Pattern:

```python
# ❌ WRONG: Core model depends on module
class User(Base):
    appointments = relationship("Appointment", back_populates="user")  # ❌ Creates coupling

# ❌ WRONG: Using backref creates implicit relationship on core model
class Appointment(Base):
    user = relationship("User", backref="appointments")  # ❌ Creates User.appointments
```

#### Querying Module Data:

Instead of using relationships, use service methods:

```python
# ✅ CORRECT: Query via service
appointments = AppointmentService.get_by_user(db, user_id=user.id)

# ❌ WRONG: Don't use relationship
appointments = user.appointments  # ❌ Not available
```

#### Examples:
- ✅ `backend/app/models/user.py` - No module relationships
- ✅ `backend/app/modules/booker/models/appointment.py` - One-way to User
- ✅ `backend/app/modules/ropa/models/ai_suggestion_job.py` - One-way to User/Tenant

## API Endpoints

### Authentication (`/api/auth/`)
- `POST /register` - User registration
- `POST /login` - User login (optional tenant context)
- `POST /refresh` - Refresh token (optional tenant switch)
- `POST /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /me` - Get current user
- `GET /tenants` - Get user's tenants

### Tenants (`/api/tenants/`)
- `POST /` - Create tenant
- `GET /` - List tenants
- `GET /{tenant_id}` - Get tenant
- `GET /slug/{slug}` - Get tenant by slug
- `PATCH /{tenant_id}` - Update tenant
- `DELETE /{tenant_id}` - Delete tenant

### Tenant Members (`/api/tenants/{tenant_id}/members/`)
- `POST /` - Invite user to tenant
- `GET /` - List tenant members
- `GET /{user_id}` - Get member
- `PATCH /{user_id}` - Update member (role, permissions)
- `DELETE /{user_id}` - Remove member

## Security Features

### Authentication
- JWT access tokens (configurable expiration)
- Password hashing (bcrypt)
- Email verification required
- Password reset via secure tokens

### Authorization
- Role hierarchy: owner > admin > editor > member > viewer
- Permission-based access control
- Tenant context isolation
- Role management restrictions

### Data Protection
- SSL/TLS for database connections
- Environment variable secrets
- CORS configuration
- Input validation (Pydantic)
- SQL injection prevention (SQLAlchemy ORM)

## Scalability Considerations

### Database
- Connection pooling (SQLAlchemy QueuePool)
- Indexes on frequently queried columns
- JSONB for flexible metadata
- UUIDs for distributed systems

### Application
- Stateless JWT authentication
- Service layer for business logic
- Dependency injection for testability
- Async-ready (FastAPI)

### Deployment
- Docker containerization
- Docker Compose orchestration
- Health checks for services
- Environment-based configuration

## Best Practices Implemented

1. **Separation of Concerns**: Clear layer separation (routers → services → models)
2. **DRY (Don't Repeat Yourself)**: Reusable utilities and dependencies
3. **Type Safety**: Pydantic schemas, type hints
4. **Error Handling**: Centralized exception handling
5. **Configuration Management**: Environment variables with validation
6. **Database Migrations**: Version-controlled schema changes
7. **Security First**: Password hashing, JWT, SSL
8. **Documentation**: Docstrings, OpenAPI schemas
9. **Testing Ready**: Dependency injection enables easy testing
10. **No Hard-coding**: All configuration via environment variables

## Installation & Setup

### Prerequisites
- Docker and Docker Compose
- Domain name (for SSL certificates)
- Python 3.11+ (for install script)

### Installation Steps

1. **Run install script**:
   ```bash
   ./install.sh
   ```

2. **Start services**:
   ```bash
   docker compose up -d
   ```

3. **Run migrations**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Optional: Initial setup**:
   ```bash
   # Set in .env:
   INITIAL_ADMIN_EMAIL=admin@example.com
   INITIAL_ADMIN_PASSWORD=securepassword
   INITIAL_TENANT_NAME=My Company
   
   # Run setup:
   docker compose exec backend python scripts/initial_setup.py
   ```

5. **Build frontend**:
   ```bash
   docker compose up frontend-build
   ```

6. **Start nginx**:
   ```bash
   docker compose up -d nginx
   ```

## Environment Variables

All configuration is via `.env` file. See `install.sh` for complete list.

### Required
- `SECRET_KEY` - JWT signing key (min 32 chars)
- `POSTGRES_PASSWORD` - Database password
- `DOMAIN_NAME` - Application domain

### Optional
- `DEBUG` - Debug mode (default: 0)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 30)
- `CORS_ORIGINS` - Comma-separated origins (default: auto-generated)
- `INITIAL_ADMIN_EMAIL` - Initial admin email
- `INITIAL_TENANT_NAME` - Initial tenant name

## Future Enhancements

1. **Email Service**: Integrate SMTP for email verification/reset
2. **OAuth**: Social login (Google, GitHub, etc.)
3. **Rate Limiting**: API rate limiting
4. **Caching**: Redis for session/token caching
5. **Monitoring**: Logging, metrics, health checks
6. **Testing**: Unit tests, integration tests
7. **CI/CD**: Automated testing and deployment
8. **API Documentation**: Enhanced OpenAPI docs

## Notes for AI Models

This codebase is designed to be:
- **Self-documenting**: Clear naming, docstrings
- **Modular**: Easy to understand and extend
- **Type-safe**: Pydantic and type hints
- **Testable**: Dependency injection, service layer
- **Scalable**: Stateless, connection pooling, indexes
- **Secure**: Best practices for authentication and authorization

When extending this codebase:
1. Follow the existing layer structure
2. Use Pydantic schemas for validation
3. Add business logic to services, not routers
4. Use dependency injection for database sessions
5. Add migrations for schema changes
6. Update this documentation











