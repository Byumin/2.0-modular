from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import AdminClientIdentityReview


def create_identity_review(
    db: Session,
    *,
    admin_user_id: int,
    admin_custom_test_id: int,
    access_token: str,
    input_profile_json: str,
    candidate_client_ids_json: str,
    responder_choice: str,
    chosen_client_id: int | None,
    provisional_client_id: int | None,
) -> AdminClientIdentityReview:
    row = AdminClientIdentityReview(
        admin_user_id=admin_user_id,
        admin_custom_test_id=admin_custom_test_id,
        access_token=access_token,
        input_profile_json=input_profile_json,
        candidate_client_ids_json=candidate_client_ids_json,
        responder_choice=responder_choice,
        chosen_client_id=chosen_client_id,
        provisional_client_id=provisional_client_id,
        review_status="pending",
    )
    db.add(row)
    return row


def link_review_submission(db: Session, review: AdminClientIdentityReview, submission_id: int) -> None:
    review.submission_id = submission_id


def get_identity_review_by_id(
    db: Session,
    *,
    review_id: int,
    admin_user_id: int,
) -> AdminClientIdentityReview | None:
    return (
        db.query(AdminClientIdentityReview)
        .filter(
            AdminClientIdentityReview.id == review_id,
            AdminClientIdentityReview.admin_user_id == admin_user_id,
        )
        .first()
    )


def list_pending_reviews_by_admin(
    db: Session,
    *,
    admin_user_id: int,
    limit: int = 50,
):
    return (
        db.query(AdminClientIdentityReview)
        .filter(
            AdminClientIdentityReview.admin_user_id == admin_user_id,
            AdminClientIdentityReview.review_status == "pending",
        )
        .order_by(AdminClientIdentityReview.created_at.desc())
        .limit(limit)
        .all()
    )


def count_pending_reviews_by_admin(db: Session, *, admin_user_id: int) -> int:
    return (
        db.query(AdminClientIdentityReview)
        .filter(
            AdminClientIdentityReview.admin_user_id == admin_user_id,
            AdminClientIdentityReview.review_status == "pending",
        )
        .count()
    )


def update_review_status(
    db: Session,
    review: AdminClientIdentityReview,
    *,
    status: str,
    reviewed_by: int,
) -> None:
    review.review_status = status
    review.reviewed_by = reviewed_by
    review.reviewed_at = datetime.utcnow()
