import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from threading import Lock, Thread

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Agent, AgentRun
from app.services.knowledge_base_service import record_assets_for_files, scan_agent_output
from app.services.log_service import create_log
from app.services.security_service import SecurityError, build_safe_command, mask_secrets
from app.services.settings_service import runtime_kb_root, runtime_python_path
from app.utils.paths import resolve_kb_relative

RUN_PENDING = "pending"
RUN_RUNNING = "running"
RUN_SUCCESS = "success"
RUN_FAILED = "failed"
RUN_CANCELLED = "cancelled"
ACTIVE_STATUSES = (RUN_PENDING, RUN_RUNNING)

_running_agents: set[str] = set()
_running_lock = Lock()
running_processes: dict[int, dict[str, Any]] = {}
_process_lock = Lock()


def _extract_summary(stdout: str, stderr: str, output_files: list[str], status: str) -> str:
    lines = [line.strip() for line in stdout.splitlines() if line.strip()]
    if output_files:
        return f"Generated {len(output_files)} output file(s). Latest: {output_files[0]}"
    if status == RUN_SUCCESS:
        return "Agent finished successfully, but no Markdown output file was detected in the configured output path."
    if lines:
        return lines[-1][:500]
    error_lines = [line.strip() for line in stderr.splitlines() if line.strip()]
    return error_lines[-1][:500] if error_lines else ""


def _json_objects_from_text(text: str) -> list[dict]:
    decoder = json.JSONDecoder()
    objects: list[dict] = []
    index = 0
    while index < len(text):
        start = text.find("{", index)
        if start == -1:
            break
        try:
            value, end = decoder.raw_decode(text[start:])
        except json.JSONDecodeError:
            index = start + 1
            continue
        if isinstance(value, dict):
            objects.append(value)
        index = start + end
    return objects


def _paths_from_stdout(stdout: str) -> list[Path]:
    paths: list[Path] = []
    for payload in _json_objects_from_text(stdout):
        raw_paths = payload.get("paths")
        if isinstance(raw_paths, dict):
            for value in raw_paths.values():
                if isinstance(value, str) and value:
                    paths.append(resolve_kb_relative(value))
        for key in ("weekly_path", "dashboard_path"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                paths.append(resolve_kb_relative(value))
    return paths


def _preflight_agent(agent: Agent) -> None:
    entrypoint = resolve_kb_relative(agent.entrypoint)
    if not entrypoint.exists():
        raise SecurityError(f"Entrypoint does not exist: {agent.entrypoint}")
    if agent.id != "ai_news_agent":
        return

    agent_dir = runtime_kb_root() / "scripts" / "daily_ai_news_agent"
    requirements = agent_dir / "requirements.txt"
    if not requirements.exists():
        raise SecurityError("AI news requirements file is missing: scripts/daily_ai_news_agent/requirements.txt")
    blocking_missing = _missing_ai_news_packages(requirements, include_openai=bool(os.getenv("OPENAI_API_KEY")))
    if blocking_missing:
        raise SecurityError(
            "AI news dependency check failed. Missing Python package(s): "
            + ", ".join(blocking_missing)
            + ". Run: python -m pip install -r scripts/daily_ai_news_agent/requirements.txt"
        )


def _missing_ai_news_packages(requirements: Path, include_openai: bool) -> list[str]:
    missing: list[str] = []
    packages = [
        line.strip()
        for line in requirements.read_text(encoding="utf-8", errors="ignore").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    for package in packages:
        normalized = package.split("==")[0].split(">=")[0].split("<=")[0].strip()
        if normalized.lower() == "openai" and not include_openai:
            continue
        import_name = normalized.replace("-", "_")
        result = subprocess.run(
            [runtime_python_path(), "-c", f"import {import_name}"],
            capture_output=True,
            text=True,
            shell=False,
            timeout=20,
        )
        if result.returncode != 0:
            missing.append(package)
    return missing


def _prepare_command(agent: Agent) -> tuple[list[str], list[str]]:
    command = build_safe_command(agent)
    notices: list[str] = []
    if agent.id == "ai_news_agent" and not os.getenv("OPENAI_API_KEY"):
        if "--no-llm" not in command:
            command.append("--no-llm")
        notices.append("OPENAI_API_KEY is not configured. Running ai_news_agent with --no-llm mode.")
    return command, notices


def _fail_run(
    db: Session,
    run: AgentRun,
    agent: Agent,
    started_at: datetime,
    message: str,
    stdout: str = "",
    stderr: str = "",
) -> AgentRun:
    finished_at = datetime.utcnow()
    run.status = RUN_FAILED
    run.finished_at = finished_at
    run.duration_seconds = (finished_at - started_at).total_seconds()
    run.stdout = mask_secrets(stdout or "")
    run.stderr = mask_secrets(stderr or "")
    run.error_message = mask_secrets(message)
    run.output_summary = mask_secrets(message)
    agent.last_run_status = RUN_FAILED
    agent.last_run_at = finished_at
    db.commit()
    create_log(db, agent.id, f"Run failed: {run.error_message}", "error", run.id)
    db.refresh(run)
    return run


def _mark_stale_run(db: Session, run: AgentRun, agent: Agent | None = None) -> AgentRun:
    finished_at = datetime.utcnow()
    started_at = run.started_at or run.created_at or finished_at
    run.status = RUN_FAILED
    run.finished_at = finished_at
    run.duration_seconds = (finished_at - started_at).total_seconds()
    run.error_message = "AgentOS restarted while this run was active. Marked as stale."
    run.output_summary = run.error_message
    if agent:
        agent.last_run_status = RUN_FAILED
        agent.last_run_at = finished_at
    db.commit()
    create_log(db, run.agent_id, "Stale running run detected and repaired.", "warning", run.id)
    db.refresh(run)
    return run


def repair_stale_runs() -> int:
    db = SessionLocal()
    repaired = 0
    try:
        stale_runs = db.query(AgentRun).filter(AgentRun.status.in_(ACTIVE_STATUSES)).all()
        for run in stale_runs:
            with _process_lock:
                local_entry = running_processes.get(run.id)
            if local_entry:
                continue
            agent = db.query(Agent).filter(Agent.id == run.agent_id).first()
            _mark_stale_run(db, run, agent)
            repaired += 1
        return repaired
    finally:
        db.close()


def get_running_processes() -> list[dict[str, Any]]:
    with _process_lock:
        return [
            {
                "run_id": run_id,
                "agent_id": entry["agent_id"],
                "started_at": entry["started_at"],
                "pid": entry["process"].pid,
            }
            for run_id, entry in running_processes.items()
        ]


def create_pending_run(db: Session, agent_id: str, force: bool = False) -> AgentRun:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise ValueError(f"Agent not found: {agent_id}")
    if agent.status != "enabled":
        raise ValueError(f"Agent is not enabled: {agent_id}")

    active_run = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent_id, AgentRun.status.in_(ACTIVE_STATUSES))
        .order_by(AgentRun.started_at.desc())
        .first()
    )
    with _running_lock:
        if not force and (agent_id in _running_agents or active_run):
            raise ValueError("该 Agent 正在运行，请等待完成后再试。")
        _running_agents.add(agent_id)

    now = datetime.utcnow()
    run = AgentRun(
        agent_id=agent.id,
        status=RUN_PENDING,
        started_at=now,
        command=agent.command,
    )
    db.add(run)
    agent.last_run_status = RUN_PENDING
    agent.last_run_at = now
    db.commit()
    db.refresh(run)
    create_log(db, agent.id, "Run created", "info", run.id)
    return run


