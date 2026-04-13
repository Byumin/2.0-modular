from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.clients import (
    AdminAssessmentLogIn,
    AdminClientIn,
    CreateClientAssignmentIn,
    ReportLlmChatIn,
)
from app.services.admin.clients import (
    add_admin_client_assignment,
    create_admin_assessment_log,
    create_admin_client,
    delete_admin_client,
    get_admin_client_detail,
    get_admin_client_report_llm_context,
    list_admin_clients,
    proxy_report_llm_chat,
    remove_admin_client_assignment,
    update_admin_client,
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


@router.get("/api/admin/clients/{client_id}/report-llm-context")
def get_client_report_llm_context(
    client_id: int,
    report: str,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_admin_client_report_llm_context(db, admin_session, client_id, report)


@router.post("/api/admin/clients/{client_id}/report-llm-chat")
def post_client_report_llm_chat(
    client_id: int,
    payload: ReportLlmChatIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return proxy_report_llm_chat(
        db,
        admin_session,
        client_id=client_id,
        payload=payload.model_dump(),
    )


@router.put("/api/admin/clients/{client_id}")
def update_client(
    client_id: int,
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_admin_client(db, admin_session, client_id, payload)


@router.post("/api/admin/clients/{client_id}/assignments")
def create_client_assignment(
    client_id: int,
    payload: CreateClientAssignmentIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return add_admin_client_assignment(db, admin_session, client_id, payload.admin_custom_test_id)


@router.delete("/api/admin/clients/{client_id}/assignments/{custom_test_id}")
def delete_client_assignment(
    client_id: int,
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return remove_admin_client_assignment(db, admin_session, client_id, custom_test_id)


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
