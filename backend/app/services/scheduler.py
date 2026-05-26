from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import SessionLocal
from app.models import Schedule
from app.services.agent_runner import start_agent_run
from app.services.log_service import create_log

_scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
_started = False


def _job_id(schedule_id: int) -> str:
    return f"agentos_schedule_{schedule_id}"


def _run_scheduled_agent(schedule_id: int, agent_id: str) -> None:
    db = SessionLocal()
    try:
        run = start_agent_run(db, agent_id)
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if schedule:
            schedule.last_run_at = datetime.utcnow()
            db.commit()
        create_log(db, agent_id, f"Scheduled run queued: {run.status}", "info", run.id)
    except Exception as exc:
        create_log(db, agent_id, f"Scheduled run failed: {exc}", "error")
    finally:
        db.close()


def refresh_jobs() -> None:
    db = SessionLocal()
    try:
        for job in list(_scheduler.get_jobs()):
            if job.id.startswith("agentos_schedule_"):
                _scheduler.remove_job(job.id)

        schedules = db.query(Schedule).filter(Schedule.enabled.is_(True)).all()
        for schedule in schedules:
            trigger = CronTrigger.from_crontab(schedule.cron, timezone="Asia/Shanghai")
            job = _scheduler.add_job(
                _run_scheduled_agent,
                trigger=trigger,
                args=[schedule.id, schedule.agent_id],
                id=_job_id(schedule.id),
                replace_existing=True,
                max_instances=1,
            )
            schedule.next_run_at = job.next_run_time.replace(tzinfo=None) if job.next_run_time else None
        db.commit()
    finally:
        db.close()


def start_scheduler() -> None:
    global _started
    if not _started:
        _scheduler.start()
        _started = True
    refresh_jobs()


def enable_schedule(schedule_id: int) -> None:
    db = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if schedule:
            schedule.enabled = True
            db.commit()
    finally:
        db.close()
    refresh_jobs()


def disable_schedule(schedule_id: int) -> None:
    db = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if schedule:
            schedule.enabled = False
            schedule.next_run_at = None
            db.commit()
    finally:
        db.close()
    refresh_jobs()
