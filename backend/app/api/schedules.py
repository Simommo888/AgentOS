from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Schedule
from app.schemas import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.agent_runner import run_agent
from app.services.scheduler import disable_schedule, enable_schedule, refresh_jobs

router = APIRouter()


@router.get("", response_model=list[ScheduleRead])
def get_schedules(db: Session = Depends(get_db)) -> list[Schedule]:
    return db.query(Schedule).order_by(Schedule.created_at.asc()).all()


@router.post("", response_model=ScheduleRead)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)) -> Schedule:
    schedule = Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    refresh_jobs()
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleRead)
def update_schedule(schedule_id: int, payload: ScheduleUpdate, db: Session = Depends(get_db)) -> Schedule:
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    refresh_jobs()
    return schedule


@router.post("/{schedule_id}/enable", response_model=ScheduleRead)
def enable_schedule_api(schedule_id: int, db: Session = Depends(get_db)) -> Schedule:
    enable_schedule(schedule_id)
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.post("/{schedule_id}/disable", response_model=ScheduleRead)
def disable_schedule_api(schedule_id: int, db: Session = Depends(get_db)) -> Schedule:
    disable_schedule(schedule_id)
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.post("/{schedule_id}/run")
def run_schedule_now(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    try:
        return run_agent(db, schedule.agent_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