def _execute_existing_run(run_id: int) -> AgentRun | None:
    db = SessionLocal()
    agent_id = ""
    try:
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if not run:
            return None
        agent = db.query(Agent).filter(Agent.id == run.agent_id).first()
        if not agent:
            run.status = RUN_FAILED
            run.error_message = "Agent not found for this run."
            run.finished_at = datetime.utcnow()
            db.commit()
            return run

        agent_id = agent.id
        started_at = datetime.utcnow()
        start_ts = time.time()
        run.status = RUN_RUNNING
        run.started_at = started_at
        run.command = agent.command
        run.error_message = ""
        agent.last_run_status = RUN_RUNNING
        agent.last_run_at = started_at
        db.commit()

        create_log(db, agent.id, "Preflight started", "info", run.id)
        try:
            _preflight_agent(agent)
        except Exception as exc:
            create_log(db, agent.id, "Preflight failed", "error", run.id)
            return _fail_run(db, run, agent, started_at, mask_secrets(str(exc)))

        create_log(db, agent.id, "Preflight passed", "info", run.id)
        command, notices = _prepare_command(agent)
        for notice in notices:
            create_log(db, agent.id, notice, "warning", run.id)

        run.command = " ".join(command)
        db.commit()
        create_log(db, agent.id, f"Command started: {' '.join(command)}", "info", run.id)
        process: subprocess.Popen[str] | None = None
        try:
            process = subprocess.Popen(
                command,
                cwd=str(runtime_kb_root()),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=False,
            )
            with _process_lock:
                running_processes[run.id] = {
                    "agent_id": agent.id,
                    "process": process,
                    "started_at": started_at,
                }
            stdout_raw, stderr_raw = process.communicate(timeout=settings.command_timeout_seconds)
            return_code = process.returncode
        except subprocess.TimeoutExpired as exc:
            if process:
                process.kill()
                timeout_stdout, timeout_stderr = process.communicate()
            else:
                timeout_stdout, timeout_stderr = exc.stdout or "", exc.stderr or ""
            create_log(db, agent.id, "Command finished: timeout", "error", run.id)
            return _fail_run(
                db,
                run,
                agent,
                started_at,
                f"Agent timed out after {settings.command_timeout_seconds} seconds.",
                stdout=timeout_stdout or "",
                stderr=timeout_stderr or "",
            )
        finally:
            with _process_lock:
                running_processes.pop(run.id, None)

        db.refresh(run)
        if run.status == RUN_CANCELLED:
            create_log(db, agent.id, "Command finished after cancellation.", "warning", run.id)
            return run

        stdout = mask_secrets(stdout_raw or "")
        stderr = mask_secrets(stderr_raw or "")
        create_log(db, agent.id, f"Command finished with exit code {return_code}", "info", run.id)
        create_log(db, agent.id, "Output parsing started", "info", run.id)

        output_files = scan_agent_output(agent.output_path, started_after_ts=start_ts)
        stdout_paths = [path for path in _paths_from_stdout(stdout) if path.suffix.lower() == ".md" and path.exists()]
        for path in stdout_paths:
            if path not in output_files:
                output_files.append(path)

        output_file_paths: list[str] = []
        for path in output_files:
            try:
                output_file_paths.append(path.relative_to(runtime_kb_root()).as_posix())
            except ValueError:
                output_file_paths.append(path.as_posix())

        record_assets_for_files(db, output_files, agent.id, run.id)
        create_log(db, agent.id, f"KnowledgeAsset created: {len(output_files)} file(s)", "info", run.id)

        status = RUN_SUCCESS if return_code == 0 else RUN_FAILED
        finished_at = datetime.utcnow()
        run.status = status
        run.finished_at = finished_at
        run.duration_seconds = (finished_at - started_at).total_seconds()
        run.stdout = stdout
        run.stderr = stderr
        run.output_files_json = json.dumps(output_file_paths, ensure_ascii=False)
        run.output_summary = _extract_summary(stdout, stderr, output_file_paths, status)
        run.error_message = "" if status == RUN_SUCCESS else (stderr[:1000] or f"Exit code {return_code}")
        agent.last_run_status = status
        agent.last_run_at = finished_at

        if stdout:
            create_log(db, agent.id, stdout[-4000:], "info", run.id)
        if stderr:
            create_log(db, agent.id, stderr[-4000:], "error" if status == RUN_FAILED else "warning", run.id)
        if status == RUN_SUCCESS and not output_file_paths:
            create_log(db, agent.id, "Agent finished but no Markdown output file was detected.", "warning", run.id)

        db.commit()
        create_log(db, agent.id, "Run success" if status == RUN_SUCCESS else "Run failed", "info" if status == RUN_SUCCESS else "error", run.id)
        db.refresh(run)
        return run
    except Exception as exc:
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        agent = db.query(Agent).filter(Agent.id == run.agent_id).first() if run else None
        if run and agent:
            return _fail_run(db, run, agent, run.started_at or datetime.utcnow(), mask_secrets(str(exc)))
        return run
    finally:
        if agent_id:
            with _running_lock:
                _running_agents.discard(agent_id)
        with _process_lock:
            running_processes.pop(run_id, None)
        db.close()


