import json
from pathlib import Path

from app.config import settings
from app.services.runtime_config import (
    DEFAULT_ASSET_LIMIT,
    DEFAULT_EXCLUDED_DIRS,
    DEFAULT_EXCLUDED_FILES,
    DEFAULT_MAX_CONCURRENT_RUNS,
    DEFAULT_MAX_RECENT_FILES,
    DEFAULT_TIMEOUT_SECONDS,
    normalize_int,
    normalize_list,
)


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


def runtime_max_concurrent_runs() -> int:
    return normalize_int(load_overrides().get("max_concurrent_runs"), DEFAULT_MAX_CONCURRENT_RUNS)


def runtime_default_timeout_seconds() -> int:
    return normalize_int(load_overrides().get("default_timeout_seconds"), DEFAULT_TIMEOUT_SECONDS)


def runtime_kb_scan_settings() -> dict:
    data = load_overrides()
    return {
        "excluded_dirs": normalize_list(data.get("excluded_dirs"), DEFAULT_EXCLUDED_DIRS),
        "excluded_files": normalize_list(data.get("excluded_files"), DEFAULT_EXCLUDED_FILES),
        "max_recent_files": normalize_int(data.get("max_recent_files"), DEFAULT_MAX_RECENT_FILES),
        "default_asset_limit": normalize_int(data.get("default_asset_limit"), DEFAULT_ASSET_LIMIT),
    }


def reset_kb_scan_settings() -> dict:
    data = load_overrides()
    data["excluded_dirs"] = DEFAULT_EXCLUDED_DIRS
    data["excluded_files"] = DEFAULT_EXCLUDED_FILES
    data["max_recent_files"] = DEFAULT_MAX_RECENT_FILES
    data["default_asset_limit"] = DEFAULT_ASSET_LIMIT
    save_overrides(data)
    return runtime_kb_scan_settings()
