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
# Neon PostgreSQL requires SSL
if async_url.startswith("postgresql+asyncpg://"):
    ssl_context = ssl.create_default_context()
    connect_args["ssl"] = ssl_context

engine = create_async_engine(
    async_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables in PostgreSQL if they do not exist and ensure columns exist."""
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safe non-destructive column migrations
            try:
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
