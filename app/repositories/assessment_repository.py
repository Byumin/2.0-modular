from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import AdminAssessmentLog


def create_assessment_log(db: Session, *, admin_user_id: int, client_id: int, assessed_on: date) -> AdminAssessmentLog:
    row = AdminAssessmentLog(
        admin_user_id=admin_user_id,
        admin_client_id=client_id,
        assessed_on=assessed_on,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_assessment_stats_rows(db: Session, *, admin_user_id: int, from_date):
    return (
        db.query(
            AdminAssessmentLog.assessed_on.label("assessed_on"),
            func.count(AdminAssessmentLog.id).label("count"),
        )
        .filter(
            AdminAssessmentLog.admin_user_id == admin_user_id,
            AdminAssessmentLog.assessed_on >= from_date,
        )
        .group_by(AdminAssessmentLog.assessed_on)
        .order_by(AdminAssessmentLog.assessed_on.asc())
        .all()
    )
