from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Agent, AgentRun, KnowledgeAsset


def _rate(part: int, total: int) -> float:
    if total <= 0:
        return 0
    return round((part / total) * 100, 2)


def _today_bounds() -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    return datetime(now.year, now.month, now.day), datetime(now.year, now.month, now.day) + timedelta(days=1)


def _avg_duration(query) -> float:
    value = query.scalar()
    return round(float(value or 0), 2)


def _sum_number(query) -> float:
    value = query.scalar()
    return float(value or 0)


def agent_metrics(db: Session, agent_id: str) -> dict:
    total = db.query(AgentRun).filter(AgentRun.agent_id == agent_id).count()
    success = db.query(AgentRun).filter(AgentRun.agent_id == agent_id, AgentRun.status == "success").count()
    failed = db.query(AgentRun).filter(AgentRun.agent_id == agent_id, AgentRun.status == "failed").count()
    cancelled = db.query(AgentRun).filter(AgentRun.agent_id == agent_id, AgentRun.status == "cancelled").count()
    timeout = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent_id, AgentRun.error_message.like("%timed out%"))
        .count()
    )
    last_run = db.query(func.max(AgentRun.started_at)).filter(AgentRun.agent_id == agent_id).scalar()
    last_success = (
        db.query(func.max(AgentRun.started_at))
        .filter(AgentRun.agent_id == agent_id, AgentRun.status == "success")
        .scalar()
    )
    last_failed = (
        db.query(func.max(AgentRun.started_at))
        .filter(AgentRun.agent_id == agent_id, AgentRun.status == "failed")
        .scalar()
    )
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_total = db.query(AgentRun).filter(AgentRun.agent_id == agent_id, AgentRun.started_at >= seven_days_ago).count()
    recent_success = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent_id, AgentRun.started_at >= seven_days_ago, AgentRun.status == "success")
        .count()
    )

    return {
        "agent_id": agent_id,
        "total_runs": total,
        "success_runs": success,
        "failed_runs": failed,
        "cancelled_runs": cancelled,
        "timeout_runs": timeout,
        "success_rate": _rate(success, total),
        "failure_rate": _rate(failed, total),
        "average_duration_seconds": _avg_duration(
            db.query(func.avg(AgentRun.duration_seconds)).filter(AgentRun.agent_id == agent_id)
        ),
        "last_run_at": last_run,
        "last_success_at": last_success,
        "last_failed_at": last_failed,
        "total_generated_assets": db.query(KnowledgeAsset).filter(KnowledgeAsset.agent_id == agent_id).count(),
        "total_estimated_cost": round(
            _sum_number(db.query(func.sum(AgentRun.estimated_cost)).filter(AgentRun.agent_id == agent_id)), 6
        ),
        "total_tokens": int(_sum_number(db.query(func.sum(AgentRun.total_tokens)).filter(AgentRun.agent_id == agent_id))),
        "recent_7_days_runs": recent_total,
        "recent_7_days_success_rate": _rate(recent_success, recent_total),
    }


def overview_metrics(db: Session) -> dict:
    today_start, today_end = _today_bounds()
    total_runs = db.query(AgentRun).count()
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_total = db.query(AgentRun).filter(AgentRun.started_at >= seven_days_ago).count()
    recent_success = db.query(AgentRun).filter(AgentRun.started_at >= seven_days_ago, AgentRun.status == "success").count()

    return {
        "total_agents": db.query(Agent).count(),
        "enabled_agents": db.query(Agent).filter(Agent.status == "enabled").count(),
        "total_runs": total_runs,
        "runs_today": db.query(AgentRun).filter(AgentRun.started_at >= today_start, AgentRun.started_at < today_end).count(),
        "success_today": db.query(AgentRun)
        .filter(AgentRun.status == "success", AgentRun.started_at >= today_start, AgentRun.started_at < today_end)
        .count(),
        "failed_today": db.query(AgentRun)
        .filter(AgentRun.status == "failed", AgentRun.started_at >= today_start, AgentRun.started_at < today_end)
        .count(),
        "cancelled_today": db.query(AgentRun)
        .filter(AgentRun.status == "cancelled", AgentRun.started_at >= today_start, AgentRun.started_at < today_end)
        .count(),
        "running_count": db.query(AgentRun).filter(AgentRun.status == "running").count(),
        "pending_count": db.query(AgentRun).filter(AgentRun.status == "pending").count(),
        "total_generated_assets": db.query(KnowledgeAsset).count(),
        "average_duration_seconds": _avg_duration(db.query(func.avg(AgentRun.duration_seconds))),
        "total_estimated_cost": round(_sum_number(db.query(func.sum(AgentRun.estimated_cost))), 6),
        "total_tokens": int(_sum_number(db.query(func.sum(AgentRun.total_tokens)))),
        "recent_7_days_runs": recent_total,
        "recent_7_days_success_rate": _rate(recent_success, recent_total),
    }
