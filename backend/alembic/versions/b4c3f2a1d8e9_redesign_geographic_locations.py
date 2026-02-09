"""Redesign geographic locations for ROPA.

Revision ID: b4c3f2a1d8e9
Revises: 79317bc18eb7
Create Date: 2026-01-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "b4c3f2a1d8e9"
down_revision = "79317bc18eb7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add typed locations (region/country)
    op.add_column(
        "ropa_locations",
        sa.Column("type", sa.String(length=50), nullable=False, server_default="region"),
    )
    op.add_column(
        "ropa_locations",
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_ropa_locations_parent_id",
        "ropa_locations",
        "ropa_locations",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_ropa_locations_type",
        "ropa_locations",
        ["type"],
    )
    op.alter_column("ropa_locations", "type", server_default=None)

    # Replace repository location fields with UUID arrays
    op.add_column(
        "ropa_repositories",
        sa.Column("geographical_location_ids", postgresql.JSONB, nullable=True),
    )
    op.add_column(
        "ropa_repositories",
        sa.Column("access_location_ids", postgresql.JSONB, nullable=True),
    )
    op.add_column(
        "ropa_repositories",
        sa.Column("interface_location_ids", postgresql.JSONB, nullable=True),
    )
    op.drop_column("ropa_repositories", "geographical_system_location")
    op.drop_column("ropa_repositories", "access_locations")
    op.drop_column("ropa_repositories", "interface_location")


def downgrade() -> None:
    # Restore repository location fields
    op.add_column(
        "ropa_repositories",
        sa.Column("interface_location", postgresql.JSONB, nullable=True),
    )
    op.add_column(
        "ropa_repositories",
        sa.Column("access_locations", postgresql.JSONB, nullable=True),
    )
    op.add_column(
        "ropa_repositories",
        sa.Column("geographical_system_location", postgresql.JSONB, nullable=True),
    )
    op.drop_column("ropa_repositories", "interface_location_ids")
    op.drop_column("ropa_repositories", "access_location_ids")
    op.drop_column("ropa_repositories", "geographical_location_ids")

    # Drop typed locations
    op.drop_index("ix_ropa_locations_type", table_name="ropa_locations")
    op.drop_constraint("fk_ropa_locations_parent_id", "ropa_locations", type_="foreignkey")
    op.drop_column("ropa_locations", "parent_id")
    op.drop_column("ropa_locations", "type")
