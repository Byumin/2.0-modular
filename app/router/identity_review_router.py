from fastapi import APIRouter, Cookie, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.admin.identity_reviews import (
    list_identity_reviews,
    resolve_identity_review_confirm_new,
    resolve_identity_review_merge,
    resolve_identity_review_reject,
)

router = APIRouter()


class MergeIdentityReviewIn(BaseModel):
    target_client_id: int


@router.get("/api/admin/identity-reviews")
def get_identity_reviews(
    admin_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    return list_identity_reviews(db, admin_session)


@router.post("/api/admin/identity-reviews/{review_id}/merge")
def merge_identity_review(
    review_id: int,
    body: MergeIdentityReviewIn,
    admin_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    return resolve_identity_review_merge(db, admin_session, review_id, body.target_client_id)


@router.post("/api/admin/identity-reviews/{review_id}/confirm-new")
def confirm_new_identity_review(
    review_id: int,
    admin_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    return resolve_identity_review_confirm_new(db, admin_session, review_id)


@router.post("/api/admin/identity-reviews/{review_id}/reject")
def reject_identity_review(
    review_id: int,
    admin_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    return resolve_identity_review_reject(db, admin_session, review_id)