def start_agent_run(db: Session, agent_id: str, force: bool = False) -> AgentRun:
    run = create_pending_run(db, agent_id, force=force)
    Thread(target=_execute_existing_run, args=(run.id,), daemon=True).start()
    return run


def run_agent(db: Session, agent_id: str, force: bool = False) -> AgentRun:
    run = create_pending_run(db, agent_id, force=force)
    _execute_existing_run(run.id)
    db.expire_all()
    refreshed = db.query(AgentRun).filter(AgentRun.id == run.id).first()
    if not refreshed:
        raise ValueError(f"Run not found after execution: {run.id}")
    return refreshed


def cancel_run(db: Session, run_id: int) -> AgentRun:
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise ValueError(f"Run not found: {run_id}")
    if run.status not in ACTIVE_STATUSES:
        raise ValueError(f"Run #{run_id} is not running and cannot be cancelled.")

    agent = db.query(Agent).filter(Agent.id == run.agent_id).first()
    with _process_lock:
        entry = running_processes.get(run_id)

    if not entry:
        _mark_stale_run(db, run, agent)
        return run

    process: subprocess.Popen[str] = entry["process"]
    run.status = RUN_CANCELLED
    run.error_message = "Run cancelled by user."
    run.output_summary = "Run cancelled by user."
    if agent:
        agent.last_run_status = RUN_CANCELLED
        agent.last_run_at = datetime.utcnow()
    db.commit()
    create_log(db, run.agent_id, "Run cancellation requested by user.", "warning", run.id)
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)

    finished_at = datetime.utcnow()
    started_at = run.started_at or run.created_at or finished_at
    run.status = RUN_CANCELLED
    run.finished_at = finished_at
    run.duration_seconds = (finished_at - started_at).total_seconds()
    run.error_message = "Run cancelled by user."
    run.output_summary = "Run cancelled by user."
    if agent:
        agent.last_run_status = RUN_CANCELLED
        agent.last_run_at = finished_at
    db.commit()
    create_log(db, run.agent_id, "Run cancelled by user.", "warning", run.id)
    with _process_lock:
        running_processes.pop(run_id, None)
    with _running_lock:
        _running_agents.discard(run.agent_id)
    db.refresh(run)
    return run
