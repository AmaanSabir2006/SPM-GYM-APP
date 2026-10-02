from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Create async engine with serverless and Supabase pooler compatibility
engine_kwargs = {
    "echo": (settings.ENVIRONMENT == "development"),
    "future": True,
    "pool_pre_ping": True,
}

if settings.DATABASE_URL.startswith("postgresql"):
    from sqlalchemy.pool import NullPool
    engine_kwargs["connect_args"] = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to retrieve an async DB session for each request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
