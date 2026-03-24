from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    AdminAssessmentLog,
    AdminClientAssignment,
    AdminCustomTest,
    AdminCustomTestAccessLink,
    AdminCustomTestSubmission,
)


def list_custom_tests_by_admin(db: Session, admin_id: int) -> list[AdminCustomTest]:
    return (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.admin_user_id == admin_id)
        .order_by(AdminCustomTest.id.desc())
        .all()
    )


def get_assignment_counts_by_admin(db: Session, admin_id: int) -> dict[int, int]:
    rows = (
        db.query(
            AdminClientAssignment.admin_custom_test_id.label("custom_test_id"),
            func.count(AdminClientAssignment.id).label("assigned_count"),
        )
        .filter(AdminClientAssignment.admin_user_id == admin_id)
        .group_by(AdminClientAssignment.admin_custom_test_id)
        .all()
    )
    return {row.custom_test_id: int(row.assigned_count) for row in rows}


def get_assessed_counts_by_admin(db: Session, admin_id: int) -> dict[int, int]:
    rows = (
        db.query(
            AdminClientAssignment.admin_custom_test_id.label("custom_test_id"),
            func.count(func.distinct(AdminAssessmentLog.admin_client_id)).label("assessed_count"),
        )
        .join(
            AdminAssessmentLog,
            (AdminAssessmentLog.admin_user_id == AdminClientAssignment.admin_user_id)
            & (AdminAssessmentLog.admin_client_id == AdminClientAssignment.admin_client_id),
            isouter=True,
        )
        .filter(AdminClientAssignment.admin_user_id == admin_id)
        .group_by(AdminClientAssignment.admin_custom_test_id)
        .all()
    )
    return {row.custom_test_id: int(row.assessed_count) for row in rows}


def create_custom_test(
    db: Session,
    *,
    admin_user_id: int,
    test_id: str,
    sub_test_json: str,
    custom_test_name: str,
    selected_scales_json: str,
    additional_profile_fields_json: str,
) -> AdminCustomTest:
    row = AdminCustomTest(
        admin_user_id=admin_user_id,
        test_id=test_id,
        sub_test_json=sub_test_json,
        custom_test_name=custom_test_name,
        selected_scales_json=selected_scales_json,
        additional_profile_fields_json=additional_profile_fields_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_custom_test_by_id_and_admin(
    db: Session,
    *,
    custom_test_id: int,
    admin_user_id: int,
) -> AdminCustomTest | None:
    return (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin_user_id)
        .first()
    )


def delete_assignments_by_test(db: Session, *, admin_user_id: int, custom_test_id: int) -> None:
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin_user_id,
        AdminClientAssignment.admin_custom_test_id == custom_test_id,
    ).delete()


def get_custom_test_ids_in(
    db: Session,
    *,
    admin_user_id: int,
    target_ids: list[int],
) -> list[int]:
    rows = (
        db.query(AdminCustomTest.id)
        .filter(
            AdminCustomTest.admin_user_id == admin_user_id,
            AdminCustomTest.id.in_(target_ids),
        )
        .all()
    )
    return [row.id for row in rows]


def bulk_delete_assignments_by_test_ids(db: Session, *, admin_user_id: int, custom_test_ids: list[int]) -> None:
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin_user_id,
        AdminClientAssignment.admin_custom_test_id.in_(custom_test_ids),
    ).delete(synchronize_session=False)


def bulk_delete_custom_tests_by_ids(db: Session, *, admin_user_id: int, custom_test_ids: list[int]) -> None:
    db.query(AdminCustomTest).filter(
        AdminCustomTest.admin_user_id == admin_user_id,
        AdminCustomTest.id.in_(custom_test_ids),
    ).delete(synchronize_session=False)


def get_active_access_link_by_admin_and_test(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
) -> AdminCustomTestAccessLink | None:
    return (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.admin_user_id == admin_user_id,
            AdminCustomTestAccessLink.admin_custom_test_id == custom_test_id,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .order_by(AdminCustomTestAccessLink.id.desc())
        .first()
    )


def create_access_link(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    access_token: str,
) -> AdminCustomTestAccessLink:
    row = AdminCustomTestAccessLink(
        admin_user_id=admin_user_id,
        admin_custom_test_id=custom_test_id,
        access_token=access_token,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

# access token으로 링크 조회, is_active=True인 경우만
def get_active_access_link_by_token(db: Session, access_token: str) -> AdminCustomTestAccessLink | None:
    return (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.access_token == access_token,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .first()
    )


def create_submission(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    access_token: str,
    responder_name: str,
    answers_json: str,
) -> AdminCustomTestSubmission:
    row = AdminCustomTestSubmission(
        admin_user_id=admin_user_id,
        admin_custom_test_id=custom_test_id,
        access_token=access_token,
        responder_name=responder_name,
        answers_json=answers_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
