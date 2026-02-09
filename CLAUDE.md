# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS application (Booker) built with FastAPI backend, React frontend, PostgreSQL database, and Docker deployment.

**Tech Stack:**
- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL, Google Auth, Authlib
- Frontend: React 19, TypeScript, Material UI 7, Vite, React Hook Form, Zod, @react-oauth/google
- Infrastructure: Docker Compose, Nginx

## Quick Reference

**Most Common Commands:**
```bash
# Start services
docker compose up -d

# Frontend rebuild (after UI changes)
./scripts/build-frontend.sh && docker compose restart nginx

# Backend restart (after code changes, no new deps)
docker compose restart backend

# Run backend tests
docker compose exec backend pytest

# Run frontend build check
cd frontend && npm run build

# View logs
docker compose logs -f backend
```

## Essential Commands

### Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f nginx

# Stop services
docker compose down
```

### Frontend

```bash
# Development (inside frontend directory)
cd frontend
npm run dev

# Build production bundle
npm run build

# Type checking
tsc -b

# Linting
npm run lint

# Testing
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

### Backend

```bash
# Run backend tests
docker compose exec backend pytest

# Run specific test
docker compose exec backend pytest tests/test_admin.py::test_list_all_users_as_superuser

# Run with verbose output
docker compose exec backend pytest -v

# Database migrations
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "description"

# Restart backend (after code changes)
docker compose restart backend
```

### Rebuild After Changes

**Frontend changes only:**
```bash
./scripts/build-frontend.sh && docker compose restart nginx
```

**Backend changes (no new dependencies):**
```bash
docker compose restart backend
```

**New dependencies or Dockerfile changes:**
```bash
./rebuild.sh
```

## Architecture

### Service Layer Pattern (Backend)

The backend follows a strict **service layer pattern**:

```
API Layer (Routers) → Service Layer → Model Layer → Database
```

- **Routers** (`app/routers/`): Thin API endpoints, handle HTTP concerns only
- **Services** (`app/services/`): All business logic lives here
- **Models** (`app/models/`): SQLAlchemy database models
- **Schemas** (`app/schemas/`): Pydantic request/response validation

**CRITICAL:** Business logic MUST be in services, NOT routers. Routers should only:
1. Parse request data
2. Call service methods
3. Return responses

### Multi-Tenancy Architecture

**Marketplace Model**: Users can belong to multiple tenants with different roles.

- Tenant isolation via `tenant_id` foreign keys
- Role-based access control (RBAC) per tenant
- Hierarchical roles: owner > admin > editor > member > viewer
- Permission checks in service layer
- Membership APIs return `effective_permissions` for UI gating
- **Tenant context resolution**: Path parameters (highest priority) → JWT token → Headers → Domain

**Tenant Context Resolution:**
- Path parameters (`tenant_id` in URL) are the primary source (explicit, RESTful, type-safe)
- FastAPI automatically injects path parameters into dependencies
- Fallback to JWT token, headers, or domain for routes without path parameters
- See "Tenant Context Resolution" pattern below for details

### Frontend Architecture

```
src/
├── components/       # Reusable UI components
│   ├── layout/      # PageLayout, AppBar, navigation
│   ├── common/      # Shared components
│   └── booking/     # Domain-specific components
├── pages/           # Route components
├── routes/          # React Router 7 route configuration
├── services/        # API client services
├── contexts/        # React contexts (auth, notifications)
├── schemas/         # Zod validation schemas
├── types/           # TypeScript type definitions
└── utils/           # Helper functions
```

**Component Hierarchy:**
- All pages use `PageLayout` wrapper (never `Container` directly)
- Centralized notification system via `useNotification()` hook
- API calls use centralized `apiGet/apiPost/apiPatch/apiDelete` from `services/api.ts`

**Routing (React Router 7):**
- Routes configured in `src/routes/` directory
- Uses modern React Router 7.10.1 patterns
- Client-side navigation with `useNavigate()` hook
- Route parameters accessed via `useParams()`

### Authentication Flow

- **JWT tokens** stored in HttpOnly cookies
- **Access tokens**: Short-lived (configurable)
- **Refresh tokens**: Long-lived, rotated on use
- Cross-subdomain support via cookie domain configuration
- 401 responses trigger automatic token refresh or redirect to login

