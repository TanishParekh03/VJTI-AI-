"""Async SQLAlchemy engine and session factory."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Automatically format database URL for asyncpg if raw postgresql:// or postgres:// is passed (e.g. from Supabase UI)
db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Handle Supabase connection args
connect_args = {}
if "pooler.supabase.com" in db_url or "6543" in db_url or "pgbouncer" in db_url.lower():
    # pgBouncer pooler — disable prepared statements
    connect_args["statement_cache_size"] = 0
if ".supabase.co" in db_url:
    # Supabase requires SSL for all connections (direct and pooler)
    connect_args["ssl"] = "require"

engine = create_async_engine(
    db_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
