"""
TerraGuard — Async database engine, session factory, and declarative base.
Uses asyncpg driver with SQLAlchemy 2 async session.
Connection string is loaded from .env → DATABASE_URL.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]

# Ensure we use the asyncpg driver even if the user just provides postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip all query parameters (like ?sslmode=require&channel_binding=require)
# asyncpg is very picky and will fail if it sees unknown parameters.
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

# NeonDB requires SSL.
# The connection string should already include
# ?sslmode=require, but we also set connect_args as fallback.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # set True for SQL debug output
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # avoids stale-connection errors
    pool_recycle=280,    # reconnect before NeonDB kills idle connections
    connect_args={"ssl": "require"},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables (idempotent — safe to call on every startup)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