### Google OAuth Authentication

**Implementation:** Sign in with Google using `@react-oauth/google` library.

**Backend:**
- **Endpoint:** `POST /api/auth/google`
- **Models:** `OAuthAccount` table stores OAuth provider linkages
- **Service:** `OAuthService` handles Google token verification and user creation
- **Auto-linking:** If user exists with same email, Google account automatically links to existing user
- **OAuth-only users:** Users can have `null` password if they only use Google Sign-In

**Frontend:**
- **Library:** `@react-oauth/google` version ^0.12.1
- **Component:** `<GoogleLogin />` with minimal props (no customization)
- **Provider:** App wrapped with `<GoogleOAuthProvider clientId={...}>`
- **Configuration:** `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`
- **Flow:** On success → store user data → redirect to `/tenants` (then workspace for single-tenant users)

**Key Files:**
- Backend: `app/models/oauth_account.py`, `app/services/oauth.py`, `app/routers/oauth.py`
- Frontend: `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`
- Migration: `oauth_accounts` table created by `001_initial_complete_schema.py` (single initial migration)

**Configuration:**
```env
# Backend (.env)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Frontend (frontend/.env)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**CSP Headers:** Updated to allow Google OAuth domains (accounts.google.com, apis.google.com, oauth2.googleapis.com)

## Critical Patterns to Follow

### 1. React useEffect Dependencies

**WRONG:**
```typescript
React.useEffect(() => {
  reset({ name: tenant.name });
}, [tenant, reset]); // ❌ Resets on every object reference change
```

**CORRECT:**
```typescript
React.useEffect(() => {
  reset({ name: tenant.name });
}, [tenant?.id, reset]); // ✅ Only resets when tenant ID changes
```

**Why:** Object references change on every render, causing forms to reset while user is typing. Use primitive IDs in dependency arrays.

**Reference:** `frontend/REACT_HOOKS_GUIDELINES.md`

### 2. Layout Standards

**ALL pages must use PageLayout:**

```typescript
import { PageLayout } from '@/components/layout';

<PageLayout
  maxWidth="md"  // Standard for main pages ("xs" for auth pages only)
  title="Page Title"
  description="Optional description"
  actions={<Button>Action</Button>}
>
  <Paper sx={{ p: 4 }}>Content</Paper>
</PageLayout>
```

**Rules:**
- Never use `Container` directly
- Use `maxWidth="md"` for all main pages
- Use `maxWidth="xs"` ONLY for auth pages (login, register)
- Never nest `maxWidth` constraints inside Paper/Card
- Always use `p: 4` padding on Paper components

**Reference:** `frontend/LAYOUT_GUIDELINES.md`

### 3. Notification System

**WRONG:**
```typescript
const [error, setError] = React.useState<string | null>(null);
return <Alert severity="error">{error}</Alert>;
```

**CORRECT:**
```typescript
import { useNotification } from '@/contexts';

const { showSuccess, showError } = useNotification();

try {
  await updateTenant(id, data);
  showSuccess('Tenant updated successfully!');
} catch (err) {
  showError(err?.message || 'Failed to update tenant');
}
```

**Why:** Centralized system provides consistent UX across all components.

### 4. API Service Pattern

**WRONG:**
```typescript
const response = await fetch('/api/tenants');
const data = await response.json();
```

**CORRECT:**
```typescript
import { apiGet, apiPost } from '@/services/api';

const tenants = await apiGet<Tenant[]>('/api/tenants');
const newTenant = await apiPost<Tenant>('/api/tenants', data);
```

**Why:** Centralized functions handle authentication, error handling, and type safety.

**Reference:** `frontend/API_PATTERNS.md`

### 5. Backend Service Layer

**WRONG (logic in router):**
```python
@router.post("/tenants")
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    if db.query(Tenant).filter(Tenant.slug == data.slug).first():
        raise HTTPException(409, "Slug exists")
    tenant = Tenant(**data.dict())
    db.add(tenant)
    db.commit()
    return tenant
