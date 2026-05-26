from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Agent
from app.schemas import AgentCreate, AgentHealthRead, AgentRead, AgentRunStartRead, AgentUpdate
from app.services.agent_registry import create_agent, get_agent, list_agents, update_agent
from app.services.agent_health import agent_health
from app.services.agent_runner import start_agent_run

router = APIRouter()


@router.get("", response_model=list[AgentRead])
def get_agents(db: Session = Depends(get_db)) -> list[Agent]:
    return list_agents(db)


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent_detail(agent_id: str, db: Session = Depends(get_db)) -> Agent:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/{agent_id}/health", response_model=AgentHealthRead)
def get_agent_health(agent_id: str, db: Session = Depends(get_db)) -> dict:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_health(db, agent)


@router.post("", response_model=AgentRead)
def create_agent_api(payload: AgentCreate, db: Session = Depends(get_db)) -> Agent:
    if get_agent(db, payload.id):
        raise HTTPException(status_code=409, detail="Agent already exists")
    return create_agent(db, payload)


@router.put("/{agent_id}", response_model=AgentRead)
def update_agent_api(agent_id: str, payload: AgentUpdate, db: Session = Depends(get_db)) -> Agent:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return update_agent(db, agent, payload)


@router.post("/{agent_id}/run", response_model=AgentRunStartRead)
def run_agent_api(agent_id: str, force: bool = False, db: Session = Depends(get_db)) -> dict:
    try:
        run = start_agent_run(db, agent_id, force=force)
        return {
            "run_id": run.id,
            "agent_id": run.agent_id,
            "status": run.status,
            "message": "Agent run created. Background execution has started.",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{agent_id}/enable", response_model=AgentRead)
def enable_agent(agent_id: str, db: Session = Depends(get_db)) -> Agent:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "enabled"
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/{agent_id}/disable", response_model=AgentRead)
def disable_agent(agent_id: str, db: Session = Depends(get_db)) -> Agent:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "disabled"
    db.commit()
    db.refresh(agent)
    return agent
