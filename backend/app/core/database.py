import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.core.config import settings

Base = declarative_base()

def get_engine():
    """
    Returns the SQLAlchemy engine.
    PostgreSQL 15+ is strictly the primary database.
    Silent fallback to SQLite is removed; SQLite is exclusively permitted
    when ENVIRONMENT is explicitly set to 'testing'.
    """
    db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    env = os.getenv("ENVIRONMENT", settings.ENVIRONMENT).lower().strip()

    # SQLite is strictly restricted to explicit testing configuration
    if env == "testing":
        test_url = settings.SQLITE_FALLBACK_URL if "sqlite" not in db_url.lower() else db_url
        os.makedirs("./data", exist_ok=True)
        return create_engine(
            test_url,
            connect_args={"check_same_thread": False}
        )

    # In production and standard development, SQLite is forbidden
    if "sqlite" in db_url.lower():
        raise RuntimeError(
            f"SQLite database is strictly forbidden in '{env}' environment. "
            "PostgreSQL 15+ is required as the primary database."
        )

    # Normalize driver for psycopg2
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # In development and production, create PostgreSQL engine without silent fallback
    return create_engine(
        db_url,
        pool_pre_ping=True
    )

def verify_database_connection(target_engine=None):
    """
    Verifies that the primary database is reachable.
    Fails safely if PostgreSQL is unreachable without falling back to SQLite.
    """
    e = target_engine or engine
    try:
        with e.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        env = os.getenv("ENVIRONMENT", settings.ENVIRONMENT)
        raise RuntimeError(
            f"Database connection failure in '{env}' environment. "
            f"PostgreSQL 15+ is unreachable: {exc}. Application fails safely."
        )

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables defined in SQLAlchemy models if not already created."""
    from backend.app.models import models # Import all models to register with Base
    Base.metadata.create_all(bind=engine)
