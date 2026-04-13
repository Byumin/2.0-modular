import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.base_repository import commit
from app.repositories.client_repository import (
    delete_assignments_by_client,
    delete_logs_by_client,
    get_admin_client_by_id_and_admin,
)
from app.repositories.custom_test_repository import get_custom_test_by_id_and_admin
from app.repositories.identity_review_repository import (
    count_pending_reviews_by_admin,
    get_identity_review_by_id,
    list_pending_reviews_by_admin,
    update_review_status,
)
from app.services.admin.auth import get_current_admin
from app.services.admin.common import serialize_admin_client


def _serialize_review(review, *, admin_user_id: int, db: Session) -> dict[str, Any]:
    try:
        input_profile = json.loads(review.input_profile_json or "{}")
    except Exception:
        input_profile = {}
    try:
        candidate_ids = json.loads(review.candidate_client_ids_json or "[]")
    except Exception:
        candidate_ids = []

    candidates = []
    for cid in candidate_ids:
        row = get_admin_client_by_id_and_admin(db, client_id=cid, admin_user_id=admin_user_id)
        if row:
            candidates.append(serialize_admin_client(row))

    chosen = None
    if review.chosen_client_id:
        row = get_admin_client_by_id_and_admin(db, client_id=review.chosen_client_id, admin_user_id=admin_user_id)
        if row:
            chosen = serialize_admin_client(row)

    provisional = None
    if review.provisional_client_id:
        row = get_admin_client_by_id_and_admin(db, client_id=review.provisional_client_id, admin_user_id=admin_user_id)
        if row:
            provisional = serialize_admin_client(row)

    return {
        "id": review.id,
        "admin_custom_test_id": review.admin_custom_test_id,
        "submission_id": review.submission_id,
        "input_profile": input_profile,
        "candidates": candidates,
        "responder_choice": review.responder_choice,
        "chosen_client": chosen,
        "provisional_client": provisional,
        "review_status": review.review_status,
        "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None,
        "created_at": review.created_at.isoformat(),
    }


def list_identity_reviews(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    reviews = list_pending_reviews_by_admin(db, admin_user_id=admin.id)
    pending_count = count_pending_reviews_by_admin(db, admin_user_id=admin.id)
    return {
        "pending_count": pending_count,
        "items": [_serialize_review(r, admin_user_id=admin.id, db=db) for r in reviews],
    }


def resolve_identity_review_merge(
    db: Session,
    admin_session: str | None,
    review_id: int,
    target_client_id: int,
) -> dict:
    """수검자가 선택한 또는 관리자가 지정한 기존 내담자로 병합 처리."""
    admin = get_current_admin(db, admin_session)
    review = get_identity_review_by_id(db, review_id=review_id, admin_user_id=admin.id)
    if review is None:
        raise HTTPException(status_code=404, detail="검토 항목을 찾을 수 없습니다.")
    if review.review_status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 검토 항목입니다.")

    target = get_admin_client_by_id_and_admin(db, client_id=target_client_id, admin_user_id=admin.id)
    if target is None:
        raise HTTPException(status_code=404, detail="병합 대상 내담자를 찾을 수 없습니다.")

    # submission을 target client로 재링크
    if review.submission_id is not None:
        from app.db.models import AdminCustomTestSubmission, SubmissionScoringResult
        db.query(AdminCustomTestSubmission).filter(
            AdminCustomTestSubmission.id == review.submission_id,
        ).update({"client_id": target_client_id})
        db.query(SubmissionScoringResult).filter(
            SubmissionScoringResult.submission_id == review.submission_id,
        ).update({"client_id": target_client_id})

    # provisional 내담자 삭제
    if review.provisional_client_id and review.provisional_client_id != target_client_id:
        from app.db.models import AdminClient
        delete_logs_by_client(db, admin_user_id=admin.id, client_id=review.provisional_client_id)
        delete_assignments_by_client(db, admin_user_id=admin.id, client_id=review.provisional_client_id)
        db.query(AdminClient).filter(AdminClient.id == review.provisional_client_id).delete()

    update_review_status(db, review, status="merged", reviewed_by=admin.id)
    commit(db)
    return {"message": "기존 내담자로 병합 처리되었습니다.", "target_client_id": target_client_id}


def resolve_identity_review_confirm_new(
    db: Session,
    admin_session: str | None,
    review_id: int,
) -> dict:
    """임시 내담자를 신규 내담자로 확정 처리."""
    admin = get_current_admin(db, admin_session)
    review = get_identity_review_by_id(db, review_id=review_id, admin_user_id=admin.id)
    if review is None:
        raise HTTPException(status_code=404, detail="검토 항목을 찾을 수 없습니다.")
    if review.review_status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 검토 항목입니다.")
    if review.provisional_client_id is None:
        raise HTTPException(status_code=400, detail="신규 확정할 임시 내담자가 없습니다.")

    from app.db.models import AdminClient
    db.query(AdminClient).filter(AdminClient.id == review.provisional_client_id).update(
        {"created_source": "assessment_link_auto"}
    )

    update_review_status(db, review, status="confirmed_new", reviewed_by=admin.id)
    commit(db)
    return {"message": "신규 내담자로 확정 처리되었습니다.", "client_id": review.provisional_client_id}


def resolve_identity_review_reject(
    db: Session,
    admin_session: str | None,
    review_id: int,
) -> dict:
    admin = get_current_admin(db, admin_session)
    review = get_identity_review_by_id(db, review_id=review_id, admin_user_id=admin.id)
    if review is None:
        raise HTTPException(status_code=404, detail="검토 항목을 찾을 수 없습니다.")
    if review.review_status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 검토 항목입니다.")

    update_review_status(db, review, status="rejected", reviewed_by=admin.id)
    commit(db)
    return {"message": "거절 처리되었습니다."}
