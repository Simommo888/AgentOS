import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import AgentRun, KnowledgeAsset
from app.services.knowledge_base_service import enrich_asset, suggest_location
from app.services.settings_service import runtime_kb_root
from app.utils.file_utils import safe_read_text
from app.utils.paths import resolve_kb_relative


def _parse_output_files(value: str) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed if item]


def _file_artifact(file_path: str) -> dict:
    root = runtime_kb_root()
    path = resolve_kb_relative(file_path)
    exists = path.exists()
    size = 0
    modified_at = None
    preview = ""
    warning = ""
    readable = False
    if exists:
        try:
            stat = path.stat()
            size = stat.st_size
            modified_at = stat.st_mtime
            preview = safe_read_text(path, 1200)
            readable = bool(preview) or size == 0
            if size == 0:
                warning = "File exists but is empty."
        except OSError:
            warning = "File exists but metadata could not be read."
    else:
        warning = "File path is recorded but the file does not exist."

    try:
        title = Path(file_path).stem
    except OSError:
        title = file_path
    return {
        "title": title,
        "file_path": file_path,
        "asset_type": "markdown" if file_path.lower().endswith(".md") else "file",
        "suggested_location": suggest_location(file_path),
        "file_exists": exists,
        "file_size": size,
        "modified_at": modified_at,
        "preview": preview,
        "warning": warning,
        "readable": readable,
        "absolute_path": str(path if exists else root / file_path),
    }


def run_artifacts(db: Session, run_id: int) -> list[dict]:
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        return []

    by_path: dict[str, dict] = {}
    for file_path in _parse_output_files(run.output_files_json):
        by_path[file_path] = _file_artifact(file_path)

    assets = db.query(KnowledgeAsset).filter(KnowledgeAsset.run_id == run_id).order_by(KnowledgeAsset.created_at.desc()).all()
    for asset in assets:
        enriched = enrich_asset(asset)
        by_path[asset.file_path] = {
            "title": enriched["title"],
            "file_path": enriched["file_path"],
            "asset_type": enriched["asset_type"],
            "suggested_location": enriched["suggested_location"],
            "file_exists": enriched["file_exists"],
            "file_size": enriched["file_size"],
            "modified_at": enriched["modified_at"],
            "preview": enriched["preview"],
            "warning": enriched["warning"],
            "readable": enriched["readable"],
            "absolute_path": enriched["absolute_path"],
        }

    return list(by_path.values())
