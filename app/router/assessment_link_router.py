from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.assessment_links import (
    RegisterAssessmentClientIn,
    SubmitCustomAssessmentIn,
    ValidateAssessmentProfileIn,
)
from app.services.admin.assessment_links import (
    get_custom_test_by_access_link,
    register_client_for_custom_test_by_access_link,
    submit_custom_test_by_access_link,
    validate_custom_test_profile_by_access_link,
)

router = APIRouter()

# URL 인적사항 화면 렌더용 라우터
@router.get("/api/assessment-links/{access_token}")
def get_assessment_link_payload(
    access_token: str,
    db: Session = Depends(get_db),
) -> dict:
    return get_custom_test_by_access_link(db, access_token)


@router.post("/api/assessment-links/{access_token}/validate-profile")
def validate_profile(
    access_token: str,
    payload: ValidateAssessmentProfileIn,
    db: Session = Depends(get_db),
) -> dict:
    return validate_custom_test_profile_by_access_link(db, access_token, payload.profile or {})


@router.post("/api/assessment-links/{access_token}/register-client")
def register_client(
    access_token: str,
    payload: RegisterAssessmentClientIn,
    db: Session = Depends(get_db),
) -> dict:
    return register_client_for_custom_test_by_access_link(db, access_token, payload.profile or {})


@router.post("/api/assessment-links/{access_token}/submit")
def submit_assessment(
    access_token: str,
    payload: SubmitCustomAssessmentIn,
    db: Session = Depends(get_db),
) -> dict:
    return submit_custom_test_by_access_link(
        db,
        access_token,
        payload.responder_name,
        payload.profile,
        payload.answers,
    )
