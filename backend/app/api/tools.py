from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ToolPermission
from app.schemas import ToolPermissionRead, ToolPermissionUpdate

router = APIRouter()


@router.get("")
def list_tools() -> list[dict[str, str]]:
    return [
        {"name": "web", "description": "Read public web pages or search results."},
        {"name": "rss", "description": "Read RSS feeds."},
        {"name": "llm", "description": "Call configured LLM providers via environment variables."},
        {"name": "obsidian", "description": "Write Markdown files into the knowledge base."},
        {"name": "filesystem", "description": "Read or write files inside allowed knowledge-base paths."},
        {"name": "git", "description": "Read git status. AgentOS v1 never auto-pushes."},
    ]


@router.get("/permissions", response_model=list[ToolPermissionRead])
def list_permissions(agent_id: str | None = None, db: Session = Depends(get_db)) -> list[ToolPermission]:
    query = db.query(ToolPermission)
    if agent_id:
        query = query.filter(ToolPermission.agent_id == agent_id)
    return query.order_by(ToolPermission.agent_id.asc(), ToolPermission.tool_name.asc()).all()


@router.put("/permissions/{permission_id}", response_model=ToolPermissionRead)
def update_permission(
    permission_id: int,
    payload: ToolPermissionUpdate,
    db: Session = Depends(get_db),
) -> ToolPermission:
    permission = db.query(ToolPermission).filter(ToolPermission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(permission, key, value)
    db.commit()
    db.refresh(permission)
    return permission
