from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.clients import AdminAssessmentLogIn, AdminClientIn, UpdateClientAssignmentIn
from app.services.admin.clients import (
    create_admin_assessment_log,
    create_admin_client,
    delete_admin_client,
    get_admin_client_detail,
    list_admin_clients,
    update_admin_client,
    update_admin_client_assignment,
)

router = APIRouter()


@router.get("/api/admin/clients")
def list_clients(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_clients(db, admin_session)


@router.post("/api/admin/clients")
def create_client(
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return create_admin_client(db, admin_session, payload)


@router.get("/api/admin/clients/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_admin_client_detail(db, admin_session, client_id)


@router.put("/api/admin/clients/{client_id}")
def update_client(
    client_id: int,
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_admin_client(db, admin_session, client_id, payload)


@router.put("/api/admin/clients/{client_id}/assignment")
def update_client_assignment(
    client_id: int,
    payload: UpdateClientAssignmentIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_admin_client_assignment(db, admin_session, client_id, payload.admin_custom_test_id)


@router.delete("/api/admin/clients/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return delete_admin_client(db, admin_session, client_id)


@router.post("/api/admin/assessment-logs")
def create_assessment_log(
    payload: AdminAssessmentLogIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return create_admin_assessment_log(
        db,
        admin_session,
        payload.admin_client_id,
        payload.assessed_on,
    )
