# Alembic Setup - Step 1.1 Complete ✅

Alembic has been installed and configured for database migrations.

## What Was Done

1. ✅ Added `alembic==1.13.1` to `requirements.txt`
2. ✅ Created `alembic.ini` configuration file
3. ✅ Created `alembic/env.py` (configured to use app settings)
4. ✅ Created `alembic/script.py.mako` (migration template)
5. ✅ Created `alembic/versions/` directory for migration files
6. ✅ Configured SSL support for PostgreSQL connections

## Testing Alembic

### Prerequisites
- Docker containers must be running
- Database must be accessible
- Environment variables must be set in `.env`

### Test Commands

#### 1. Check Alembic Installation
```bash
# From backend directory or inside container
docker compose exec backend alembic --version
```
Expected: Shows Alembic version (1.13.1)

#### 2. Check Alembic Configuration
```bash
docker compose exec backend alembic current
```
Expected: Shows "INFO: No Alembic version found" (normal for first run)

#### 3. Check Alembic Can Connect to Database
```bash
docker compose exec backend alembic check
```
Expected: No errors (or shows current database state)

#### 4. View Migration History
```bash
docker compose exec backend alembic history
```
Expected: Shows empty history (no migrations yet)

### Alternative: Test Locally (if Python is installed)

```bash
cd backend
pip install -r requirements.txt
alembic --version
alembic current
```

## Migration Strategy

This project uses a **single initial migration** (`001_initial_complete_schema.py`) that creates all 15 tables from scratch:
- Core tables: `users`, `tenants`, `tenant_users`, `verification_tokens`, `oauth_accounts`
- Booker module: `appointments`
- ROPA module: `ropa_repositories`, `ropa_activities`, `ropa_data_elements`, `ropa_departments`, `ropa_dpias`, `ropa_locations`, `ropa_risks`, `ropa_systems`
- AI support: `ai_suggestion_jobs`

**For fresh installs:**
```bash
docker compose exec backend alembic upgrade head
```

This creates all tables in one step. Old migrations have been archived to `archive_all_old_migrations.tar.gz`.

## Next Steps

Once Alembic is verified working:
- Run the initial migration: `docker compose exec backend alembic upgrade head`
- For schema changes, create new migrations as needed

## Troubleshooting

### Error: "No module named 'alembic'"
- Solution: Rebuild Docker image: `docker compose build backend`

### Error: "Can't connect to database"
- Check: Database container is running: `docker compose ps`
- Check: `.env` file has correct database credentials
- Check: Database is ready: `docker compose exec db pg_isready`

### Error: "SSL connection required"
- This is expected - Alembic is configured to use SSL
- Ensure database SSL certificates are properly set up

## Files Created

```
backend/
├── alembic.ini                    # Alembic configuration
├── alembic/
│   ├── env.py                    # Migration environment (uses app settings)
│   ├── script.py.mako            # Migration template
│   └── versions/
│       ├── README.md             # Migration usage guide
│       └── .gitkeep              # Ensures directory is tracked
└── ALEMBIC_SETUP.md              # This file
```

## Configuration Details

- **Database URL**: Automatically loaded from `app.config.settings`
- **SSL Mode**: Required (matches app database configuration)
- **Base Metadata**: Uses `app.database.Base` for autogenerate
- **Migration Location**: `alembic/versions/`

