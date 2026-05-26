from sqlalchemy.orm import Session

from app.models import Prompt


def list_prompts(db: Session, agent_id: str | None = None, scenario: str | None = None) -> list[Prompt]:
    query = db.query(Prompt)
    if agent_id:
        query = query.filter(Prompt.agent_id == agent_id)
    if scenario:
        query = query.filter(Prompt.scenario == scenario)
    return query.order_by(Prompt.updated_at.desc()).all()
