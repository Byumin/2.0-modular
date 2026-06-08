from datetime import date

from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.custom_tests import (
    BulkDeleteCustomTestsIn,
    CreateCustomTestBatchIn,
    UpdateCustomTestSettingsIn,
)
from pydantic import BaseModel

from app.services.admin.assessment_links import (
    add_pre_registered_client_for_link,
    bulk_add_pre_registered_clients_for_link,
    generate_custom_test_access_link,
    list_pre_registered_clients_for_link,
    remove_pre_registered_client_for_link,
    update_link_match_field_keys,
    update_link_response_options,
)


class PreRegisteredClientIn(BaseModel):
    profile_data: dict


class PreRegisteredClientBulkIn(BaseModel):
    rows: list[dict]


class MatchFieldKeysIn(BaseModel):
    match_field_keys: list[str]


class AccessLinkResponseOptionsIn(BaseModel):
    allow_unanswered_submission: bool = False
from app.services.admin.custom_tests import (
    bulk_delete_admin_custom_tests,
    create_admin_custom_test_batch,
    get_admin_custom_test,
    get_admin_test_catalog,
    list_admin_custom_test_results,
    list_admin_custom_tests,
    list_admin_custom_tests_for_management,
    update_admin_custom_test,
    delete_admin_custom_test,
)

router = APIRouter()


@router.get("/api/admin/tests/catalog")
def test_catalog(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_admin_test_catalog(db, admin_session)


@router.get("/api/admin/custom-tests")
def list_custom_tests(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_custom_tests(db, admin_session)


@router.get("/api/admin/custom-tests/management")
def list_custom_tests_for_management(
    q: str | None = None,
    status: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_custom_tests_for_management(
        db,
        admin_session,
        q,
        status,
        created_from,
        created_to,
    )


@router.get("/api/admin/custom-tests/results")
def list_custom_test_results(
    q: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_admin_custom_test_results(db, admin_session, q=q, limit=limit)

# 커스텀 검사 생성 라우터
@router.post("/api/admin/custom-tests")
def create_custom_test(
    payload: CreateCustomTestBatchIn, # 스키마
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return create_admin_custom_test_batch(db, admin_session, payload)

# 이미 만들어진 커스텀 검사 조회 라우터
@router.get("/api/admin/custom-tests/{custom_test_id}")
def get_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_admin_custom_test(db, admin_session, custom_test_id)


@router.post("/api/admin/custom-tests/{custom_test_id}/access-link")
def create_access_link(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return generate_custom_test_access_link(db, admin_session, custom_test_id)


@router.put("/api/admin/custom-tests/{custom_test_id}")
def update_custom_test(
    custom_test_id: int,
    payload: UpdateCustomTestSettingsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_admin_custom_test(db, admin_session, custom_test_id, payload)


@router.delete("/api/admin/custom-tests/{custom_test_id}")
def delete_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return delete_admin_custom_test(db, admin_session, custom_test_id)


@router.post("/api/admin/custom-tests/bulk-delete")
def bulk_delete_custom_tests(
    payload: BulkDeleteCustomTestsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return bulk_delete_admin_custom_tests(db, admin_session, payload.custom_test_ids)


# ── 실시 링크 사전 등록 내담자 관리 ────────────────────────────────────────────

@router.get("/api/admin/access-links/{access_token}/pre-registered")
def get_pre_registered_clients(
    access_token: str,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return list_pre_registered_clients_for_link(db, admin_session, access_token)


@router.post("/api/admin/access-links/{access_token}/pre-registered")
def post_pre_registered_client(
    access_token: str,
    payload: PreRegisteredClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return add_pre_registered_client_for_link(db, admin_session, access_token, payload.profile_data)


@router.delete("/api/admin/access-links/{access_token}/pre-registered/{entry_id}")
def delete_pre_registered_client(
    access_token: str,
    entry_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return remove_pre_registered_client_for_link(db, admin_session, access_token, entry_id)


@router.put("/api/admin/access-links/{access_token}/match-field-keys")
def put_match_field_keys(
    access_token: str,
    payload: MatchFieldKeysIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_link_match_field_keys(db, admin_session, access_token, payload.match_field_keys)


@router.put("/api/admin/access-links/{access_token}/response-options")
def put_access_link_response_options(
    access_token: str,
    payload: AccessLinkResponseOptionsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_link_response_options(
        db,
        admin_session,
        access_token,
        allow_unanswered_submission=payload.allow_unanswered_submission,
    )


@router.post("/api/admin/access-links/{access_token}/pre-registered/bulk")
def post_pre_registered_bulk(
    access_token: str,
    payload: PreRegisteredClientBulkIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return bulk_add_pre_registered_clients_for_link(db, admin_session, access_token, payload.rows)
