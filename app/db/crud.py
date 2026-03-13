from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    AdminAssessmentLog,
    AdminClient,
    AdminClientAssignment,
    AdminCustomTest,
    AdminCustomTestAccessLink,
    AdminCustomTestSubmission,
    AdminUser,
)
from app.db.session import engine


def get_admin_by_username(db: Session, username: str) -> AdminUser | None:
    """관리자 아이디(username)로 관리자 1건을 조회한다."""
    return db.query(AdminUser).filter(AdminUser.username == username).first()


def get_admin_by_id(db: Session, admin_id: int) -> AdminUser | None:
    """관리자 PK(id)로 관리자 1건을 조회한다."""
    return db.query(AdminUser).filter(AdminUser.id == admin_id).first()


def create_admin_user(db: Session, username: str, password_hash: str) -> AdminUser:
    """신규 관리자 계정을 생성하고 즉시 커밋한 뒤 생성 엔티티를 반환한다."""
    row = AdminUser(username=username, password_hash=password_hash)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_custom_tests_by_admin(db: Session, admin_id: int) -> list[AdminCustomTest]:
    """특정 관리자가 생성한 커스텀 검사 목록을 최신순으로 조회한다."""
    return (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.admin_user_id == admin_id)
        .order_by(AdminCustomTest.id.desc())
        .all()
    )


def get_assignment_counts_by_admin(db: Session, admin_id: int) -> dict[int, int]:
    """관리자 기준 검사별 배정 인원 수를 {검사ID: 배정수} 형태로 집계한다."""
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
    """관리자 기준 검사별 실시 인원(중복 내담자 제외)을 집계한다."""
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


def get_assignment_by_admin_and_client(
    db: Session,
    admin_id: int,
    client_id: int,
) -> AdminClientAssignment | None:
    """관리자-내담자 기준 현재 배정 레코드 1건을 조회한다."""
    return (
        db.query(AdminClientAssignment)
        .filter(
            AdminClientAssignment.admin_user_id == admin_id,
            AdminClientAssignment.admin_client_id == client_id,
        )
        .first()
    )


def create_assignment(db: Session, admin_id: int, client_id: int, custom_test_id: int) -> AdminClientAssignment:
    """내담자에게 검사를 배정하는 레코드를 생성한다(커밋은 호출부에서 처리)."""
    row = AdminClientAssignment(
        admin_user_id=admin_id,
        admin_client_id=client_id,
        admin_custom_test_id=custom_test_id,
    )
    db.add(row)
    return row


def delete_row(db: Session, row: Any) -> None:
    """전달받은 ORM 엔티티 1건을 삭제 상태로 표시한다(커밋은 호출부에서 처리)."""
    db.delete(row)


def get_assigned_clients_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
) -> list[AdminClient]:
    """특정 검사에 배정된 내담자 목록을 조회해 프로필 검증에 사용한다."""
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


def fetch_parent_scale_struct(test_id: str, sub_test_json: str):
    """원본(parent_scale)에서 검사/서브검사 조합의 척도 구조를 Raw SQL로 조회한다."""
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT scale_struct
            FROM parent_scale
            WHERE test_id = ? AND sub_test_json = ?
            """,
            (test_id, sub_test_json),
        ).fetchone()


def fetch_parent_catalog_rows():
    """관리자 카탈로그 화면용 원본 검사/문항/척도/선택지 데이터를 일괄 조회한다."""
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT
                i.test_id,
                i.sub_test_json,
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            ORDER BY i.test_id, i.sub_test_json
            """
        ).fetchall()


