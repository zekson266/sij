from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Import your models' Base and all models here
# This ensures Alembic can detect all models for autogenerate
from app.database import Base

# Import all models so Alembic can detect them
# Import models here to enable autogenerate
from app.models.tenant import Tenant  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.tenant_user import TenantUser  # noqa: F401
from app.models.verification_token import VerificationToken  # noqa: F401
from app.modules.booker.models.appointment import Appointment  # noqa: F401
from app.models.oauth_account import OAuthAccount  # noqa: F401
# Import ROPA models
from app.modules.ropa.models.repository import Repository  # noqa: F401
from app.modules.ropa.models.activity import Activity  # noqa: F401
from app.modules.ropa.models.data_element import DataElement  # noqa: F401
from app.modules.ropa.models.department import Department  # noqa: F401
from app.modules.ropa.models.dpia import DPIA  # noqa: F401
from app.modules.ropa.models.location import Location  # noqa: F401
from app.modules.ropa.models.risk import Risk  # noqa: F401
from app.modules.ropa.models.system import System  # noqa: F401

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import settings to get database URL
from app.config import settings

# Override sqlalchemy.url with our database URL from settings
# Note: Alembic uses a different connection method, so we construct the URL here
database_url = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
config.set_main_option("sqlalchemy.url", database_url)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create engine with SSL support for PostgreSQL
    configuration = config.get_section(config.config_ini_section, {})
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"sslmode": "require"} if "postgresql" in database_url else {},
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

