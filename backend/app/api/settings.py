from fastapi import APIRouter

from app.config import settings
from app.schemas import SettingsRead, SettingsUpdate
from app.services.settings_service import (
    load_overrides,
    runtime_default_output_dir,
    runtime_kb_root,
    runtime_llm_provider,
    runtime_python_path,
    save_overrides,
)

router = APIRouter()


@router.get("", response_model=SettingsRead)
def get_settings() -> SettingsRead:
    return SettingsRead(
        knowledge_base_root=str(runtime_kb_root()),
        python_path=runtime_python_path(),
        default_output_dir=runtime_default_output_dir(),
        llm_provider=runtime_llm_provider(),
        database_url=settings.database_url,
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
