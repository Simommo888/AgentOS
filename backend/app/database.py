from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _sqlite_path_from_url(url: str) -> Path | None:
    if not url.startswith("sqlite:///"):
        return None
    raw_path = url.replace("sqlite:///", "", 1)
    path = Path(raw_path)
    if not path.is_absolute():
        path = settings.backend_root / path
    return path


sqlite_path = _sqlite_path_from_url(settings.database_url)
if sqlite_path:
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{sqlite_path.as_posix()}"
else:
    database_url = settings.database_url

engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    upgrade_schema()


def _columns(table_name: str) -> set[str]:
    with engine.connect() as connection:
        rows = connection.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


def _add_column(table_name: str, column_name: str, definition: str) -> None:
    if column_name in _columns(table_name):
        return
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def upgrade_schema() -> None:
    if not database_url.startswith("sqlite"):
        return
    agent_columns = {
        "timeout_seconds": "INTEGER DEFAULT 1800",
        "retry_enabled": "BOOLEAN DEFAULT 0",
        "max_retries": "INTEGER DEFAULT 0",
        "retry_delay_seconds": "INTEGER DEFAULT 30",
    }
    run_columns = {
        "retry_count": "INTEGER DEFAULT 0",
        "parent_run_id": "INTEGER",
        "timeout_seconds": "INTEGER",
        "cancelled_by": "VARCHAR(120) DEFAULT ''",
        "metadata_json": "TEXT DEFAULT '{}'",
        "llm_provider": "VARCHAR(120) DEFAULT ''",
        "llm_model": "VARCHAR(200) DEFAULT ''",
        "prompt_tokens": "INTEGER DEFAULT 0",
        "completion_tokens": "INTEGER DEFAULT 0",
        "total_tokens": "INTEGER DEFAULT 0",
        "estimated_cost": "FLOAT DEFAULT 0",
        "cost_currency": "VARCHAR(20) DEFAULT 'USD'",
    }
    for name, definition in agent_columns.items():
        _add_column("agents", name, definition)
    for name, definition in run_columns.items():
        _add_column("agent_runs", name, definition)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
