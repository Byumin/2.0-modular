from datetime import date

from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.custom_tests import (
    BulkDeleteCustomTestsIn,
    CreateCustomTestBatchIn,
    UpdateCustomTestSettingsIn,
)
from app.services.admin.assessment_links import generate_custom_test_access_link
from app.services.admin.custom_tests import (
    bulk_delete_admin_custom_tests,
    create_admin_custom_test_batch,
    get_admin_custom_test,
    get_admin_test_catalog,
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
