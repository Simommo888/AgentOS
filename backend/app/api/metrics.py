from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MetricsOverviewRead
from app.services.metrics_service import overview_metrics

router = APIRouter()


@router.get("/overview", response_model=MetricsOverviewRead)
def get_metrics_overview(db: Session = Depends(get_db)) -> dict:
    return overview_metrics(db)
