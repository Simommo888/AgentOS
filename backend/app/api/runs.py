from datetime import date as date_type
from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Agent, AgentLog, AgentRun
from app.schemas import AgentLogRead, AgentRunQueueRead, AgentRunRead
from app.services.agent_runner import ACTIVE_STATUSES, RUN_PENDING, RUN_RUNNING, cancel_run

router = APIRouter()


def _day_bounds(value: date_type) -> tuple[datetime, datetime]:
    return datetime.combine(value, time.min), datetime.combine(value, time.max)


def _queue_item(run: AgentRun, agent_name: str = "") -> dict:
    return {
        "run_id": run.id,
        "agent_id": run.agent_id,
        "agent_name": agent_name,
        "status": run.status,
        "started_at": run.started_at,
        "duration_seconds": run.duration_seconds,
        "command": run.command,
        "output_summary": run.output_summary,
        "error_message": run.error_message,
    }


@router.get("/queue", response_model=AgentRunQueueRead)
def get_run_queue(db: Session = Depends(get_db)) -> dict:
    today_start, today_end = _day_bounds(datetime.utcnow().date())
    recent_runs = db.query(AgentRun).order_by(AgentRun.started_at.desc()).limit(60).all()
    agent_names = {agent.id: agent.name for agent in db.query(Agent).all()}

    pending = [run for run in recent_runs if run.status == RUN_PENDING]
    running = [run for run in recent_runs if run.status == RUN_RUNNING]
    finished = [run for run in recent_runs if run.status not in ACTIVE_STATUSES][:10]
    success_today = (
        db.query(AgentRun)
        .filter(AgentRun.status == "success", AgentRun.started_at >= today_start, AgentRun.started_at <= today_end)
        .count()
    )
    failed_today = (
        db.query(AgentRun)
        .filter(AgentRun.status == "failed", AgentRun.started_at >= today_start, AgentRun.started_at <= today_end)
        .count()
    )

    return {
        "pending_runs": [_queue_item(run, agent_names.get(run.agent_id, "")) for run in pending],
        "running_runs": [_queue_item(run, agent_names.get(run.agent_id, "")) for run in running],
        "recently_finished_runs": [_queue_item(run, agent_names.get(run.agent_id, "")) for run in finished],
        "active_count": len(pending) + len(running),
        "pending_count": len(pending),
        "failed_count_today": failed_today,
        "success_count_today": success_today,
    }


@router.get("", response_model=list[AgentRunRead])
def list_runs(
    agent_id: str | None = None,
    status: str | None = None,
    date: date_type | None = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
) -> list[AgentRun]:
    query = db.query(AgentRun)
    if agent_id:
        query = query.filter(AgentRun.agent_id == agent_id)
    if status:
        query = query.filter(AgentRun.status == status)
    if date:
        start, end = _day_bounds(date)
        query = query.filter(AgentRun.started_at >= start, AgentRun.started_at <= end)
    return query.order_by(AgentRun.started_at.desc()).limit(limit).all()


@router.get("/{run_id}", response_model=AgentRunRead)
def get_run(run_id: int, db: Session = Depends(get_db)) -> AgentRun:
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/{run_id}/cancel", response_model=AgentRunRead)
def cancel_run_api(run_id: int, db: Session = Depends(get_db)) -> AgentRun:
    try:
        return cancel_run(db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{run_id}/logs", response_model=list[AgentLogRead])
def get_run_logs(run_id: int, db: Session = Depends(get_db)) -> list[AgentLog]:
    return db.query(AgentLog).filter(AgentLog.run_id == run_id).order_by(AgentLog.timestamp.asc()).all()