```

**CORRECT (logic in service):**
```python
@router.post("/tenants")
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    return TenantService.create(db=db, tenant_data=data, owner_id=current_user.id)
```

**Why:** Keeps routers thin, business logic reusable and testable.

### 6. Tenant Context Resolution

**CRITICAL**: Always prioritize path parameters for tenant identification.

**WRONG (missing path parameter support):**
```python
def get_current_tenant(
    request: Request,
    db: Session = Depends(get_db),
    token_data: Optional[TokenData] = Depends(get_current_user_token),
) -> Tenant:
    # Only checks token/headers, ignores tenant_id in URL path
    tenant = get_tenant_context(request, db, token_data)
    ...
```

**CORRECT (path parameter first):**
```python
@router.get("/{tenant_id}/members")
def list_members(
    tenant_id: UUID,  # Path parameter
    tenant: Tenant = Depends(get_current_tenant),  # FastAPI auto-injects tenant_id
):
    # tenant is resolved from path parameter (highest priority)
    ...
```

**Priority Order:**
1. Path parameter `tenant_id` (UUID in URL) - **highest priority**
2. Path parameter `tenant_slug` (slug in URL)
3. JWT token `tenant_id`
4. `X-Tenant-ID` header
5. `X-Tenant-Slug` header
6. Domain/subdomain

**Why:** Path parameters are explicit, RESTful, type-safe, and easier to debug. FastAPI automatically injects path parameters into dependencies.

**Reference:** `backend/app/utils/tenant_context.py`, `backend/app/dependencies.py`

## Database Migrations

All database changes require Alembic migrations:

```bash
# After modifying models
docker compose exec backend alembic revision --autogenerate -m "Add booking table"

# Review generated migration in backend/alembic/versions/

# Apply migration
docker compose exec backend alembic upgrade head

# Rollback one version
docker compose exec backend alembic downgrade -1
```

**Never modify the database schema manually.** Always use migrations.

**Reference:** `backend/ALEMBIC_SETUP.md`

## Timezone Handling

### Critical Pattern: Date-Only Fields

**NEVER use `.toISOString()` for date-only fields.** This causes timezone conversion bugs that create booking conflicts.

#### The Problem

```typescript
// ❌ WRONG - Causes date shifts for UTC+ timezones
const appointmentDate = data.date.toISOString();
// User in UTC+10 selects "Jan 15"
// Result: "2025-01-14T14:00:00.000Z"
// Stored as: Jan 14 ← WRONG DATE!
```

This bug caused real user issues: users in different timezones saw different availability, and got "already booked" errors when trying to book available slots.

#### The Solution

```typescript
// ✅ CORRECT - Timezone-agnostic date string
const appointmentDate = data.date.format('YYYY-MM-DD');
// Result: "2025-01-15" ← CORRECT for all timezones
```

### Tenant Timezone Architecture

**How It Works:**
- Each tenant has a `timezone` field (IANA format, e.g., "America/New_York", "Europe/London")
- Default timezone: **"UTC"** for all new tenants
- Database stores appointment dates as **DATE type** (timezone-agnostic)
- Backend validates dates in tenant's local timezone using `_get_tenant_today()`

**Database Schema:**
```python
# backend/app/models/tenant.py
timezone = Column(String(50), default="UTC", nullable=False, index=True)

# backend/app/models/appointment.py
appointment_date = Column(Date, nullable=False, index=True)  # Plain DATE, not TIMESTAMP
```

### Frontend Implementation

**Always use `.format('YYYY-MM-DD')` for date serialization:**

```typescript
// frontend/src/services/bookingApi.ts
export async function createAppointment(
  tenantId: string,
  data: { date: Dayjs; timeSlot: string; ... }
): Promise<Appointment> {
  // ✅ Send date as plain YYYY-MM-DD string (timezone-agnostic)
  const appointmentDate = data.date.format('YYYY-MM-DD');

  const appointmentData: AppointmentCreate = {
    service_type: data.service_type,
    appointment_date: appointmentDate,  // Plain date string
    appointment_time: data.timeSlot,
  };

  return apiPost<Appointment>(`/api/tenants/${tenantId}/appointments`, appointmentData);
}
```

### Backend Implementation

**Service layer uses tenant timezone for validation:**

```python
# backend/app/services/appointment.py
from zoneinfo import ZoneInfo

@staticmethod
def _get_tenant_today(tenant: Tenant) -> date:
    """Get today's date in the tenant's timezone."""
    try:
        tz = ZoneInfo(tenant.timezone or 'UTC')
    except Exception:
        tz = ZoneInfo('UTC')  # Fallback to UTC if invalid
    return datetime.now(tz).date()

