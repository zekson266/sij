# Migration Cleanup - Single Initial Migration

## Date: 2026-01-21

## Final State: Single Comprehensive Migration

**Status**: ✅ Complete - All tables in ONE migration

## What Was Done

### 1. Created Single Comprehensive Migration
- **File**: `backend/alembic/versions/001_initial_complete_schema.py`
- **Purpose**: ONE migration that creates ALL application tables from scratch
- **Dependencies**: `down_revision = None` (base migration)
- **Creates ALL 15 tables**:
  - **Core (5)**: `users`, `tenants`, `tenant_users`, `verification_tokens`, `oauth_accounts`
  - **Booker (1)**: `appointments`
  - **ROPA (9)**: `ropa_departments`, `ropa_locations` (global), `ropa_systems`, `ropa_repositories`, `ropa_activities`, `ropa_data_elements`, `ropa_dpias`, `ropa_risks`, `ai_suggestion_jobs`

### 2. Archived ALL Old Migrations
- **Location**: `backend/alembic/archive_all_old_migrations.tar.gz` (5.4KB)
- **Contains**: All 9 old migration files (core + ROPA + Booker)
- **Reason**: Single archive file keeps all old migrations for reference but out of Alembic's path

### 3. Schema Changes
- **PolicyDocument**: Removed completely (table, model, service, routes, frontend)
- **Location**: Converted to global (removed `tenant_id`, made `name` unique globally)
- **verification_tokens**: Added (was missing - now included in migration)
- **ai_suggestion_jobs**: Added (was missing - now included in migration)
- **All tables**: Created with final schema in one migration

## For Fresh Installs

1. Run: `docker compose up -d`
2. Run: `docker compose exec backend alembic upgrade head`
3. This will run the single migration `001_initial_complete` which creates all 15 tables

## Migration Chain

The migration `001_initial_complete` is the base migration (`down_revision = None`). This ensures it runs first and creates everything from scratch.

## Current State

- **Active migrations**: 1 file (`001_initial_complete_schema.py`)
- **Archived migrations**: All 9 old migrations in `backend/alembic/archive_all_old_migrations.tar.gz`
- **For fresh installs**: Run `alembic upgrade head` - creates ALL 15 tables in one step
- **Database verified**: 
  - ✅ All 15 tables created (core + booker + ropa)
  - ✅ `verification_tokens` included (was missing before)
  - ✅ `ai_suggestion_jobs` included
  - ✅ PolicyDocument removed
  - ✅ Location is global (no tenant_id)
  - ✅ Single head: `001_initial_complete`

## Verification

✅ **Database State:**
- Current migration: `001_initial_complete`
- Tables: 15 tables created (all expected tables present)
- PolicyDocument: ✅ Removed
- Location: ✅ Global (no tenant_id)
- verification_tokens: ✅ Created
- ai_suggestion_jobs: ✅ Created

✅ **Migration Files:**
- Active: 1 file (comprehensive initial migration)
- Archived: 9 files in `backend/alembic/archive_all_old_migrations.tar.gz`

## Notes

- Old migrations are archived but not deleted (for reference)
- For production upgrades from old schema, you may need to create a migration that transforms old schema to new
- For fresh installs, only the single comprehensive migration runs
- **All models now have corresponding tables** - no missing tables
