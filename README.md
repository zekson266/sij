# Booker - Multi-Tenant SaaS Application 

A production-ready, scalable multi-tenant SaaS application built with FastAPI, PostgreSQL, and Docker.

## Features

- 🔐 **JWT Authentication** - Secure HttpOnly cookie-based authentication with cross-subdomain support
- 🔑 **Google OAuth** - Sign in with Google integration with auto-linking to existing accounts
- 🏢 **Multi-Tenancy** - Marketplace model (users can belong to multiple tenants)
- 👥 **Role-Based Access Control** - Hierarchical roles (owner/admin/editor/member/viewer) with permissions
- 📅 **Appointment Booking** - Full booking system with guest and registered user support, timezone handling, and service-specific calendars
- 🌍 **Timezone Support** - Per-tenant timezone configuration with timezone-agnostic date handling
- ✉️ **Email Verification** - Email verification and password reset
- 🔒 **Security First** - SSL/TLS, password hashing, HttpOnly cookies, rate limiting, CSRF protection
- 🌐 **Public-First Architecture** - Pages work without login, optional authentication
- 🎨 **Material UI** - Modern React UI components
- 🧭 **React Router** - Client-side routing
- 🧩 **Workspace Navigation** - Tenant workspace entry point with module links
- 📦 **Docker Ready** - Complete Docker setup with Compose
- 🚀 **Production Ready** - MVP-ready with best practices

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd booker

# 2. Run installation script
./install.sh

# 3. Start services
docker compose up -d

# 4. Run database migrations
# Single initial migration creates all 15 tables (core, booker, ROPA, AI)
docker compose exec backend alembic upgrade head

# 5. Verify installation
curl http://localhost/api/health
```

**That's it!** Your application is running.

See [INSTALLATION.md](INSTALLATION.md) for detailed installation guide.

## Architecture

### Backend
- **FastAPI** - Modern, fast web framework
- **PostgreSQL** - Robust relational database with SSL
- **SQLAlchemy** - ORM with connection pooling
- **Alembic** - Database migrations (single initial migration creates all 15 tables)
- **Docker** - Containerization
- **Nginx** - Reverse proxy and static file server

### Frontend
- **React 19.2.0** - Modern React framework
- **TypeScript** - Type-safe JavaScript
- **Vite 7.2.4** - Fast build tool
- **Material UI 7.3.6** - React UI component library
- **React Router 7.10.1** - Client-side routing
- **Emotion** - CSS-in-JS styling engine

### Architecture Layers

```
API Layer (Routers) → Service Layer → Model Layer → Database
```

- **Routers**: Thin API endpoints
- **Services**: Business logic
- **Models**: Database schema
- **Schemas**: Request/response validation

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Project Structure

```
booker/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── utils/        # Utilities
│   ├── alembic/          # Database migrations
│   └── scripts/          # Setup scripts
├── frontend/             # Frontend application
├── docker-compose.yml    # Docker orchestration
├── install.sh            # Installation script
└── .env                  # Configuration (generated)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login/register (auto-links to existing accounts by email)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - Logout (clears cookies)
- `GET /api/auth/me` - Get current user
- `GET /api/auth/tenants` - Get user's tenants

### Tenants
- `POST /api/tenants` - Create tenant (**requires auth**, creator becomes owner)
- `GET /api/tenants` - List tenants (public)
- `GET /api/tenants/{tenant_id}` - Get tenant by ID (public)
- `GET /api/tenants/slug/{slug}` - Get tenant by slug (public)
- `GET /api/tenants/slug/{slug}/public` - Public tenant info with optional auth enhancement (public, enhanced if authenticated)
- `PATCH /api/tenants/{tenant_id}` - Update tenant (**requires auth + admin/owner role**)
- `DELETE /api/tenants/{tenant_id}` - Delete tenant (**requires auth + owner role only**)

### Tenant Members
- `POST /api/tenants/{tenant_id}/members` - Invite user
- `GET /api/tenants/{tenant_id}/members` - List members
- `PATCH /api/tenants/{tenant_id}/members/{user_id}` - Update member
- `DELETE /api/tenants/{tenant_id}/members/{user_id}` - Remove member

### Appointments
- `POST /api/tenants/{id}/appointments` - Create appointment (access control based on tenant settings)
- `GET /api/tenants/{id}/appointments` - List appointments (requires auth)
- `GET /api/tenants/{id}/appointments/{appointment_id}` - Get appointment (requires auth)
- `PATCH /api/tenants/{id}/appointments/{appointment_id}` - Update appointment (requires auth)
- `GET /api/tenants/{id}/appointments/available-slots` - Get booked slots (public)
- `GET /api/tenants/{id}/appointments/first-available-date` - Get first available date (public)

