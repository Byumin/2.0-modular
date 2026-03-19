from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.admin.dashboard import admin_assessment_stats, admin_dashboard

router = APIRouter()


@router.get("/api/admin/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_dashboard(db, admin_session)


@router.get("/api/admin/assessment-stats")
def assessment_stats(
    days: int = 14,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_assessment_stats(db, admin_session, days)
