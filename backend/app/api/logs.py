from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AgentLog
from app.schemas import AgentLogRead

router = APIRouter()


@router.get("", response_model=list[AgentLogRead])
def list_logs(
    agent_id: str | None = None,
    level: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
) -> list[AgentLog]:
    query = db.query(AgentLog)
    if agent_id:
        query = query.filter(AgentLog.agent_id == agent_id)
    if level:
        query = query.filter(AgentLog.level == level)
    if date_from:
        query = query.filter(AgentLog.timestamp >= date_from)
    if date_to:
        query = query.filter(AgentLog.timestamp <= date_to)
    return query.order_by(AgentLog.timestamp.desc()).limit(limit).all()
