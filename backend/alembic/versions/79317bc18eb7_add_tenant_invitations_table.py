"""add_tenant_invitations_table

Revision ID: 79317bc18eb7
Revises: 001_initial_complete
Create Date: 2026-01-24 22:34:59.123456

Adds tenant_invitations table for pending invitations before user registration.
Follows the same pattern as verification_tokens for consistency.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '79317bc18eb7'
down_revision: Union[str, None] = '001_initial_complete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create invitation status enum if it doesn't exist (safe for retries)
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE invitationstatus AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    
    # Create tenant_invitations table
    op.create_table(
        'tenant_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True),
        sa.Column('role', sa.String(length=50), nullable=False, server_default=sa.text("'member'")),
        sa.Column(
            'status',
            postgresql.ENUM('pending', 'accepted', 'expired', 'cancelled', name='invitationstatus', create_type=False),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_tenant_invitation_email'),
    )
    
    # Create indexes
    op.create_index(op.f('ix_tenant_invitations_id'), 'tenant_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_tenant_invitations_tenant_id'), 'tenant_invitations', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_tenant_invitations_email'), 'tenant_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_tenant_invitations_token'), 'tenant_invitations', ['token'], unique=True)
    op.create_index(op.f('ix_tenant_invitations_status'), 'tenant_invitations', ['status'], unique=False)
    op.create_index(op.f('ix_tenant_invitations_expires_at'), 'tenant_invitations', ['expires_at'], unique=False)
    op.create_index(op.f('ix_tenant_invitations_invited_by'), 'tenant_invitations', ['invited_by'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_tenant_invitations_invited_by'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_expires_at'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_status'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_token'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_email'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_tenant_id'), table_name='tenant_invitations')
    op.drop_index(op.f('ix_tenant_invitations_id'), table_name='tenant_invitations')
    
    # Drop table
    op.drop_table('tenant_invitations')
    
    # Drop enum
    op.execute("DROP TYPE IF EXISTS invitationstatus")