**API Documentation**: Visit `http://localhost/api/docs` when running.

## Configuration

All configuration is in `.env` file (auto-generated by `install.sh`):

- `SECRET_KEY` - JWT signing key
- `POSTGRES_PASSWORD` - Database password
- `DOMAIN_NAME` - Application domain
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (optional, for Google Sign-In)
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret (optional, for Google Sign-In)
- `SMTP_*` - Email configuration (optional)

See [INSTALLATION.md](INSTALLATION.md) for configuration details.

## Development

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for install script)

### Running Locally

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f backend

# Run migrations
docker compose exec backend alembic upgrade head

# Access API docs
open http://localhost:8000/api/docs
```

### Making Changes

1. **Code changes**: Edit files in `backend/app/`
2. **Database changes**: Create migration:
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "description"
   docker compose exec backend alembic upgrade head
   ```
3. **Restart services**: `docker compose restart backend`

## Production Deployment

1. Run `./install.sh` to set up environment
2. Configure `.env` with production values
3. Set `DEBUG=0` in `.env`
4. Enable email sending (configure SMTP)
5. Set up SSL certificates (done by install.sh)
6. Configure firewall and backups

See [INSTALLATION.md](INSTALLATION.md) for production deployment details.

## Security

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication with expiration
- ✅ SSL/TLS for database and web
- ✅ Input validation (Pydantic)
- ✅ CORS configuration
- ✅ Token expiration
- ✅ Single-use verification tokens
- ✅ Role-based access control (RBAC)
- ✅ Permission-based access control
- ✅ Tenant modification endpoints require authentication
- ✅ Creator automatically becomes owner
- ✅ Proper authorization checks on all protected endpoints

## Public-First Architecture

The application supports a public-first design pattern:

- **Public Pages**: Work without authentication
- **Optional Authentication**: Endpoints can work with or without auth
- **Progressive Enhancement**: More features for authenticated users
- **Conditional UI**: Frontend can show different content based on auth state

**Example:** Public booking pages can show basic info to everyone, but show available times and booking options to authenticated members.

## Documentation

### For Developers & AI Assistants
- **[CLAUDE.md](CLAUDE.md)** - **START HERE** - Complete development guide with architecture, patterns, commands, and best practices
- **[COMMON_MISTAKES.md](COMMON_MISTAKES.md)** - Common mistakes catalog with prevention strategies (12 documented mistakes)

### Core Documentation
- **[INSTALLATION.md](INSTALLATION.md)** - Installation and setup guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture documentation
- **[API_REFERENCE.md](API_REFERENCE.md)** - API reference for frontend developers

### Reviews & Assessments
- **[ARCHITECTURE_REVIEW_2024.md](ARCHITECTURE_REVIEW_2024.md)** - Comprehensive architecture review (2024)

### Guides & Checklists
- **[ADMIN_LOGIN_GUIDE.md](ADMIN_LOGIN_GUIDE.md)** - How to login as app admin (superuser)
- **[CRITICAL_ITEMS.md](CRITICAL_ITEMS.md)** - Pre-production checklist
- **[DEVELOPMENT_ESSENTIALS.md](DEVELOPMENT_ESSENTIALS.md)** - Development needs guide
- **[DEBUGGING.md](DEBUGGING.md)** - Comprehensive debugging guide for AI-assisted development

### Frontend Documentation
- **[frontend/REACT_HOOKS_GUIDELINES.md](frontend/REACT_HOOKS_GUIDELINES.md)** - React hooks best practices (useEffect dependency patterns)
- **[frontend/LAYOUT_GUIDELINES.md](frontend/LAYOUT_GUIDELINES.md)** - Layout standards (PageLayout, spacing, maxWidth)
- **[frontend/API_PATTERNS.md](frontend/API_PATTERNS.md)** - API service patterns and date serialization
- **[frontend/TESTING.md](frontend/TESTING.md)** - Frontend testing guide

### Backend Documentation
- **[backend/ALEMBIC_SETUP.md](backend/ALEMBIC_SETUP.md)** - Alembic database migrations setup
- **[backend/TESTING.md](backend/TESTING.md)** - Backend testing guide (pytest)

## License

[Your License Here]

## Support

For issues, questions, or contributions, please open an issue or pull request.
# sij
