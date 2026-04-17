from fastapi import APIRouter, Cookie, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.admin.auth import get_current_admin
from app.services.report.builder import get_public_report_by_submission_id, get_report_by_submission_id

router = APIRouter()


@router.get("/api/report/by-submission/{submission_id}")
def public_report_by_submission_id(
    submission_id: int,
    token: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> dict:
    return get_public_report_by_submission_id(db, submission_id=submission_id, access_token=token)


@router.get("/api/admin/report/{submission_id}")
def report_by_submission_id(
    submission_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    admin = get_current_admin(db, admin_session)
    return get_report_by_submission_id(db, admin_user_id=admin.id, submission_id=submission_id)
