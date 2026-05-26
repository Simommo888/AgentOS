from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import KnowledgeAsset
from app.services.knowledge_base_service import CATEGORY_DIRS, enrich_asset, get_kb_config, scan_recent_markdown
from app.services.settings_service import runtime_kb_scan_settings

router = APIRouter()


def _category_path(category: str | None) -> str | None:
    if not category:
        return None
    return CATEGORY_DIRS.get(category, category).replace("\\", "/")


@router.get("/assets")
def list_assets(
    category: str | None = None,
    search: str | None = None,
    limit: int | None = Query(default=None, le=200),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = db.query(KnowledgeAsset)
    category_path = _category_path(category)
    if category_path:
        query = query.filter(KnowledgeAsset.file_path.like(f"{category_path}%"))
    if search:
        like = f"%{search}%"
        query = query.filter(or_(KnowledgeAsset.title.like(like), KnowledgeAsset.file_path.like(like)))
    resolved_limit = limit or runtime_kb_scan_settings()["default_asset_limit"]
    assets = query.order_by(KnowledgeAsset.created_at.desc()).limit(resolved_limit).all()
    return [enrich_asset(asset) for asset in assets]


@router.get("/recent")
def recent_files(
    category: str | None = None,
    search: str | None = None,
    limit: int | None = Query(default=None, le=200),
) -> list[dict]:
    resolved_limit = limit or runtime_kb_scan_settings()["max_recent_files"]
    return scan_recent_markdown(limit=resolved_limit, category=category, search=search)


@router.get("/config")
def kb_config() -> dict:
    return get_kb_config()
