import json

from sqlalchemy.orm import Session

from app.models import AgentLog
from app.services.security_service import mask_secrets


def create_log(
    db: Session,
    agent_id: str,
    message: str,
    level: str = "info",
    run_id: int | None = None,
    metadata: dict | None = None,
) -> AgentLog:
    log = AgentLog(
        agent_id=agent_id,
        run_id=run_id,
        level=level,
        message=mask_secrets(message),
        metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
