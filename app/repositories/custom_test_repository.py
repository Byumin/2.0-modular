from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import (
    AdminAssessmentLog,
    AdminAssessmentDraft,
    AdminClientAssignment,
    AdminClientRelation,
    AdminCustomTest,
    AdminCustomTestAccessLink,
    AdminCustomTestSubmission,
    AssessmentLinkPreRegisteredClient,
    SubmissionScoringResult,
)


def list_custom_tests_by_admin(db: Session, admin_id: int) -> list[AdminCustomTest]:
    return (
        db.query(AdminCustomTest)
        .filter(
            AdminCustomTest.admin_user_id == admin_id,
            AdminCustomTest.is_deleted.is_(False),
        )
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
    client_intake_mode: str,
    selected_scales_json: str,
    additional_profile_fields_json: str,
) -> AdminCustomTest:
    row = AdminCustomTest(
        admin_user_id=admin_user_id,
        test_id=test_id,
        sub_test_json=sub_test_json,
        custom_test_name=custom_test_name,
        client_intake_mode=client_intake_mode,
        selected_scales_json=selected_scales_json,
        additional_profile_fields_json=additional_profile_fields_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

# 커스텀 검사 조회 (admin_user_id + custom_test_id)
def get_custom_test_by_id_and_admin(
    db: Session,
    *,
    custom_test_id: int,
    admin_user_id: int,
) -> AdminCustomTest | None: # SQLAlchemy ORM 모델 -> admin_custom_test 테이블 row 반환
    return (
        db.query(AdminCustomTest)
        .filter(
            AdminCustomTest.id == custom_test_id,
            AdminCustomTest.admin_user_id == admin_user_id,
            AdminCustomTest.is_deleted.is_(False),
        )
        .first()
    )

def get_custom_test_by_id(db: Session, custom_test_id: int) -> AdminCustomTest | None:
    return db.query(AdminCustomTest).filter(AdminCustomTest.id == custom_test_id).first()


# 제출 데이터 조회 (admin_user_id + submission_id)
def get_submission_by_id_and_admin(
    db: Session,
    *,
    submission_id: int,
    admin_user_id: int,
) -> AdminCustomTestSubmission | None: # SQLAlchemy ORM 모델 -> admin_custom_test_submission 테이블 row 반환
    return (
        db.query(AdminCustomTestSubmission)
        .filter(
            AdminCustomTestSubmission.id == submission_id,
            AdminCustomTestSubmission.admin_user_id == admin_user_id,
        )
        .first()
    )


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
            AdminCustomTest.is_deleted.is_(False),
        )
        .all()
    )
    return [row.id for row in rows]


def deactivate_access_links_by_test(db: Session, *, admin_user_id: int, custom_test_id: int) -> None:
    db.query(AdminCustomTestAccessLink).filter(
        AdminCustomTestAccessLink.admin_user_id == admin_user_id,
        AdminCustomTestAccessLink.admin_custom_test_id == custom_test_id,
        AdminCustomTestAccessLink.is_active.is_(True),
    ).update({"is_active": False}, synchronize_session=False)


def bulk_deactivate_access_links_by_test_ids(db: Session, *, admin_user_id: int, custom_test_ids: list[int]) -> None:
    db.query(AdminCustomTestAccessLink).filter(
        AdminCustomTestAccessLink.admin_user_id == admin_user_id,
        AdminCustomTestAccessLink.admin_custom_test_id.in_(custom_test_ids),
        AdminCustomTestAccessLink.is_active.is_(True),
    ).update({"is_active": False}, synchronize_session=False)


def soft_delete_custom_test(db: Session, *, admin_user_id: int, custom_test_id: int) -> None:
    db.query(AdminCustomTest).filter(
        AdminCustomTest.admin_user_id == admin_user_id,
        AdminCustomTest.id == custom_test_id,
        AdminCustomTest.is_deleted.is_(False),
    ).update(
        {"is_deleted": True, "deleted_at": datetime.utcnow()},
        synchronize_session=False,
    )


