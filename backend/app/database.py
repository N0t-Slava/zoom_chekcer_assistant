from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_PATH = BASE_DIR / "attendance.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_lightweight_migrations()


def _ensure_lightweight_migrations() -> None:
    inspector = inspect(engine)
    if "attendance_records" not in inspector.get_table_names():
        return

    attendance_columns = {column["name"] for column in inspector.get_columns("attendance_records")}
    meeting_columns = set()
    google_sheet_columns = set()
    if "meetings" in inspector.get_table_names():
        meeting_columns = {column["name"] for column in inspector.get_columns("meetings")}
    if "google_sheet_sources" in inspector.get_table_names():
        google_sheet_columns = {column["name"] for column in inspector.get_columns("google_sheet_sources")}

    with engine.begin() as connection:
        if "meeting_session_id" not in attendance_columns:
            connection.execute(text("ALTER TABLE attendance_records ADD COLUMN meeting_session_id INTEGER"))
        if "meetings" in inspector.get_table_names() and "schedule_entry_id" not in meeting_columns:
            connection.execute(text("ALTER TABLE meetings ADD COLUMN schedule_entry_id INTEGER"))
        if "meetings" in inspector.get_table_names() and "owner_joined_at" not in meeting_columns:
            connection.execute(text("ALTER TABLE meetings ADD COLUMN owner_joined_at DATETIME"))
        if "google_sheet_sources" in inspector.get_table_names() and "auto_sync_enabled" not in google_sheet_columns:
            connection.execute(text("ALTER TABLE google_sheet_sources ADD COLUMN auto_sync_enabled INTEGER DEFAULT 0 NOT NULL"))
        if "google_sheet_sources" in inspector.get_table_names() and "headers_signature" not in google_sheet_columns:
            connection.execute(text("ALTER TABLE google_sheet_sources ADD COLUMN headers_signature VARCHAR(64)"))
