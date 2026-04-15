from fastapi import APIRouter, Cookie, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.clients import (
    AdminAssessmentLogIn,
    AdminClientIn,
    ClientGroupIn,
    ClientGroupMemberIn,
    ClientReportIn,
    CreateClientAssignmentIn,
    ReportLlmChatIn,
)
from app.services.admin.clients import (
    add_admin_client_assignment,
    add_client_group_member,
    create_admin_assessment_log,
    create_admin_client,
    create_client_group,
    delete_admin_client,
    delete_client_group,
    get_admin_client_detail,
    get_admin_client_report_llm_context,
    get_client_report,
    list_admin_clients,
    list_admin_client_test_overview,
    list_client_groups,
    proxy_report_llm_chat,
    remove_admin_client_assignment,
    remove_client_group_member,
    save_client_report,
    update_admin_client,
)

router = APIRouter()


@router.get("/api/admin/clients")
def list_clients(
    group_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_clients(
        db,
        admin_session,
        group_id=group_id,
        q=q,
        gender=gender,
        status=status,
    )


@router.get("/api/admin/client-test-overview")
def list_client_test_overview(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_client_test_overview(db, admin_session, q=q, status=status)


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


# ── 그룹 엔드포인트 ───────────────────────────────────────────────────────────

@router.get("/api/admin/client-groups")
def list_groups(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_client_groups(db, admin_session)


@router.post("/api/admin/client-groups")
def create_group(
    payload: ClientGroupIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return create_client_group(db, admin_session, payload.name, payload.color)


@router.delete("/api/admin/client-groups/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return delete_client_group(db, admin_session, group_id)


@router.post("/api/admin/clients/{client_id}/groups")
def add_to_group(
    client_id: int,
    payload: ClientGroupMemberIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return add_client_group_member(db, admin_session, client_id, payload.group_id)


@router.delete("/api/admin/clients/{client_id}/groups/{group_id}")
def remove_from_group(
    client_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return remove_client_group_member(db, admin_session, client_id, group_id)


# ── 보고서 엔드포인트 ─────────────────────────────────────────────────────────

@router.get("/api/admin/clients/{client_id}/report")
def get_report(
    client_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_client_report(db, admin_session, client_id)


@router.put("/api/admin/clients/{client_id}/report")
def save_report(
    client_id: int,
    payload: ClientReportIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return save_client_report(db, admin_session, client_id, [s.model_dump() for s in payload.sections])