def fetch_parent_item_bundle(test_id: str, sub_test_json: str):
    """검사 실시 payload 조합에 필요한 원본 문항 번들 1건을 조회한다."""
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct AS scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            WHERE i.test_id = ? AND i.sub_test_json = ?
            LIMIT 1
            """,
            (test_id, sub_test_json),
        ).fetchone()


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
    """관리자 커스텀 검사(child_test)를 생성하고 커밋 후 반환한다."""
    row = AdminCustomTest(
        admin_user_id=admin_user_id,
        test_id=test_id,
        sub_test_json=sub_test_json, # 이건 어떻게 척도별 공통된 sub_test_json을 확인하고 넣는거지?
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
    """관리자 소유권 조건으로 커스텀 검사 1건을 조회한다."""
    return (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin_user_id)
        .first()
    )


def get_active_access_link_by_admin_and_test(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
) -> AdminCustomTestAccessLink | None:
    """관리자/검사 기준 활성화된 최신 접근 링크를 조회한다."""
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
    """검사 접근용 토큰 링크를 생성하고 커밋 후 반환한다."""
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


def get_active_access_link_by_token(db: Session, access_token: str) -> AdminCustomTestAccessLink | None:
    """접근 토큰 문자열로 활성 링크 1건을 조회한다."""
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
    """검사 응답 제출 레코드를 생성하고 커밋 후 반환한다."""
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


def commit(db: Session) -> None:
    """현재 트랜잭션을 커밋한다."""
    db.commit()


def refresh(db: Session, row: Any) -> None:
    """커밋 후 엔티티 최신 상태를 DB에서 다시 로드한다."""
    db.refresh(row)


def delete_assignments_by_test(db: Session, *, admin_user_id: int, custom_test_id: int) -> None:
    """특정 검사에 연결된 배정 레코드를 관리자 범위에서 일괄 삭제한다."""
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
    """요청 ID 목록 중 해당 관리자 소유로 실제 존재하는 검사 ID만 반환한다."""
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
    """검사 ID 목록에 대한 배정 레코드를 관리자 범위에서 일괄 삭제한다."""
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin_user_id,
        AdminClientAssignment.admin_custom_test_id.in_(custom_test_ids),
    ).delete(synchronize_session=False)


def bulk_delete_custom_tests_by_ids(db: Session, *, admin_user_id: int, custom_test_ids: list[int]) -> None:
    """검사 ID 목록에 해당하는 커스텀 검사를 관리자 범위에서 일괄 삭제한다."""
    db.query(AdminCustomTest).filter(
        AdminCustomTest.admin_user_id == admin_user_id,
        AdminCustomTest.id.in_(custom_test_ids),
    ).delete(synchronize_session=False)


def list_admin_clients_by_admin(db: Session, *, admin_user_id: int) -> list[AdminClient]:
    """관리자 소유 내담자 목록을 최신순으로 조회한다."""
    return (
        db.query(AdminClient)
        .filter(AdminClient.admin_user_id == admin_user_id)
        .order_by(AdminClient.id.desc())
        .all()
    )


def list_client_assignments_with_test_name(db: Session, *, admin_user_id: int):
    """내담자 배정 정보와 검사명을 조인하여 목록으로 조회한다."""
    return (
        db.query(AdminClientAssignment, AdminCustomTest.custom_test_name)
        .join(
            AdminCustomTest,
            AdminCustomTest.id == AdminClientAssignment.admin_custom_test_id,
        )
        .filter(AdminClientAssignment.admin_user_id == admin_user_id)
        .all()
    )


def get_last_assessed_rows(db: Session, *, admin_user_id: int):
    """내담자별 마지막 실시일(MAX)을 집계해 반환한다."""
    return (
        db.query(
            AdminAssessmentLog.admin_client_id.label("client_id"),
            func.max(AdminAssessmentLog.assessed_on).label("last_assessed_on"),
        )
        .filter(AdminAssessmentLog.admin_user_id == admin_user_id)
        .group_by(AdminAssessmentLog.admin_client_id)
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
    """신규 내담자를 생성하고 커밋 후 생성 엔티티를 반환한다."""
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
    """관리자 소유권 조건으로 내담자 1건을 조회한다."""
    return (
        db.query(AdminClient)
        .filter(AdminClient.id == client_id, AdminClient.admin_user_id == admin_user_id)
        .first()
    )


def delete_logs_by_client(db: Session, *, admin_user_id: int, client_id: int) -> None:
    """내담자의 검사 실시 로그를 관리자 범위에서 일괄 삭제한다."""
    db.query(AdminAssessmentLog).filter(
        AdminAssessmentLog.admin_user_id == admin_user_id,
        AdminAssessmentLog.admin_client_id == client_id,
    ).delete()


def delete_assignments_by_client(db: Session, *, admin_user_id: int, client_id: int) -> None:
    """내담자의 검사 배정 레코드를 관리자 범위에서 일괄 삭제한다."""
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin_user_id,
        AdminClientAssignment.admin_client_id == client_id,
    ).delete()


def create_assessment_log(db: Session, *, admin_user_id: int, client_id: int, assessed_on) -> AdminAssessmentLog:
    """내담자 검사 실시 이력 1건을 생성하고 커밋 후 반환한다."""
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
    """시작일 이후 일자별 실시 건수를 집계해 오름차순으로 반환한다."""
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
