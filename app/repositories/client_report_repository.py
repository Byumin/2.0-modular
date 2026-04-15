from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import AdminClientReport


def get_report_by_client(db: Session, *, admin_user_id: int, client_id: int) -> AdminClientReport | None:
    return (
        db.query(AdminClientReport)
        .filter(
            AdminClientReport.admin_user_id == admin_user_id,
            AdminClientReport.client_id == client_id,
        )
        .first()
    )


def upsert_report(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    sections_json: str,
) -> AdminClientReport:
    row = get_report_by_client(db, admin_user_id=admin_user_id, client_id=client_id)
    if row is None:
        row = AdminClientReport(
            admin_user_id=admin_user_id,
            client_id=client_id,
            sections_json=sections_json,
        )
        db.add(row)
    else:
        row.sections_json = sections_json
        row.updated_at = datetime.utcnow()
    return row
