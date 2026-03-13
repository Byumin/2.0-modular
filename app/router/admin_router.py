from datetime import date
from pathlib import Path

from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.admin import (
    AdminAssessmentLogIn,
    AdminClientIn,
    AdminLoginIn,
    BulkDeleteCustomTestsIn,
    CreateCustomTestWithFieldsIn,
    SubmitCustomAssessmentIn,
    UpdateClientAssignmentIn,
    UpdateCustomTestIn,
    ValidateAssessmentProfileIn,
)
from app.services import admin_service

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"

router = APIRouter()


@router.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@router.get("/assessment/custom/{access_token}")
def custom_assessment_page(access_token: str) -> FileResponse:
    return FileResponse(STATIC_DIR / "assessment-custom.html")


@router.get("/admin")
def admin_login_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-login.html")


@router.get("/admin/workspace")
def admin_workspace_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-workspace.html")


@router.get("/admin/clients")
def admin_clients_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-clients.html")


@router.get("/admin/create")
def admin_create_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-create.html")


@router.get("/admin/test-detail")
def admin_test_detail_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-test-detail.html")


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "router+service", "ui": "enabled", "db": "sqlite"}


@router.post("/api/admin/login")
def admin_login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> JSONResponse:
    result = admin_service.admin_login(db, payload.admin_id, payload.admin_pw)
    response = JSONResponse({"message": result["message"], "next_url": result["next_url"]})
    response.set_cookie(
        key="admin_session",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 8,
    )
    return response


@router.post("/api/admin/logout")
def admin_logout(admin_session: str | None = Cookie(default=None)) -> Response:
    result = admin_service.admin_logout(admin_session)
    response = JSONResponse(result)
    response.delete_cookie("admin_session")
    return response


@router.get("/api/admin/me")
def admin_me(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    admin = admin_service.get_current_admin(db, admin_session)
    return {"id": admin.id, "username": admin.username}


@router.get("/api/admin/tests/catalog")
def admin_test_catalog(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.get_admin_test_catalog(db, admin_session)


@router.get("/api/admin/custom-tests")
def list_admin_custom_tests(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.list_admin_custom_tests(db, admin_session)


@router.get("/api/admin/custom-tests/management")
def list_admin_custom_tests_for_management(
    q: str | None = None,
    status: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.list_admin_custom_tests_for_management(
        db,
        admin_session,
        q,
        status,
        created_from,
        created_to,
    )


@router.post("/api/admin/custom-tests")
def create_admin_custom_test(
    payload: CreateCustomTestWithFieldsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.create_admin_custom_test(db, admin_session, payload)


@router.get("/api/admin/custom-tests/{custom_test_id}")
def get_admin_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.get_admin_custom_test(db, admin_session, custom_test_id)


@router.post("/api/admin/custom-tests/{custom_test_id}/access-link")
def generate_custom_test_access_link(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.generate_custom_test_access_link(db, admin_session, custom_test_id)


@router.get("/api/assessment-links/{access_token}")
def get_custom_test_by_access_link(
    access_token: str,
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.get_custom_test_by_access_link(db, access_token)


@router.post("/api/assessment-links/{access_token}/validate-profile")
def validate_custom_test_profile_by_access_link(
    access_token: str,
    payload: ValidateAssessmentProfileIn,
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.validate_custom_test_profile_by_access_link(db, access_token, payload.profile or {})


@router.post("/api/assessment-links/{access_token}/submit")
def submit_custom_test_by_access_link(
    access_token: str,
    payload: SubmitCustomAssessmentIn,
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.submit_custom_test_by_access_link(
        db,
        access_token,
        payload.responder_name,
        payload.profile,
        payload.answers,
    )


@router.put("/api/admin/custom-tests/{custom_test_id}")
def update_admin_custom_test(
    custom_test_id: int,
    payload: UpdateCustomTestIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.update_admin_custom_test(db, admin_session, custom_test_id, payload)


@router.delete("/api/admin/custom-tests/{custom_test_id}")
def delete_admin_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.delete_admin_custom_test(db, admin_session, custom_test_id)


@router.post("/api/admin/custom-tests/bulk-delete")
def bulk_delete_admin_custom_tests(
    payload: BulkDeleteCustomTestsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.bulk_delete_admin_custom_tests(db, admin_session, payload.custom_test_ids)


@router.get("/api/admin/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.admin_dashboard(db, admin_session)


@router.get("/api/admin/clients")
def list_admin_clients(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.list_admin_clients(db, admin_session)


@router.post("/api/admin/clients")
def create_admin_client(
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.create_admin_client(db, admin_session, payload)


@router.put("/api/admin/clients/{client_id}")
def update_admin_client(
    client_id: int,
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.update_admin_client(db, admin_session, client_id, payload)


@router.put("/api/admin/clients/{client_id}/assignment")
def update_admin_client_assignment(
    client_id: int,
    payload: UpdateClientAssignmentIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.update_admin_client_assignment(db, admin_session, client_id, payload.admin_custom_test_id)


@router.delete("/api/admin/clients/{client_id}")
def delete_admin_client(
    client_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.delete_admin_client(db, admin_session, client_id)


@router.post("/api/admin/assessment-logs")
def create_admin_assessment_log(
    payload: AdminAssessmentLogIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.create_admin_assessment_log(
        db,
        admin_session,
        payload.admin_client_id,
        payload.assessed_on,
    )


@router.get("/api/admin/assessment-stats")
def admin_assessment_stats(
    days: int = 14,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return admin_service.admin_assessment_stats(db, admin_session, days)
