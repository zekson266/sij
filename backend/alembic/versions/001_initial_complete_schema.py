"""initial_complete_schema

Single comprehensive migration that creates ALL application tables from scratch.
This is the base migration for fresh installations.

Includes:
- Core tables: users, tenants, tenant_users, verification_tokens, oauth_accounts
- Booker module: appointments
- ROPA module: All ROPA tables including ai_suggestion_jobs

Revision ID: 001_initial_complete
Revises: 
Create Date: 2026-01-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_complete'
down_revision: Union[str, None] = None  # Base migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================================
    # Core Tables (no dependencies)
    # ============================================================================
    
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False, unique=True),
        sa.Column('domain', sa.String(length=255), nullable=True, unique=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('subscription_tier', sa.String(length=50), nullable=False, server_default=sa.text("'free'")),
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default=sa.text("'UTC'")),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
    op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=False)
    op.create_index(op.f('ix_tenants_slug'), 'tenants', ['slug'], unique=True)
    op.create_index(op.f('ix_tenants_domain'), 'tenants', ['domain'], unique=True)
    op.create_index(op.f('ix_tenants_email'), 'tenants', ['email'], unique=False)
    op.create_index(op.f('ix_tenants_is_active'), 'tenants', ['is_active'], unique=False)
    op.create_index(op.f('ix_tenants_is_verified'), 'tenants', ['is_verified'], unique=False)
    op.create_index(op.f('ix_tenants_subscription_tier'), 'tenants', ['subscription_tier'], unique=False)
    op.create_index(op.f('ix_tenants_timezone'), 'tenants', ['timezone'], unique=False)
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),  # Nullable for OAuth-only users
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=False)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    op.create_index(op.f('ix_users_is_email_verified'), 'users', ['is_email_verified'], unique=False)
    op.create_index(op.f('ix_users_is_superuser'), 'users', ['is_superuser'], unique=False)
    
    # ============================================================================
    # Core Relationship Tables
    # ============================================================================
    
    # Create tenant_users table
    op.create_table(
        'tenant_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default=sa.text("'member'")),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('invited_at', sa.DateTime(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_user'),
    )
    op.create_index(op.f('ix_tenant_users_id'), 'tenant_users', ['id'], unique=False)
    op.create_index(op.f('ix_tenant_users_tenant_id'), 'tenant_users', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_tenant_users_user_id'), 'tenant_users', ['user_id'], unique=False)
    op.create_index(op.f('ix_tenant_users_role'), 'tenant_users', ['role'], unique=False)
    op.create_index(op.f('ix_tenant_users_is_active'), 'tenant_users', ['is_active'], unique=False)
    
    # Create verification_tokens table
    op.create_table(
        'verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True),
        sa.Column('token_type', sa.Enum('email_verification', 'password_reset', name='tokentype'), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_verification_tokens_id'), 'verification_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_verification_tokens_user_id'), 'verification_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_verification_tokens_token'), 'verification_tokens', ['token'], unique=True)
    op.create_index(op.f('ix_verification_tokens_token_type'), 'verification_tokens', ['token_type'], unique=False)
    op.create_index(op.f('ix_verification_tokens_is_used'), 'verification_tokens', ['is_used'], unique=False)
    op.create_index(op.f('ix_verification_tokens_expires_at'), 'verification_tokens', ['expires_at'], unique=False)
    
    # Create oauth_accounts table
    op.create_table(
        'oauth_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_user_id', sa.String(length=255), nullable=False),
        sa.Column('provider_email', sa.String(length=255), nullable=True),
        sa.Column('access_token', sa.String(length=2048), nullable=True),
        sa.Column('refresh_token', sa.String(length=2048), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('provider', 'provider_user_id', name='uix_provider_user'),
    )
    op.create_index(op.f('ix_oauth_accounts_id'), 'oauth_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_oauth_accounts_user_id'), 'oauth_accounts', ['user_id'], unique=False)
    op.create_index(op.f('ix_oauth_accounts_provider'), 'oauth_accounts', ['provider'], unique=False)
    op.create_index(op.f('ix_oauth_accounts_provider_user_id'), 'oauth_accounts', ['provider_user_id'], unique=False)
    
    # ============================================================================
    # Booker Module Tables
    # ============================================================================
    
    # Create appointments table
    op.create_table(
        'appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_type', sa.String(length=100), nullable=False),
        sa.Column('appointment_date', sa.Date(), nullable=False),  # DATE type (not DateTime)
        sa.Column('appointment_time', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('guest_name', sa.String(length=255), nullable=True),
        sa.Column('guest_email', sa.String(length=255), nullable=True),
        sa.Column('guest_phone', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)
    op.create_index(op.f('ix_appointments_tenant_id'), 'appointments', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_appointments_user_id'), 'appointments', ['user_id'], unique=False)
    op.create_index(op.f('ix_appointments_service_type'), 'appointments', ['service_type'], unique=False)
    op.create_index(op.f('ix_appointments_appointment_date'), 'appointments', ['appointment_date'], unique=False)
    op.create_index(op.f('ix_appointments_status'), 'appointments', ['status'], unique=False)
    op.create_index(op.f('ix_appointments_guest_email'), 'appointments', ['guest_email'], unique=False)
    
    # ============================================================================
    # ROPA Module - Lookup Tables (must be created first due to foreign key dependencies)
    # ============================================================================
    
    # Create ropa_departments table (tenant-specific)
    op.create_table(
        'ropa_departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_department_tenant_name'),
    )
    op.create_index(op.f('ix_ropa_departments_id'), 'ropa_departments', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_departments_tenant_id'), 'ropa_departments', ['tenant_id'], unique=False)
    
    # Create ropa_locations table (GLOBAL, not tenant-specific)
    op.create_table(
        'ropa_locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('country_code', sa.String(length=10), nullable=True),
        sa.Column('region', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index(op.f('ix_ropa_locations_id'), 'ropa_locations', ['id'], unique=False)
    
    # Create ropa_systems table (tenant-specific)
    op.create_table(
        'ropa_systems',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('system_type', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_system_tenant_name'),
    )
    op.create_index(op.f('ix_ropa_systems_id'), 'ropa_systems', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_systems_tenant_id'), 'ropa_systems', ['tenant_id'], unique=False)
    
    # ============================================================================
    # ROPA Module - Core Tables
    # ============================================================================
    
    # Create ropa_repositories table
    op.create_table(
        'ropa_repositories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Identification
        sa.Column('data_repository_name', sa.String(length=255), nullable=False),
        sa.Column('data_repository_description', sa.Text(), nullable=True),
        sa.Column('external_vendor', sa.String(length=255), nullable=True),
        sa.Column('business_owner', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('data_format', sa.String(length=50), nullable=True),  # Enum: Electronic, Physical
        # Geographic & Location
        sa.Column('geographical_system_location', postgresql.JSONB, nullable=True),
        sa.Column('access_locations', postgresql.JSONB, nullable=True),  # UUID array
        # Cross-Border Transfers
        sa.Column('transfer_mechanism', sa.String(length=50), nullable=True),  # Enum
        sa.Column('derogation_type', sa.String(length=50), nullable=True),  # Enum
        sa.Column('cross_border_safeguards', sa.String(length=50), nullable=True),  # Enum
        sa.Column('cross_border_transfer_detail', sa.String(length=255), nullable=True),
        # Compliance & Certification
        sa.Column('gdpr_compliant', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('dpa_url', sa.String(length=500), nullable=True),
        sa.Column('dpa_file', sa.String(length=500), nullable=True),
        sa.Column('vendor_gdpr_compliance', sa.Boolean(), nullable=True),
        sa.Column('certification', sa.String(length=50), nullable=True),  # Enum
        # Data & Records
        sa.Column('record_count', sa.Integer(), nullable=True),
        # System Interfaces
        sa.Column('system_interfaces', postgresql.JSONB, nullable=True),  # UUID array
        sa.Column('interface_type', sa.String(length=50), nullable=True),  # Enum: Internal, External
        sa.Column('interface_location', postgresql.JSONB, nullable=True),
        # Data Recipients
        sa.Column('data_recipients', sa.String(length=255), nullable=True),
        sa.Column('sub_processors', sa.String(length=255), nullable=True),
        # Operational Status
        sa.Column('status', sa.String(length=50), nullable=False, server_default=sa.text("'active'")),  # Enum
        # Additional Metadata
        sa.Column('comments', postgresql.JSONB, nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['business_owner'], ['ropa_departments.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_ropa_repositories_id'), 'ropa_repositories', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_repositories_tenant_id'), 'ropa_repositories', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_ropa_repositories_data_repository_name'), 'ropa_repositories', ['data_repository_name'], unique=False)
    op.create_index(op.f('ix_ropa_repositories_gdpr_compliant'), 'ropa_repositories', ['gdpr_compliant'], unique=False)
    op.create_index(op.f('ix_ropa_repositories_status'), 'ropa_repositories', ['status'], unique=False)
    
    # Create ropa_activities table
    op.create_table(
        'ropa_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('data_repository_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Identification
        sa.Column('processing_activity_name', sa.String(length=255), nullable=False),
        sa.Column('purpose', sa.String(length=255), nullable=True),
        sa.Column('lawful_basis', sa.String(length=100), nullable=True),
        # Part 1 Fields
        sa.Column('legitimate_interest_assessment', sa.Text(), nullable=True),
        sa.Column('data_subject_type', postgresql.JSONB, nullable=True),  # String array
        sa.Column('collection_sources', postgresql.JSONB, nullable=True),  # UUID array
        sa.Column('data_disclosed_to', postgresql.JSONB, nullable=True),  # UUID array
        sa.Column('jit_notice', sa.Text(), nullable=True),
        sa.Column('consent_process', sa.Text(), nullable=True),
        # Part 2 Fields
        sa.Column('automated_decision', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('data_subject_rights', sa.Text(), nullable=True),
        sa.Column('dpia_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('dpia_comment', sa.Text(), nullable=True),
        sa.Column('dpia_file', sa.String(length=500), nullable=True),
        sa.Column('dpia_gpc_link', sa.String(length=500), nullable=True),
        sa.Column('children_data', sa.Text(), nullable=True),
        sa.Column('parental_consent', sa.Text(), nullable=True),
        # Part 3 Fields
        sa.Column('comments', postgresql.JSONB, nullable=True),  # String array
        sa.Column('data_retention_policy', sa.String(length=500), nullable=True),  # URL string
        sa.Column('processing_frequency', sa.String(length=50), nullable=True),  # Enum
        sa.Column('legal_jurisdiction', postgresql.JSONB, nullable=True),  # String array
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['data_repository_id'], ['ropa_repositories.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ropa_activities_id'), 'ropa_activities', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_activities_data_repository_id'), 'ropa_activities', ['data_repository_id'], unique=False)
    op.create_index(op.f('ix_ropa_activities_processing_activity_name'), 'ropa_activities', ['processing_activity_name'], unique=False)
    
    # Create ropa_data_elements table
    op.create_table(
        'ropa_data_elements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('processing_activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Identification
        sa.Column('category', sa.String(length=100), nullable=True),
        # Data Elements
        sa.Column('data_elements', postgresql.JSONB, nullable=True),  # String array
        sa.Column('special_lawful_basis', postgresql.JSONB, nullable=True),  # String array
        sa.Column('secondary_use', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('encryption_in_transit', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('safeguards', sa.Text(), nullable=True),
        sa.Column('retention_period_days', sa.Integer(), nullable=True),
        sa.Column('disposition_method', sa.Text(), nullable=True),
        sa.Column('comments', postgresql.JSONB, nullable=True),  # String array
        sa.Column('data_minimization_justification', sa.Text(), nullable=True),
        sa.Column('data_accuracy_requirements', sa.Text(), nullable=True),
        sa.Column('data_storage_location', postgresql.JSONB, nullable=True),  # String array
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['processing_activity_id'], ['ropa_activities.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ropa_data_elements_id'), 'ropa_data_elements', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_data_elements_processing_activity_id'), 'ropa_data_elements', ['processing_activity_id'], unique=False)
    
    # Create ropa_dpias table
    op.create_table(
        'ropa_dpias',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('processing_activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Identification
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default=sa.text("'draft'")),
        # Assessment Details
        sa.Column('necessity_proportionality_assessment', sa.Text(), nullable=True),
        sa.Column('assessor', sa.String(length=255), nullable=True),
        sa.Column('assessment_date', sa.DateTime(), nullable=True),
        # Consultation Requirements
        sa.Column('dpo_consultation_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('dpo_consultation_date', sa.DateTime(), nullable=True),
        sa.Column('supervisory_authority_consultation_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('supervisory_authority_consultation_date', sa.DateTime(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['processing_activity_id'], ['ropa_activities.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ropa_dpias_id'), 'ropa_dpias', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_dpias_processing_activity_id'), 'ropa_dpias', ['processing_activity_id'], unique=False)
    op.create_index(op.f('ix_ropa_dpias_title'), 'ropa_dpias', ['title'], unique=False)
    op.create_index(op.f('ix_ropa_dpias_status'), 'ropa_dpias', ['status'], unique=False)
    op.create_index(op.f('ix_ropa_dpias_dpo_consultation_required'), 'ropa_dpias', ['dpo_consultation_required'], unique=False)
    op.create_index(op.f('ix_ropa_dpias_supervisory_authority_consultation_required'), 'ropa_dpias', ['supervisory_authority_consultation_required'], unique=False)
    
    # Create ropa_risks table
    op.create_table(
        'ropa_risks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('dpia_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Identification
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        # Risk Assessment
        sa.Column('severity', sa.String(length=50), nullable=True),
        sa.Column('likelihood', sa.String(length=50), nullable=True),
        sa.Column('residual_severity', sa.String(length=50), nullable=True),
        sa.Column('residual_likelihood', sa.String(length=50), nullable=True),
        # Risk Management
        sa.Column('mitigation', sa.Text(), nullable=True),
        sa.Column('risk_owner', sa.String(length=255), nullable=True),
        sa.Column('risk_status', sa.String(length=50), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['dpia_id'], ['ropa_dpias.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ropa_risks_id'), 'ropa_risks', ['id'], unique=False)
    op.create_index(op.f('ix_ropa_risks_dpia_id'), 'ropa_risks', ['dpia_id'], unique=False)
    op.create_index(op.f('ix_ropa_risks_title'), 'ropa_risks', ['title'], unique=False)
    op.create_index(op.f('ix_ropa_risks_severity'), 'ropa_risks', ['severity'], unique=False)
    op.create_index(op.f('ix_ropa_risks_risk_status'), 'ropa_risks', ['risk_status'], unique=False)
    
    # ============================================================================
    # ROPA Module - Support Tables
    # ============================================================================
    
    # Create ai_suggestion_jobs table
    op.create_table(
        'ai_suggestion_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=False),
        sa.Column('field_type', sa.String(length=50), nullable=False),
        sa.Column('field_label', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('request_data', postgresql.JSONB, nullable=False),
        sa.Column('general_statement', sa.Text(), nullable=True),
        sa.Column('suggestions', postgresql.JSONB, nullable=True),
        sa.Column('openai_model', sa.String(length=100), nullable=True),
        sa.Column('openai_tokens_used', sa.Integer(), nullable=True),
        sa.Column('openai_cost_usd', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ai_suggestion_jobs_id'), 'ai_suggestion_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_user_id'), 'ai_suggestion_jobs', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_tenant_id'), 'ai_suggestion_jobs', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_entity_type'), 'ai_suggestion_jobs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_entity_id'), 'ai_suggestion_jobs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_field_name'), 'ai_suggestion_jobs', ['field_name'], unique=False)
    op.create_index(op.f('ix_ai_suggestion_jobs_status'), 'ai_suggestion_jobs', ['status'], unique=False)


def downgrade() -> None:
    # Drop indexes first (in reverse order)
    op.drop_index(op.f('ix_ai_suggestion_jobs_status'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_field_name'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_entity_id'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_entity_type'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_tenant_id'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_user_id'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ai_suggestion_jobs_id'), table_name='ai_suggestion_jobs')
    op.drop_index(op.f('ix_ropa_risks_risk_status'), table_name='ropa_risks')
    op.drop_index(op.f('ix_ropa_risks_severity'), table_name='ropa_risks')
    op.drop_index(op.f('ix_ropa_risks_title'), table_name='ropa_risks')
    op.drop_index(op.f('ix_ropa_risks_dpia_id'), table_name='ropa_risks')
    op.drop_index(op.f('ix_ropa_risks_id'), table_name='ropa_risks')
    op.drop_index(op.f('ix_ropa_dpias_supervisory_authority_consultation_required'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_dpias_dpo_consultation_required'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_dpias_status'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_dpias_title'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_dpias_processing_activity_id'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_dpias_id'), table_name='ropa_dpias')
    op.drop_index(op.f('ix_ropa_data_elements_processing_activity_id'), table_name='ropa_data_elements')
    op.drop_index(op.f('ix_ropa_data_elements_id'), table_name='ropa_data_elements')
    op.drop_index(op.f('ix_ropa_activities_processing_activity_name'), table_name='ropa_activities')
    op.drop_index(op.f('ix_ropa_activities_data_repository_id'), table_name='ropa_activities')
    op.drop_index(op.f('ix_ropa_activities_id'), table_name='ropa_activities')
    op.drop_index(op.f('ix_ropa_repositories_status'), table_name='ropa_repositories')
    op.drop_index(op.f('ix_ropa_repositories_gdpr_compliant'), table_name='ropa_repositories')
    op.drop_index(op.f('ix_ropa_repositories_data_repository_name'), table_name='ropa_repositories')
    op.drop_index(op.f('ix_ropa_repositories_tenant_id'), table_name='ropa_repositories')
    op.drop_index(op.f('ix_ropa_repositories_id'), table_name='ropa_repositories')
    op.drop_index(op.f('ix_ropa_systems_tenant_id'), table_name='ropa_systems')
    op.drop_index(op.f('ix_ropa_systems_id'), table_name='ropa_systems')
    op.drop_index(op.f('ix_ropa_locations_id'), table_name='ropa_locations')
    op.drop_index(op.f('ix_ropa_departments_tenant_id'), table_name='ropa_departments')
    op.drop_index(op.f('ix_ropa_departments_id'), table_name='ropa_departments')
    op.drop_index(op.f('ix_appointments_guest_email'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_status'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_appointment_date'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_service_type'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_user_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_tenant_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_index(op.f('ix_oauth_accounts_provider_user_id'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_oauth_accounts_provider'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_oauth_accounts_user_id'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_oauth_accounts_id'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_verification_tokens_expires_at'), table_name='verification_tokens')
    op.drop_index(op.f('ix_verification_tokens_is_used'), table_name='verification_tokens')
    op.drop_index(op.f('ix_verification_tokens_token_type'), table_name='verification_tokens')
    op.drop_index(op.f('ix_verification_tokens_token'), table_name='verification_tokens')
    op.drop_index(op.f('ix_verification_tokens_user_id'), table_name='verification_tokens')
    op.drop_index(op.f('ix_verification_tokens_id'), table_name='verification_tokens')
    op.drop_index(op.f('ix_tenant_users_is_active'), table_name='tenant_users')
    op.drop_index(op.f('ix_tenant_users_role'), table_name='tenant_users')
    op.drop_index(op.f('ix_tenant_users_user_id'), table_name='tenant_users')
    op.drop_index(op.f('ix_tenant_users_tenant_id'), table_name='tenant_users')
    op.drop_index(op.f('ix_tenant_users_id'), table_name='tenant_users')
    op.drop_index(op.f('ix_users_is_superuser'), table_name='users')
    op.drop_index(op.f('ix_users_is_email_verified'), table_name='users')
    op.drop_index(op.f('ix_users_is_active'), table_name='users')
    op.drop_index(op.f('ix_users_phone'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_tenants_timezone'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_subscription_tier'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_is_verified'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_is_active'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_email'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_domain'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_slug'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_name'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_id'), table_name='tenants')
    
    # Drop tables (in reverse order of dependencies)
    op.drop_table('ai_suggestion_jobs')
    op.drop_table('ropa_risks')
    op.drop_table('ropa_dpias')
    op.drop_table('ropa_data_elements')
    op.drop_table('ropa_activities')
    op.drop_table('ropa_repositories')
    op.drop_table('ropa_systems')
    op.drop_table('ropa_locations')
    op.drop_table('ropa_departments')
    op.drop_table('appointments')
    op.drop_table('oauth_accounts')
    op.drop_table('verification_tokens')
    op.drop_table('tenant_users')
    op.drop_table('users')
    op.drop_table('tenants')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS tokentype')
