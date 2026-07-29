"""Alembic environment — async SQLAlchemy setup."""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base  # noqa: F401 — imports all models via side-effects

# this is the Alembic Config object
config = context.config

# Normalize the database URL for asyncpg — same logic as db/session.py.
# Supabase provides postgresql:// URLs; asyncpg needs postgresql+asyncpg://.
_db_url = settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://") and not _db_url.startswith("postgresql+asyncpg://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# For Supabase pgBouncer (port 6543 / Transaction mode), prepared statements
# must be disabled. Embed it directly in the URL — this is the only way that
# works reliably because SQLAlchemy's dialect init fires before connect_args.
if "pooler.supabase.com" in _db_url or ":6543" in _db_url:
    separator = "&" if "?" in _db_url else "?"
    _db_url = f"{_db_url}{separator}prepared_statement_cache_size=0"


if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=_db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # Build connect_args — Supabase needs SSL; pgBouncer (port 6543) needs
    # statement_cache_size=0 to disable prepared statements.
    _connect_args: dict = {}
    if ".supabase.co" in _db_url:
        _connect_args["ssl"] = "require"
    if "pooler.supabase.com" in _db_url or ":6543" in _db_url:
        _connect_args["statement_cache_size"] = 0

    # Use create_async_engine directly so connect_args are passed correctly.
    # async_engine_from_config silently drops connect_args for the asyncpg dialect.
    connectable = create_async_engine(
        _db_url,
        poolclass=pool.NullPool,
        connect_args=_connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