@staticmethod
def create(
    db: Session,
    appointment_data: AppointmentCreate,
    tenant: Tenant,  # ← Tenant object passed for timezone context
    user_id: Optional[UUID],
) -> Appointment:
    # Get today's date in tenant's timezone
    tenant_today = AppointmentService._get_tenant_today(tenant)

    # Validate appointment date is not in the past (in tenant's timezone)
    if appointment_data.appointment_date < tenant_today:
        raise ValidationError("Cannot create appointment in the past")

    # ... rest of creation logic
```

**Router passes tenant object (not just ID):**

```python
# backend/app/routers/appointments.py
@router.post("/{tenant_id}/appointments")
def create_appointment(
    tenant_id: UUID,
    appointment_data: AppointmentCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Get tenant object for timezone context
    tenant = TenantService.get_by_id(db, tenant_id)

    # Pass tenant object (not ID) to service
    appointment = AppointmentService.create(
        db=db,
        appointment_data=appointment_data,
        tenant=tenant,  # ← Provides timezone context
        user_id=user_id,
    )
    return appointment
```

### Changing Tenant Timezone

**Current State:** Timezone field is not exposed in API or UI (internal field only).

**To change timezone manually:**
```sql
-- Connect to database
UPDATE tenants
SET timezone = 'America/New_York'
WHERE slug = 'your-tenant-slug';
```

**Future Enhancement:** Add timezone management UI for tenant owners.

### Key Files

- **Models:**
  - `backend/app/models/tenant.py` - Tenant.timezone field
  - `backend/app/models/appointment.py` - appointment_date as DATE type

- **Services:**
  - `backend/app/services/appointment.py` - Timezone-aware validation (`_get_tenant_today()`)

- **API:**
  - `backend/app/routers/appointments.py` - Passes tenant objects for timezone context
  - `frontend/src/services/bookingApi.ts` - Date serialization with `.format()`

- **Schemas:**
  - `backend/app/schemas/appointment.py` - Uses `date` type (not `datetime`)
  - `frontend/src/types/index.ts` - `appointment_date: string` (YYYY-MM-DD format)

### Migrations

Two migrations implement timezone support:
- `2928ec4658e4_add_timezone_to_tenants.py` - Adds timezone column to tenants
- `7cd90491c305_change_appointment_date_to_date_type.py` - Changes appointment_date from TIMESTAMP to DATE

**Reference:** See COMMON_MISTAKES.md - Mistake #12 for detailed examples.

## Appointment Bookings: Guest vs Registered Users

The application supports two types of appointment bookings with distinct data handling:

### Guest Bookings (Anonymous Users)

**How it works:**
- User not authenticated during booking
- System creates appointment linked to `guest@booker.app` placeholder account
- Contact information stored in `guest_name`, `guest_email`, `guest_phone` fields
- Backend validates: name required, at least one contact method (email OR phone) required

**Database structure:**
```sql
appointments:
  user_id: <guest-user-uuid>  -- Points to guest@booker.app account
  guest_name: "John Doe"      -- Customer's actual name
  guest_email: "john@..."     -- Customer's actual email (optional)
  guest_phone: "+1234..."     -- Customer's actual phone (optional)
```

**Display in dialogs:**
- Shows guest contact fields with icons (PersonIcon, EmailIcon, PhoneIcon)
- Does NOT show the guest@booker.app placeholder account info

### Registered User Bookings

**How it works:**
- User authenticated during booking
- Appointment linked to actual user account
- Guest fields are NULL/empty
- Contact information retrieved from User model via relationship

**Database structure:**
```sql
appointments:
  user_id: <actual-user-uuid>  -- Points to real user account
  guest_name: NULL
  guest_email: NULL
  guest_phone: NULL

users (via relationship):
  email: "user@example.com"    -- Always present
  first_name: "John" or NULL   -- Optional
  last_name: "Doe" or NULL     -- Optional
```

**Display in dialogs:**
- Shows user details from User model (via eager-loaded relationship)
- Displays name (if available) and email with icons
- If no name: email used as primary identifier (no duplication)

### Backend Implementation

**Models with relationships:**
```python
# backend/app/models/appointment.py
class Appointment(Base):
    user_id = Column(UUID, ForeignKey("users.id"))
    guest_name = Column(String(255), nullable=True)
    guest_email = Column(String(255), nullable=True)
    guest_phone = Column(String(50), nullable=True)

    # Relationship for accessing user details
    user = relationship("User", back_populates="appointments")

# backend/app/models/user.py
class User(Base):
    appointments = relationship("Appointment", back_populates="user")
```

**Service layer uses eager loading:**
```python
# backend/app/services/appointment.py
from sqlalchemy.orm import joinedload

def get_by_id(db: Session, appointment_id: UUID) -> Appointment:
    return db.query(Appointment)\
        .options(joinedload(Appointment.user))\  # Eager load user
        .filter(Appointment.id == appointment_id)\
        .first()
```

**API responses include nested user:**
```python
# backend/app/schemas/appointment.py
class UserBasic(BaseModel):
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: UUID
    user_id: UUID
    user: Optional[UserBasic] = None  # Populated by eager loading
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
```

### Frontend Implementation

**TypeScript type includes user object:**
```typescript
// frontend/src/types/index.ts
export interface Appointment {
  user_id: string;
  user?: {  // Populated for registered users
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  guest_name?: string;    // Populated for guest bookings
  guest_email?: string;
  guest_phone?: string;
}
```

**Dialog component logic:**
```typescript
// frontend/src/components/booking/AppointmentDetailsDialog.tsx

// Determine booking type
const isGuestBooking = !!(appointment.guest_name || appointment.guest_email || appointment.guest_phone);
const hasUserDetails = !!appointment.user;

// Show guest fields (mutually exclusive with user fields)
{isGuestBooking && (
  <>{/* Display guest_name, guest_email, guest_phone */}</>
)}

// Show user fields (only for non-guest registered users)
{hasUserDetails && appointment.user && !isGuestBooking && (
  <>{/* Display user.first_name/last_name, user.email */}</>
)}
```

**Key files:**
- `backend/app/models/appointment.py` - Appointment model with user relationship
- `backend/app/models/user.py` - User model with appointments relationship
- `backend/app/services/appointment.py` - Uses joinedload for user data
- `backend/app/schemas/appointment.py` - UserBasic and AppointmentResponse schemas
- `frontend/src/types/index.ts` - Appointment interface with user object
- `frontend/src/components/booking/AppointmentDetailsDialog.tsx` - Owner view dialog
- `frontend/src/components/booking/BookingConfirmationDialog.tsx` - Public booking dialog

## Appointment Timeline Design

The appointment timeline (`TimeSlotList.tsx`) uses a modern flat design with customer-focused layout and vibrant status colors.

### Visual Design Principles

**Flat design (no shadows, no borders for active slots):**
- Clean, modern appearance
- Focuses attention on content over decoration
- Cancelled slots use outlined dashed border for distinction

**Customer-first hierarchy:**
- Customer name/email on left (primary focus)
- Status chip on right (secondary indicator)
- Text truncates with ellipsis to maintain consistent slot widths

**Vibrant status colors (design system compliant):**
- **Pending:** Amber background (15% opacity) + orange chip
- **Confirmed:** Green background (15% opacity) + green chip
- **Booked:** Light blue background (8% opacity) + grey chip
- **Cancelled:** Transparent with red dashed border + red outlined chip + red text

### Spacing Architecture

**Time grid alignment (10px gap):**
```
Time text: 56px (fixed width)
Gap: 1.25 units = 10px (MUI spacing: 1.25 × 8px)
Spacer: 66px = 56px + 10px (ensures button alignment)
```

This ensures appointment buttons align horizontally with time grid divider lines.

### Width Consistency

**Problem:** Flexbox `min-width: auto` causes slots to resize based on content length.

**Solution:** Set `minWidth: 0` on appointment area Box to fix width consistency:
```tsx
<Box sx={{ flex: 1, minWidth: 0 }}>  // Prevents content-driven width
  <Button sx={{ width: '100%' }}>...</Button>
</Box>
```

All slots now have uniform width matching the time grid, regardless of customer name length.

### Chip Label Logic

**Important:** Chip label uses appointment status when available, not slot status:
```tsx
label={appointment?.status ? getStatusLabel(appointment.status) : statusLabel}
```

This ensures cancelled slots show "Cancelled" chip (from appointment) even if slot status is "available".

**Key files:**
- `frontend/src/components/booking/TimeSlotList.tsx` - Timeline component with flat design and spacing architecture

## Testing

### Backend Tests (pytest)

```bash
# Run all tests
docker compose exec backend pytest

# Run specific file
docker compose exec backend pytest tests/test_admin.py

# Run specific test function
docker compose exec backend pytest tests/test_admin.py::test_list_all_users_as_superuser

# Run with verbose output
docker compose exec backend pytest -v

# Run with coverage
docker compose exec backend pytest --cov=app --cov-report=html

# Run tests matching a pattern
docker compose exec backend pytest -k "test_tenant"
```

**Test Structure:**
- Tests use in-memory SQLite (not PostgreSQL)
- Available fixtures: `db`, `client`, `regular_user`, `superuser`, `regular_user_token`, `superuser_token`, `test_tenant`
- Always test: unauthenticated (401), regular user, and superuser access

**Reference:** `backend/TESTING.md`

### Frontend Tests (Vitest)

```bash
# From frontend directory
cd frontend

# Watch mode (interactive)
npm test

# Single run (CI mode)
npm run test:run

# With coverage report
npm run test:coverage

# UI mode (browser-based test runner)
npm run test:ui

# Run specific test file
npm test src/components/BookingForm.test.tsx

# Run tests matching pattern
npm test -- --grep "booking"
```

**Test Structure:**
- Uses Vitest with React Testing Library
- Tests located alongside components: `Component.test.tsx`
- Setup in `src/setupTests.ts`
- Mock API calls in tests

**Reference:** `frontend/TESTING.md`

## Helper Scripts

The `scripts/` directory contains useful development utilities:

### `build-frontend.sh`
Rebuilds the frontend production bundle and restarts nginx. Use after frontend changes.

```bash
./scripts/build-frontend.sh && docker compose restart nginx
```

**What it does:**
- Runs `npm install` (if package.json changed)
- Runs `npm run build` to create production bundle
- Outputs build status and any errors
- Restarts nginx to serve new build

**When to use:**
- After modifying React components, pages, or styles
- After changing frontend dependencies
- Before testing frontend changes in Docker environment

### `verify-build.sh`
Verifies both frontend and backend build without deploying. Use as pre-commit check.

```bash
./scripts/verify-build.sh
```

**What it does:**
- Checks frontend TypeScript compilation
- Verifies frontend build succeeds
- Runs backend tests
- Reports any errors found

**When to use:**
- Before committing code changes
- As part of CI/CD pipeline
- To verify changes don't break build

### `rebuild.sh`
Complete rebuild of all Docker containers. Use when dependencies change.

```bash
./rebuild.sh
```

**What it does:**
- Stops all containers
- Rebuilds Docker images from scratch
- Starts services with new images
- Useful when Dockerfile or requirements.txt change

**When to use:**
- After adding new Python packages to `requirements.txt`
- After adding new npm packages to `package.json`
- After modifying Dockerfiles
- When containers are in inconsistent state

## Common Mistakes to Avoid

Before creating new code, **review `COMMON_MISTAKES.md`** to avoid known issues:

1. ❌ Using `[entity, reset]` in useEffect → Use `[entity?.id, reset]`
2. ❌ Using `Container` directly → Use `PageLayout`
3. ❌ Wrong maxWidth values → Use `maxWidth="md"` (or "xs" for auth)
4. ❌ Nested maxWidth constraints → Only set maxWidth on PageLayout
5. ❌ Not verifying build → Always run `npm run build` after frontend changes
6. ❌ Direct fetch calls → Use `apiGet/apiPost` from `api.ts`
7. ❌ Hardcoded values → Use config or environment variables
8. ❌ Business logic in routers → Put it in services
9. ❌ Manual database sessions → Use dependency injection `db: Session = Depends(get_db)`
10. ❌ Local notification state → Use `useNotification()` hook

**Reference:** `COMMON_MISTAKES.md`

## Important Files

### Documentation
- `COMMON_MISTAKES.md` - **Read before coding** - Known pitfalls and correct patterns
- `ARCHITECTURE_REVIEW_2024.md` - Architecture assessment and best practices
- `README.md` - Project overview and quick start
- `DEBUGGING.md` - Comprehensive debugging guide for AI-assisted development

### Frontend Guidelines
- `frontend/REACT_HOOKS_GUIDELINES.md` - useEffect dependency patterns
- `frontend/LAYOUT_GUIDELINES.md` - PageLayout and spacing standards
- `frontend/API_PATTERNS.md` - API service patterns

### Backend Documentation
- `backend/TESTING.md` - pytest fixtures and patterns
- `backend/ALEMBIC_SETUP.md` - Database migration workflow

### Configuration
- `.cursorrules` - AI development rules
- `.env` - Environment variables (generated by install.sh)
- `docker-compose.yml` - Service orchestration

## Pre-Commit Checklist

Before committing changes:

- [ ] Frontend: Run `npm run build` to verify TypeScript compiles
- [ ] Backend: Run `pytest` if you changed backend code
- [ ] Check `COMMON_MISTAKES.md` to ensure you followed patterns
- [ ] Verify forms don't reset while typing (if you modified forms)
- [ ] Use PageLayout with correct maxWidth (if you created/modified pages)
- [ ] Use centralized notifications (if you show success/error messages)
- [ ] Business logic in services, not routers (if you modified backend)
- [ ] Use `.format('YYYY-MM-DD')` for dates, NOT `.toISOString()` (if you serialize dates)

## Development Workflow

1. **Read documentation first:** Check `COMMON_MISTAKES.md` and relevant pattern files
2. **Find similar code:** Look for existing patterns to follow
3. **Follow established patterns:** Don't invent new approaches
4. **Verify build:** Run `npm run build` (frontend) or `pytest` (backend)
5. **Test locally:** Verify your changes work in Docker environment
6. **Review changes:** Ensure you followed all guidelines

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (sets HttpOnly cookies)
- `POST /api/auth/google` - Google OAuth login/register (auto-links to existing accounts by email, sets HttpOnly cookies)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (clears cookies)
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Tenants
- `GET /api/tenants` - List tenants (public)
- `GET /api/tenants/{id}` - Get tenant by ID (public)
- `GET /api/tenants/slug/{slug}/public` - Public tenant info (enhanced if authenticated)
- `POST /api/tenants` - Create tenant (requires auth, timezone defaults to UTC)
- `PATCH /api/tenants/{id}` - Update tenant (requires admin/owner role)
- `DELETE /api/tenants/{id}` - Delete tenant (requires owner role)

### Tenant Members
- `GET /api/tenants/{id}/members` - List members
- `POST /api/tenants/{id}/members` - Invite member
- `PATCH /api/tenants/{id}/members/{user_id}` - Update member role
- `DELETE /api/tenants/{id}/members/{user_id}` - Remove member

### Appointments
- `POST /api/tenants/{id}/appointments` - Create appointment
  - Access control based on tenant's booking settings (public/authenticated/members_only)
  - Validates date in tenant's timezone
  - Requires `appointment_date` as plain YYYY-MM-DD string (timezone-agnostic)
- `GET /api/tenants/{id}/appointments` - List appointments (requires auth)
- `GET /api/tenants/{id}/appointments/{appointment_id}` - Get appointment (requires auth)
- `PATCH /api/tenants/{id}/appointments/{appointment_id}` - Update appointment (requires auth)
- `GET /api/tenants/{id}/appointments/available-slots?date=YYYY-MM-DD&service_type=...` - Get booked slots (public)
- `GET /api/tenants/{id}/appointments/first-available-date?service_type=...&max_days_ahead=60` - Get first available date (public)

### Admin (Superuser only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get user details
- `POST /api/admin/users/{id}/toggle-superuser` - Toggle superuser status

**Full API documentation:** Visit `http://localhost/api/docs` when running

## Environment Variables

Key variables in `.env`:
- `SECRET_KEY` - JWT signing key (auto-generated)
- `POSTGRES_PASSWORD` - Database password (auto-generated)
- `DOMAIN_NAME` - Application domain
- `DEBUG` - Debug mode (1 for dev, 0 for production)
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (optional, for Google Sign-In)
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret (optional, for Google Sign-In)
- `SMTP_*` - Email configuration (optional)

## Security Notes

- Never commit `.env` file (it's gitignored)
- Passwords are hashed with bcrypt
- JWT tokens expire and rotate
- Database uses SSL connections
- CORS is configured for specific domains
- Input validation via Pydantic schemas
- Role-based access control on all protected endpoints

## SSL Certificates for Multi-Tenant Subdomains

### Wildcard SSL Requirement

**Important:** For multi-tenant applications using tenant subdomains (e.g., `tenant1.yourdomain.com`), you **must** use a wildcard SSL certificate.

**During Installation:**
- The `install.sh` script offers three SSL options:
  1. **Standard SSL** - Covers only `yourdomain.com` and `www.yourdomain.com` (automatic)
  2. **Wildcard SSL** - Covers `*.yourdomain.com` and `yourdomain.com` (interactive, **recommended for multi-tenant**)
  3. **Skip SSL** - Configure manually later

**Choose Option 2 for wildcard SSL** if your application will use tenant subdomains.

### Generating Wildcard Certificates

**Automatic (during install):**
```bash
./install.sh
# Choose option 2 when prompted
# Follow DNS TXT record instructions
```

**Manual (post-install):**
```bash
# Generate wildcard certificate
certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d *.yourdomain.com

# Copy to project ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*.pem

# Restart nginx
docker compose restart nginx
```

**Why DNS Challenge?**
- Wildcard certificates **require** DNS validation (not HTTP)
- You must add a TXT record to your DNS provider
- DNS propagation takes 1-5 minutes

**Certificate Renewal:**
- Wildcard certificates require manual renewal every 90 days
- Run the same certbot command before expiration
- Copy new certificates to `./ssl/` and restart nginx

## Troubleshooting

**For comprehensive debugging workflows, see [DEBUGGING.md](DEBUGGING.md)**

### Services Won't Start

**Problem:** `docker compose up -d` fails or services exit immediately

**Solutions:**
```bash
# Check service status
docker compose ps

# View error logs
docker compose logs backend
docker compose logs db

# Common fixes:
# 1. Missing .env file
./install.sh  # Regenerate .env

# 2. Port conflicts
docker compose down
sudo lsof -i :80  # Check what's using port 80
sudo lsof -i :443  # Check what's using port 443

# 3. Stale containers
docker compose down -v  # Remove volumes
docker compose up -d
```

### Database Connection Errors

**Problem:** Backend can't connect to database

**Solutions:**
```bash
# Check database is healthy
docker compose ps db

# View database logs
docker compose logs db

# Verify environment variables
docker compose exec backend env | grep POSTGRES

# Wait for database to be ready
docker compose restart backend
```

### Frontend Build Fails

**Problem:** `npm run build` fails with TypeScript errors

**Solutions:**
```bash
cd frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for type errors
npm run build

# Common issues:
# - Missing type definitions
# - Incorrect imports
# - TypeScript strict mode violations
```

### Migration Errors

**Problem:** Alembic migrations fail

**Solutions:**
```bash
# Check current migration status
docker compose exec backend alembic current

# View migration history
docker compose exec backend alembic history

# Rollback one version
docker compose exec backend alembic downgrade -1

# Force migration to specific version
docker compose exec backend alembic stamp head

# If completely broken, drop and recreate
docker compose down -v
docker compose up -d
docker compose exec backend alembic upgrade head
```

### Permission Errors

**Problem:** Permission denied errors in Docker containers

**Solutions:**
```bash
# Fix ownership of files
sudo chown -R $USER:$USER .

# Rebuild with proper permissions
./rebuild.sh
```

### "Port already in use" Errors

**Problem:** Cannot start services, ports 80/443 in use

**Solutions:**
```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service (example: nginx)
sudo systemctl stop nginx
sudo systemctl disable nginx  # Prevent auto-start

# Or change WEB_PORT in .env
# Edit .env: WEB_PORT=8080
# Edit docker-compose.yml ports: "8080:80"
```

### Hot Reload Not Working

**Problem:** Code changes don't reflect in running application

**Solutions:**
```bash
# Backend changes (Python)
docker compose restart backend  # Fast restart

# Frontend changes (React)
./scripts/build-frontend.sh && docker compose restart nginx

# If still not working
./rebuild.sh  # Full rebuild
```