def bulk_soft_delete_custom_tests_by_ids(db: Session, *, admin_user_id: int, custom_test_ids: list[int]) -> None:
    db.query(AdminCustomTest).filter(
        AdminCustomTest.admin_user_id == admin_user_id,
        AdminCustomTest.id.in_(custom_test_ids),
        AdminCustomTest.is_deleted.is_(False),
    ).update(
        {"is_deleted": True, "deleted_at": datetime.utcnow()},
        synchronize_session=False,
    )


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
    client_id: int,
    access_token: str,
    responder_name: str,
    answers_json: str,
) -> AdminCustomTestSubmission:
    row = AdminCustomTestSubmission(
        admin_user_id=admin_user_id,
        admin_custom_test_id=custom_test_id,
        client_id=client_id,
        access_token=access_token,
        responder_name=responder_name,
        answers_json=answers_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_assessment_draft(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    client_id: int,
) -> AdminAssessmentDraft | None:
    return (
        db.query(AdminAssessmentDraft)
        .filter(
            AdminAssessmentDraft.admin_user_id == admin_user_id,
            AdminAssessmentDraft.admin_custom_test_id == custom_test_id,
            AdminAssessmentDraft.admin_client_id == client_id,
        )
        .first()
    )


def upsert_assessment_draft(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    client_id: int,
    access_token: str,
    profile_json: str,
    answers_json: str,
    current_part_index: int,
    current_page: int,
    is_ambiguous_match: bool,
    responder_choice: str | None,
    candidate_client_ids_json: str,
) -> AdminAssessmentDraft:
    row = get_assessment_draft(
        db,
        admin_user_id=admin_user_id,
        custom_test_id=custom_test_id,
        client_id=client_id,
    )
    if row is None:
        row = AdminAssessmentDraft(
            admin_user_id=admin_user_id,
            admin_custom_test_id=custom_test_id,
            admin_client_id=client_id,
            access_token=access_token,
            profile_json=profile_json,
            answers_json=answers_json,
            current_part_index=current_part_index,
            current_page=current_page,
            is_ambiguous_match=is_ambiguous_match,
            responder_choice=responder_choice,
            candidate_client_ids_json=candidate_client_ids_json,
        )
        db.add(row)
    else:
        row.access_token = access_token
        row.profile_json = profile_json
        row.answers_json = answers_json
        row.current_part_index = current_part_index
        row.current_page = current_page
        row.is_ambiguous_match = is_ambiguous_match
        row.responder_choice = responder_choice
        row.candidate_client_ids_json = candidate_client_ids_json
    db.commit()
    db.refresh(row)
    return row


def delete_assessment_draft(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    client_id: int,
) -> None:
    db.query(AdminAssessmentDraft).filter(
        AdminAssessmentDraft.admin_user_id == admin_user_id,
        AdminAssessmentDraft.admin_custom_test_id == custom_test_id,
        AdminAssessmentDraft.admin_client_id == client_id,
    ).delete()
    db.commit()


def create_submission_scoring_result(
    db: Session,
    *,
    admin_user_id: int,
    admin_custom_test_id: int,
    client_id: int | None,
    submission_id: int,
    scoring_status: str,
    result_json: str,
) -> SubmissionScoringResult:
    row = SubmissionScoringResult(
        admin_user_id=admin_user_id,
        admin_custom_test_id=admin_custom_test_id,
        client_id=client_id,
        submission_id=submission_id,
        scoring_status=scoring_status,
        result_json=result_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_submission_scoring_results_by_client(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    limit: int = 30,
):
    return (
        db.query(
            SubmissionScoringResult,
            AdminCustomTest.custom_test_name,
            AdminCustomTest.test_id.label("parent_test_id"),
            AdminCustomTestSubmission.created_at.label("submission_created_at"),
        )
        .join(
            AdminCustomTestSubmission,
            AdminCustomTestSubmission.id == SubmissionScoringResult.submission_id,
        )
        .outerjoin(
            AdminCustomTest,
            AdminCustomTest.id == SubmissionScoringResult.admin_custom_test_id,
        )
        .filter(
            SubmissionScoringResult.admin_user_id == admin_user_id,
            SubmissionScoringResult.client_id == client_id,
        )
        .order_by(SubmissionScoringResult.created_at.desc(), SubmissionScoringResult.id.desc())
        .limit(limit)
        .all()
    )


def get_last_submission_by_client(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
):
    return (
        db.query(
            AdminCustomTestSubmission.created_at.label("submitted_at"),
        )
        .filter(
            AdminCustomTestSubmission.admin_user_id == admin_user_id,
            AdminCustomTestSubmission.client_id == client_id,
        )
        .order_by(AdminCustomTestSubmission.created_at.desc(), AdminCustomTestSubmission.id.desc())
        .first()
    )


def get_latest_submission_by_client_and_test(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    custom_test_id: int,
) -> AdminCustomTestSubmission | None:
    return (
        db.query(AdminCustomTestSubmission)
        .filter(
            AdminCustomTestSubmission.admin_user_id == admin_user_id,
            AdminCustomTestSubmission.client_id == client_id,
            AdminCustomTestSubmission.admin_custom_test_id == custom_test_id,
        )
        .order_by(AdminCustomTestSubmission.created_at.desc(), AdminCustomTestSubmission.id.desc())
        .first()
    )


def count_submissions_by_client_since(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    submitted_from,
) -> int:
    count = (
        db.query(func.count(AdminCustomTestSubmission.id))
        .filter(
            AdminCustomTestSubmission.admin_user_id == admin_user_id,
            AdminCustomTestSubmission.client_id == client_id,
            AdminCustomTestSubmission.created_at >= submitted_from,
        )
        .scalar()
    )
    return int(count or 0)


def list_submissions_by_client_with_test_name(
    db: Session,
    *,
    admin_user_id: int,
    client_id: int,
    limit: int = 30,
):
    # 관련 내담자(relation)의 client_id도 포함 — 같은 관계 검사 결과 공유
    related_ids_sq = (
        select(AdminClientRelation.client_id_a)
        .where(
            AdminClientRelation.admin_user_id == admin_user_id,
            AdminClientRelation.client_id_b == client_id,
        )
        .union(
            select(AdminClientRelation.client_id_b).where(
                AdminClientRelation.admin_user_id == admin_user_id,
                AdminClientRelation.client_id_a == client_id,
            )
        )
    ).subquery()

    return (
        db.query(
            AdminCustomTestSubmission,
            AdminCustomTest.custom_test_name,
            AdminCustomTest.test_id.label("parent_test_id"),
        )
        .join(
            AdminCustomTest,
            AdminCustomTest.id == AdminCustomTestSubmission.admin_custom_test_id,
            isouter=True,
        )
        .filter(
            AdminCustomTestSubmission.admin_user_id == admin_user_id,
            or_(
                AdminCustomTestSubmission.client_id == client_id,
                AdminCustomTestSubmission.client_id.in_(related_ids_sq),
            ),
        )
        .order_by(AdminCustomTestSubmission.created_at.desc(), AdminCustomTestSubmission.id.desc())
        .limit(limit)
        .all()
    )


# ── assessment_link_pre_registered_client ──────────────────────────────────

def get_pre_registered_entries_by_link(
    db: Session,
    access_link_id: int,
) -> list[AssessmentLinkPreRegisteredClient]:
    return (
        db.query(AssessmentLinkPreRegisteredClient)
        .filter(AssessmentLinkPreRegisteredClient.access_link_id == access_link_id)
        .order_by(AssessmentLinkPreRegisteredClient.created_at.asc())
        .all()
    )


def create_pre_registered_entry(
    db: Session,
    *,
    access_link_id: int,
    admin_user_id: int,
    profile_data_json: str,
) -> AssessmentLinkPreRegisteredClient:
    import json
    row = AssessmentLinkPreRegisteredClient(
        access_link_id=access_link_id,
        admin_user_id=admin_user_id,
        profile_data_json=profile_data_json,
    )
    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def delete_pre_registered_entry(
    db: Session,
    *,
    entry_id: int,
    admin_user_id: int,
) -> bool:
    row = (
        db.query(AssessmentLinkPreRegisteredClient)
        .filter(
            AssessmentLinkPreRegisteredClient.id == entry_id,
            AssessmentLinkPreRegisteredClient.admin_user_id == admin_user_id,
        )
        .first()
    )
    if row is None:
        return False
    db.delete(row)
    db.flush()
    return True


def find_pre_registered_entry_by_match(
    db: Session,
    *,
    access_link_id: int,
    match_keys: list[str],
    profile: dict,
) -> AssessmentLinkPreRegisteredClient | None:
    import json
    rows = get_pre_registered_entries_by_link(db, access_link_id)
    normalized_match_keys = [str(k).strip() for k in match_keys if str(k).strip()]
    if not normalized_match_keys:
        return None

    def _normalize_match_key(value: str) -> str:
        return str(value or "").strip().lower().replace(" ", "").replace("_", "").replace("-", "")

    def _is_phone_key(key: str) -> bool:
        normalized = _normalize_match_key(key)
        return "phone" in normalized or "phon" in normalized or "휴대" in key or "핸드폰" in key or "전화" in key or "연락처" in key

    def _phone_digits(value: object) -> str:
        return "".join(ch for ch in str(value or "") if ch.isdigit())

    def _value_for_match(source: dict, key: str) -> str:
        direct = str(source.get(key, "")).strip()
        if direct:
            return direct

        if not _is_phone_key(key):
            return direct

        phone_aliases = {
            "phone",
            "phon_num",
            "phonnum",
            "phone_num",
            "휴대폰번호",
            "휴대폰 번호",
            "휴대전화",
            "핸드폰",
            "핸드폰번호",
            "핸드폰 번호",
            "전화번호",
            "연락처",
        }
        normalized_aliases = {_normalize_match_key(alias) for alias in phone_aliases}
        for source_key, value in source.items():
            if _normalize_match_key(source_key) in normalized_aliases:
                text = str(value or "").strip()
                if text:
                    return text
        return direct

    for row in rows:
        try:
            stored = json.loads(row.profile_data_json or "{}")
        except Exception:
            stored = {}

        is_match = True
        for key in normalized_match_keys:
            stored_value = _value_for_match(stored, key)
            profile_value = _value_for_match(profile, key)
            if _is_phone_key(key):
                stored_value = _phone_digits(stored_value)
                profile_value = _phone_digits(profile_value)
            else:
                stored_value = stored_value.lower()
                profile_value = profile_value.lower()
            if not stored_value or not profile_value or stored_value != profile_value:
                is_match = False
                break
        if is_match:
            return row
    return None


def update_pre_registered_provisional_client(
    db: Session,
    *,
    entry_id: int,
    client_id: int,
) -> None:
    row = db.query(AssessmentLinkPreRegisteredClient).filter(
        AssessmentLinkPreRegisteredClient.id == entry_id
    ).first()
    if row is not None:
        row.provisional_client_id = client_id
        db.flush()
