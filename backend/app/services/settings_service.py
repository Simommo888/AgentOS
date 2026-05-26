import json
from pathlib import Path

from app.config import settings


def load_overrides() -> dict:
    if not settings.settings_file.exists():
        return {}
    return json.loads(settings.settings_file.read_text(encoding="utf-8"))


def save_overrides(data: dict) -> None:
    settings.settings_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def runtime_kb_root() -> Path:
    data = load_overrides()
    return Path(data.get("knowledge_base_root", str(settings.kb_root))).resolve()


def runtime_python_path() -> str:
    data = load_overrides()
    return data.get("python_path", settings.python_path)


def runtime_default_output_dir() -> str:
    data = load_overrides()
    return data.get("default_output_dir", settings.default_output_dir)


def runtime_llm_provider() -> str:
    data = load_overrides()
    return data.get("llm_provider", settings.llm_provider)
