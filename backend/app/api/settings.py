from fastapi import APIRouter

from app.config import settings
from app.schemas import SettingsRead, SettingsUpdate
from app.services.settings_service import (
    load_overrides,
    reset_kb_scan_settings,
    runtime_default_output_dir,
    runtime_default_timeout_seconds,
    runtime_kb_scan_settings,
    runtime_kb_root,
    runtime_llm_provider,
    runtime_max_concurrent_runs,
    runtime_python_path,
    save_overrides,
)

router = APIRouter()


@router.get("", response_model=SettingsRead)
def get_settings() -> SettingsRead:
    scan_settings = runtime_kb_scan_settings()
    return SettingsRead(
        knowledge_base_root=str(runtime_kb_root()),
        python_path=runtime_python_path(),
        default_output_dir=runtime_default_output_dir(),
        llm_provider=runtime_llm_provider(),
        database_url=settings.database_url,
        max_concurrent_runs=runtime_max_concurrent_runs(),
        default_timeout_seconds=runtime_default_timeout_seconds(),
        excluded_dirs=scan_settings["excluded_dirs"],
        excluded_files=scan_settings["excluded_files"],
        max_recent_files=scan_settings["max_recent_files"],
        default_asset_limit=scan_settings["default_asset_limit"],
        required_env=["OPENAI_API_KEY", "AI_NEWS_LLM_MODEL", "AI_NEWS_LLM_BASE_URL", "AGENTOS_KB_ROOT", "AGENTOS_PYTHON_PATH"],
        security_notes=[
            "API Key only comes from environment variables and is not displayed in AgentOS.",
            "AgentOS v1 only executes registered Python entrypoints under the scripts directory.",
            "AgentOS never deletes knowledge-base files and never auto-pushes GitHub changes.",
        ],
    )


@router.put("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate) -> SettingsRead:
    data = load_overrides()
    for key, value in payload.model_dump(exclude_unset=True).items():
        data[key] = value
    save_overrides(data)
    return get_settings()


@router.post("/knowledge-base/reset-scan")
def reset_kb_scan_settings_api() -> SettingsRead:
    reset_kb_scan_settings()
    return get_settings()
