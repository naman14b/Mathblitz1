"""PostgreSQL database engine and session management for MathBlitz using SQLAlchemy 2.0."""
import logging
import ssl
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import DATABASE_URL, get_async_database_url
from .models import Base

logger = logging.getLogger(__name__)

async_url = get_async_database_url(DATABASE_URL)

connect_args = {}
# Neon PostgreSQL requires SSL; SQLite needs thread check disabled
if async_url.startswith("postgresql+asyncpg://"):
    ssl_context = ssl.create_default_context()
    connect_args["ssl"] = ssl_context
elif "sqlite" in async_url:
    connect_args["check_same_thread"] = False

engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "echo": False,
}
if not async_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(
    async_url,
    **engine_kwargs,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables in database if they do not exist and ensure columns exist."""
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safe non-destructive column migrations for PostgreSQL
            try:
                if engine.url.drivername.startswith("postgresql"):
                    await conn.execute(text("ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS attempt_id VARCHAR(128);"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_question_attempts_attempt_id ON question_attempts (attempt_id);"))
                    await conn.execute(text("ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS target_learning_concept_id VARCHAR(64);"))
            except Exception as mig_err:
                logger.warning(f"Column migration skipped or already applied: {mig_err}")
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize database tables: {exc}")
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for standalone async sessions."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
