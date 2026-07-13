from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Configure engine with robust pooling settings for production workloads
connect_args = {}
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # Sqlite requires special settings for multithreading in FastAPI
    connect_args = {"check_same_thread": False}

# Build engine arguments dynamically based on database dialect
engine_args = {
    "connect_args": connect_args,
    "pool_pre_ping": True,  # Test connections before querying to prevent stale DB connection crashes
}

if not is_sqlite:
    engine_args["pool_size"] = 20
    engine_args["max_overflow"] = 10
    engine_args["pool_recycle"] = 1800

engine = create_engine(settings.DATABASE_URL, **engine_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """Yields a thread-safe database session context.

    Ensures sessions are closed reliably after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
