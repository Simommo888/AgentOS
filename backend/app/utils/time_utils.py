from datetime import datetime


def utcnow() -> datetime:
    return datetime.utcnow()


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None
