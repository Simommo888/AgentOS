from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prompt
from app.schemas import PromptCreate, PromptRead, PromptUpdate
from app.services.prompt_service import list_prompts

router = APIRouter()


@router.get("", response_model=list[PromptRead])
def get_prompts(
    agent_id: str | None = None,
    scenario: str | None = None,
    db: Session = Depends(get_db),
) -> list[Prompt]:
    return list_prompts(db, agent_id=agent_id, scenario=scenario)


@router.post("", response_model=PromptRead)
def create_prompt(payload: PromptCreate, db: Session = Depends(get_db)) -> Prompt:
    prompt = Prompt(**payload.model_dump())
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.put("/{prompt_id}", response_model=PromptRead)
def update_prompt(prompt_id: int, payload: PromptUpdate, db: Session = Depends(get_db)) -> Prompt:
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prompt, key, value)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"message": "Prompt deleted"}
