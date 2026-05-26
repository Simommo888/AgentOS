import os
import subprocess
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Agent, AgentRun
from app.services.settings_service import runtime_kb_root, runtime_python_path
from app.utils.paths import resolve_kb_relative


def _path_exists(path_text: str, default_root: Path) -> bool:
    if not path_text:
        return False
    path = Path(path_text)
    if not path.is_absolute():
        path = default_root / path
    return path.exists()


def _requirements_path(agent: Agent) -> Path | None:
    if agent.id != "ai_news_agent":
        return None
    return runtime_kb_root() / "scripts" / "daily_ai_news_agent" / "requirements.txt"


def _missing_requirements(requirements_path: Path | None) -> list[str]:
    if not requirements_path or not requirements_path.exists():
        return []
    packages = [
        line.strip()
        for line in requirements_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    missing: list[str] = []
    for package in packages:
        import_name = package.split("==")[0].split(">=")[0].split("<=")[0].strip().replace("-", "_")
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


def agent_health(db: Session, agent: Agent) -> dict:
    kb_root = runtime_kb_root()
    entrypoint = resolve_kb_relative(agent.entrypoint)
    working_directory = Path(agent.working_directory or ".")
    if not working_directory.is_absolute():
        working_directory = kb_root / working_directory
    output_path = resolve_kb_relative(agent.output_path)
    requirements_path = _requirements_path(agent)

    entrypoint_exists = entrypoint.exists()
    working_directory_exists = working_directory.exists()
    output_path_exists = output_path.exists()
    requirements_exists = bool(requirements_path and requirements_path.exists())
    openai_api_key_configured = bool(os.getenv("OPENAI_API_KEY"))
    missing_requirements = _missing_requirements(requirements_path)
    blocking_missing = [
        package
        for package in missing_requirements
        if openai_api_key_configured or package.split("==")[0].split(">=")[0].split("<=")[0].strip().lower() != "openai"
    ]

    warnings: list[str] = []
    errors: list[str] = []
    recommendations: list[str] = []

    if not entrypoint_exists:
        errors.append(f"Entrypoint not found: {agent.entrypoint}")
        recommendations.append("确认 Agent 脚本存在，并且 entrypoint 指向 scripts 目录内的 Python 文件。")
    if not working_directory_exists:
        errors.append(f"Working directory not found: {agent.working_directory or '.'}")
        recommendations.append("确认 working_directory 是知识库内存在的目录。")
    if not output_path_exists:
        warnings.append(f"Output path does not exist yet: {agent.output_path}")
        recommendations.append("首次成功运行 Agent 后，输出目录会自动创建；也可以手动创建该目录。")
    if agent.id == "ai_news_agent":
        if not requirements_exists:
            errors.append("AI news requirements.txt not found: scripts/daily_ai_news_agent/requirements.txt")
            recommendations.append("恢复或创建 scripts/daily_ai_news_agent/requirements.txt。")
        if blocking_missing:
            errors.append(f"Missing Python package(s): {', '.join(blocking_missing)}")
            recommendations.append("运行：python -m pip install -r scripts/daily_ai_news_agent/requirements.txt")
        optional_missing = sorted(set(missing_requirements) - set(blocking_missing))
        if optional_missing:
            warnings.append(f"Optional package missing for no-llm mode: {', '.join(optional_missing)}")
        if not openai_api_key_configured:
            warnings.append("OPENAI_API_KEY is not configured. AgentOS will run ai_news_agent with --no-llm.")
            recommendations.append("如果暂时没有 API Key，可以直接使用 no-llm 模式；如果需要 LLM 摘要，请配置 OPENAI_API_KEY。")

    last_failed_run = (
        db.query(AgentRun)
        .filter(AgentRun.agent_id == agent.id, AgentRun.status == "failed")
        .order_by(AgentRun.started_at.desc())
        .first()
    )
    if last_failed_run and last_failed_run.error_message:
        warnings.append(f"Last failure: {last_failed_run.error_message[:500]}")

    can_run = not errors
    return {
        "agent_id": agent.id,
        "entrypoint_exists": entrypoint_exists,
        "working_directory_exists": working_directory_exists,
        "output_path_exists": output_path_exists,
        "requirements_exists": requirements_exists,
        "openai_api_key_configured": openai_api_key_configured,
        "can_run": can_run,
        "warnings": warnings,
        "errors": errors,
        "recommendations": recommendations,
        "entrypoint_path": str(entrypoint),
        "working_directory_path": str(working_directory),
        "output_path": str(output_path),
        "requirements_path": str(requirements_path) if requirements_path else "",
        "missing_requirements": missing_requirements,
    }
