from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import AdminAssessmentLog, AdminClient, AdminClientAssignment, AdminCustomTest


def get_assignment_by_admin_and_client(
    db: Session,
    admin_id: int,
    client_id: int,
) -> AdminClientAssignment | None:
    return (
        db.query(AdminClientAssignment)
        .filter(
            AdminClientAssignment.admin_user_id == admin_id,
            AdminClientAssignment.admin_client_id == client_id,
        )
        .first()
    )


def create_assignment(db: Session, admin_id: int, client_id: int, custom_test_id: int) -> AdminClientAssignment:
    row = AdminClientAssignment(
        admin_user_id=admin_id,
        admin_client_id=client_id,
        admin_custom_test_id=custom_test_id,
    )
    db.add(row)
    return row


def get_assigned_clients_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
) -> list[AdminClient]:
    return (
        db.query(AdminClient)
        .join(
            AdminClientAssignment,
            (AdminClientAssignment.admin_client_id == AdminClient.id)
            & (AdminClientAssignment.admin_user_id == admin_user_id),
        )
        .filter(
            AdminClient.admin_user_id == admin_user_id,
            AdminClientAssignment.admin_custom_test_id == custom_test_id,
        )
        .all()
    )


def list_admin_clients_by_admin(db: Session, *, admin_user_id: int) -> list[AdminClient]:
    return (
        db.query(AdminClient)
        .filter(AdminClient.admin_user_id == admin_user_id)
        .order_by(AdminClient.id.desc())
        .all()
    )


def list_client_assignments_with_test_name(db: Session, *, admin_user_id: int):
    return (
        db.query(
            AdminClientAssignment,
            AdminCustomTest.custom_test_name,
            AdminCustomTest.test_id.label("parent_test_id"),
        )
        .join(AdminCustomTest, AdminCustomTest.id == AdminClientAssignment.admin_custom_test_id)
        .filter(AdminClientAssignment.admin_user_id == admin_user_id)
        .all()
    )


def get_client_assignment_with_test_name(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
):
    return (
        db.query(
            AdminClientAssignment,
            AdminCustomTest.custom_test_name,
            AdminCustomTest.test_id.label("parent_test_id"),
        )
        .join(AdminCustomTest, AdminCustomTest.id == AdminClientAssignment.admin_custom_test_id)
        .filter(
            AdminClientAssignment.admin_user_id == admin_user_id,
            AdminClientAssignment.admin_client_id == client_id,
        )
        .first()
    )


def get_last_assessed_rows(db: Session, *, admin_user_id: int):
    return (
        db.query(
            AdminAssessmentLog.admin_client_id.label("client_id"),
            func.max(AdminAssessmentLog.assessed_on).label("last_assessed_on"),
        )
        .filter(AdminAssessmentLog.admin_user_id == admin_user_id)
        .group_by(AdminAssessmentLog.admin_client_id)
        .all()
    )


def get_last_assessed_on_by_client(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
):
    return (
        db.query(func.max(AdminAssessmentLog.assessed_on).label("last_assessed_on"))
        .filter(
            AdminAssessmentLog.admin_user_id == admin_user_id,
            AdminAssessmentLog.admin_client_id == client_id,
        )
        .first()
    )


def list_assessment_logs_by_client(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    limit: int = 30,
):
    return (
        db.query(AdminAssessmentLog)
        .filter(
            AdminAssessmentLog.admin_user_id == admin_user_id,
            AdminAssessmentLog.admin_client_id == client_id,
        )
        .order_by(AdminAssessmentLog.assessed_on.desc(), AdminAssessmentLog.id.desc())
        .limit(limit)
        .all()
    )


def create_admin_client(
    db: Session,
    *,
    admin_user_id: int,
    name: str,
    gender: str,
    birth_day,
    memo: str,
) -> AdminClient:
    row = AdminClient(
        admin_user_id=admin_user_id,
        name=name,
        gender=gender,
        birth_day=birth_day,
        memo=memo,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_admin_client_by_id_and_admin(db: Session, *, client_id: int, admin_user_id: int) -> AdminClient | None:
    return (
        db.query(AdminClient)
        .filter(AdminClient.id == client_id, AdminClient.admin_user_id == admin_user_id)
        .first()
    )


def delete_logs_by_client(db: Session, *, admin_user_id: int, client_id: int) -> None:
    db.query(AdminAssessmentLog).filter(
        AdminAssessmentLog.admin_user_id == admin_user_id,
        AdminAssessmentLog.admin_client_id == client_id,
    ).delete()


def delete_assignments_by_client(db: Session, *, admin_user_id: int, client_id: int) -> None:
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin_user_id,
        AdminClientAssignment.admin_client_id == client_id,
    ).delete()
