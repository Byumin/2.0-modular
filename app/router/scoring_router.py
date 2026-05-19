from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.scoring.submissions import trigger_submission_scoring

router = APIRouter()


@router.post("/api/admin/submissions/{submission_id}/score")
def score_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return trigger_submission_scoring(db, admin_session, submission_id)
