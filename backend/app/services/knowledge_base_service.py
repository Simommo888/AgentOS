import fnmatch
import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import KnowledgeAsset
from app.services.runtime_config import DEFAULT_EXCLUDED_DIRS, DEFAULT_EXCLUDED_FILES
from app.services.settings_service import runtime_default_output_dir, runtime_kb_root, runtime_kb_scan_settings
from app.utils.file_utils import safe_read_text
from app.utils.paths import resolve_kb_relative

CATEGORY_DIRS = {
    "AI News": "04_Resources/AI-News",
    "AI-News": "04_Resources/AI-News",
    "Daily AI News": "04_Resources/AI-News/Daily",
    "People Watch": "04_Resources/AI-News/People-Watch",
    "Permanent Notes": "05_Permanent-Notes",
    "Business Ideas": "11_Business-Ideas",
    "Prompts": "09_Prompts",
    "Error Fixes": "10_Error-Fixes",
    "AgentOS": "04_Resources/AgentOS",
}

EXCLUDED_DIR_NAMES = set(DEFAULT_EXCLUDED_DIRS)
EXCLUDED_FILE_PATTERNS = set(DEFAULT_EXCLUDED_FILES)


def get_kb_config() -> dict:
    scan_settings = runtime_kb_scan_settings()
    return {
        "knowledge_base_root": str(runtime_kb_root()),
        "categories": CATEGORY_DIRS,
        "default_output_dir": runtime_default_output_dir(),
        "excluded_dirs": scan_settings["excluded_dirs"],
        "excluded_files": scan_settings["excluded_files"],
        "max_recent_files": scan_settings["max_recent_files"],
        "default_asset_limit": scan_settings["default_asset_limit"],
    }


def _normalized_relative(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def _is_excluded_dir(path: Path, root: Path) -> bool:
    excluded_dirs = set(runtime_kb_scan_settings()["excluded_dirs"])
    if path.name in excluded_dirs:
        return True
    relative = _normalized_relative(path, root)
    return any(part in excluded_dirs for part in relative.split("/"))


def _is_excluded_file(path: Path, root: Path) -> bool:
    excluded_files = runtime_kb_scan_settings()["excluded_files"]
    relative = _normalized_relative(path, root)
    return any(fnmatch.fnmatch(path.name, pattern) or fnmatch.fnmatch(relative, pattern) for pattern in excluded_files)


def _iter_markdown_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    files: list[Path] = []
    for current_root, dir_names, file_names in os.walk(root):
        current = Path(current_root)
        dir_names[:] = [name for name in dir_names if not _is_excluded_dir(current / name, root)]
        for file_name in file_names:
            path = current / file_name
            if path.suffix.lower() != ".md":
                continue
            if _is_excluded_file(path, root):
                continue
            files.append(path)
    return files


def suggest_location(file_path: str) -> str:
    normalized = file_path.replace("\\", "/")
    if "AI-News" in normalized:
        return "04_Resources/AI-News"
    if "Prompt" in normalized or "prompt" in normalized:
        return "09_Prompts"
    if "Error" in normalized or "error" in normalized:
        return "10_Error-Fixes"
    if "Business" in normalized or "business" in normalized:
        return "11_Business-Ideas"
    if "Project" in normalized or "project" in normalized:
        return "02_Projects"
    return "05_Permanent-Notes"


def _file_metadata(path: Path, root: Path) -> dict:
    exists = path.exists()
    readable = False
    preview = ""
    size = 0
    modified_at = None
    warning = ""
    if exists:
        try:
            stat = path.stat()
            size = stat.st_size
            modified_at = stat.st_mtime
            preview = safe_read_text(path, 600)
            readable = bool(preview) or size == 0
            if size == 0:
                warning = "File exists but is empty."
            elif not readable:
                warning = "File exists but could not be read."
        except OSError:
            warning = "File exists but metadata could not be read."
    else:
        warning = "File path is recorded but the file does not exist."

    return {
        "file_exists": exists,
        "is_empty": exists and size == 0,
        "file_empty": exists and size == 0,
        "file_size": size,
        "modified_at": modified_at,
        "readable": readable,
        "preview": preview,
        "warning": warning,
    }


def scan_recent_markdown(limit: int = 50, category: str | None = None, search: str | None = None) -> list[dict]:
    root = runtime_kb_root()
    limit = min(limit, runtime_kb_scan_settings()["max_recent_files"])
    files = _iter_markdown_files(root)
    if category:
        category_path = CATEGORY_DIRS.get(category, category)
        normalized_category = category_path.replace("\\", "/")
        files = [path for path in files if _normalized_relative(path, root).startswith(normalized_category)]
    if search:
        lowered = search.lower()
        files = [path for path in files if lowered in path.name.lower() or lowered in _normalized_relative(path, root).lower()]
    files = sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)[:limit]

    assets: list[dict] = []
    for path in files:
        relative = _normalized_relative(path, root)
        metadata = _file_metadata(path, root)
        assets.append(
            {
                "title": path.stem,
                "file_path": relative,
                "asset_type": "markdown",
                "suggested_location": suggest_location(relative),
                "updated_at": metadata["modified_at"] or 0,
                **metadata,
            }
        )
    return assets


def enrich_asset(asset: KnowledgeAsset) -> dict:
    root = runtime_kb_root()
    path = resolve_kb_relative(asset.file_path)
    metadata = _file_metadata(path, root)
    return {
        "id": asset.id,
        "agent_id": asset.agent_id,
        "run_id": asset.run_id,
        "title": asset.title,
        "asset_type": asset.asset_type,
        "file_path": asset.file_path,
        "suggested_location": asset.suggested_location,
        "tags_json": asset.tags_json,
        "created_at": asset.created_at,
        "absolute_path": str(path if metadata["file_exists"] else root / asset.file_path),
        **metadata,
    }


def scan_agent_output(output_path: str, started_after_ts: float | None = None) -> list[Path]:
    root = resolve_kb_relative(output_path)
    if not root.exists():
        return []
    files = [path for path in _iter_markdown_files(root) if path.is_file()]
    if started_after_ts is not None:
        files = [path for path in files if path.stat().st_mtime >= started_after_ts - 2]
    return sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)


def record_assets_for_files(
    db: Session,
    files: list[Path],
    agent_id: str | None,
    run_id: int | None,
) -> list[KnowledgeAsset]:
    if not files:
        return []
    records: list[KnowledgeAsset] = []
    root = runtime_kb_root()
    relative_paths: list[str] = []
    for path in files:
        try:
            relative_paths.append(path.relative_to(root).as_posix())
        except ValueError:
            relative_paths.append(path.as_posix())
    existing_by_path = {
        row.file_path: row
        for row in db.query(KnowledgeAsset).filter(KnowledgeAsset.file_path.in_(relative_paths)).all()
    }
    for path, relative in zip(files, relative_paths):
        if _is_excluded_file(path, root):
            continue
        if relative in existing_by_path:
            existing = existing_by_path[relative]
            existing.agent_id = agent_id
            existing.run_id = run_id
            existing.title = path.stem
            existing.asset_type = "markdown"
            existing.suggested_location = suggest_location(relative)
            records.append(existing)
            continue
        asset = KnowledgeAsset(
            agent_id=agent_id,
            run_id=run_id,
            title=path.stem,
            asset_type="markdown",
            file_path=relative,
            suggested_location=suggest_location(relative),
            tags_json='["agentos"]',
        )
        db.add(asset)
        records.append(asset)
    db.commit()
    return records
