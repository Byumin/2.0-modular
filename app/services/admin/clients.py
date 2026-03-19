from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AdminClient
from app.repositories.assessment_repository import create_assessment_log
from app.repositories.base_repository import commit, delete_row, refresh
from app.repositories.client_repository import (
    create_admin_client as create_client_row,
    create_assignment,
    delete_assignments_by_client,
    delete_logs_by_client,
    get_admin_client_by_id_and_admin,
    get_assigned_clients_for_profile,
    get_assignment_by_admin_and_client,
    get_last_assessed_rows,
    list_admin_clients_by_admin,
    list_client_assignments_with_test_name,
)
from app.repositories.custom_test_repository import get_custom_test_by_id_and_admin
from app.schemas.values import normalize_gender_value
from app.services.admin.auth import get_current_admin
from app.services.admin.common import serialize_admin_client


def upsert_client_assignment(
    db: Session,
    admin_id: int,
    client_id: int,
    custom_test_id: int | None,
) -> None:
    current = get_assignment_by_admin_and_client(db, admin_id, client_id)

    if custom_test_id is None:
        if current is not None:
            delete_row(db, current)
        return

    if current is None:
        create_assignment(db, admin_id, client_id, custom_test_id)
        return

    current.admin_custom_test_id = custom_test_id


def find_assigned_client_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> tuple[AdminClient | None, str]:
    assigned_clients = get_assigned_clients_for_profile(
        db,
        admin_user_id=admin_user_id,
        custom_test_id=custom_test_id,
    )
    if not assigned_clients:
        return None, "이 검사에 배정된 내담자가 없습니다. 관리자에게 문의해주세요."

    name = str(profile.get("name", "")).strip()
    if not name:
        return None, "이름을 입력해주세요."

    candidates = [row for row in assigned_clients if row.name.strip() == name]
    if not candidates:
        return None, "배정된 내담자 정보와 일치하지 않습니다. 이름을 확인해주세요."

    gender = str(profile.get("gender", "")).strip()
    if gender:
        candidates = [row for row in candidates if (row.gender or "").strip() == gender]
        if not candidates:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 성별을 확인해주세요."

    birth_day_text = str(profile.get("birth_day", "")).strip()
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError:
            return None, "생년월일 형식이 올바르지 않습니다."
        candidates = [row for row in candidates if row.birth_day == birth_day_value]
        if not candidates:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 생년월일을 확인해주세요."

    if len(candidates) > 1:
        return None, "동일한 이름의 내담자가 여러 명입니다. 성별/생년월일을 함께 입력해주세요."
    return candidates[0], ""


def list_admin_clients(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    rows = list_admin_clients_by_admin(db, admin_user_id=admin.id)
    assignment_rows = list_client_assignments_with_test_name(db, admin_user_id=admin.id)

    assignment_map = {
        row.AdminClientAssignment.admin_client_id: {
            "custom_test_id": row.AdminClientAssignment.admin_custom_test_id,
            "custom_test_name": row.custom_test_name,
        }
        for row in assignment_rows
    }

    log_rows = get_last_assessed_rows(db, admin_user_id=admin.id)
    log_map = {row.client_id: row.last_assessed_on for row in log_rows}
    today_iso = date.today().isoformat()

    items = []
    for row in rows:
        base = serialize_admin_client(row)
        assigned = assignment_map.get(row.id)
        last_assessed_on = log_map.get(row.id)
        status_text = "미실시"
        if last_assessed_on is not None:
            status_text = "완료" if last_assessed_on.isoformat() == today_iso else "진행중"
        base["assigned_custom_test_id"] = assigned["custom_test_id"] if assigned else None
        base["assigned_custom_test_name"] = assigned["custom_test_name"] if assigned else None
        base["last_assessed_on"] = last_assessed_on.isoformat() if last_assessed_on else None
        base["status"] = status_text
        items.append(base)

    return {"items": items}


def create_admin_client(db: Session, admin_session: str | None, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.admin_custom_test_id is not None:
        exists = get_custom_test_by_id_and_admin(
            db,
            custom_test_id=payload.admin_custom_test_id,
            admin_user_id=admin.id,
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    new_item = create_client_row(
        db,
        admin_user_id=admin.id,
        name=payload.name.strip(),
        gender=normalized_gender,
        birth_day=payload.birth_day,
        memo=payload.memo.strip(),
    )

    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=new_item.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    commit(db)

    return {"message": "내담자가 등록되었습니다.", "item": serialize_admin_client(new_item)}


def update_admin_client(db: Session, admin_session: str | None, client_id: int, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    if payload.admin_custom_test_id is not None:
        exists = get_custom_test_by_id_and_admin(
            db,
            custom_test_id=payload.admin_custom_test_id,
            admin_user_id=admin.id,
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row.name = payload.name.strip()
    row.gender = normalized_gender
    row.birth_day = payload.birth_day
    row.memo = payload.memo.strip()

    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=row.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    commit(db)
    refresh(db, row)

    return {"message": "내담자 정보가 수정되었습니다.", "item": serialize_admin_client(row)}


def update_admin_client_assignment(db: Session, admin_session: str | None, client_id: int, custom_test_id: int | None) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    if custom_test_id is not None:
        exists = get_custom_test_by_id_and_admin(
            db,
            custom_test_id=custom_test_id,
            admin_user_id=admin.id,
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    upsert_client_assignment(db=db, admin_id=admin.id, client_id=row.id, custom_test_id=custom_test_id)
    commit(db)
    return {
        "message": "배정 정보가 저장되었습니다.",
        "client_id": row.id,
        "assigned_custom_test_id": custom_test_id,
    }


def delete_admin_client(db: Session, admin_session: str | None, client_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    delete_logs_by_client(db, admin_user_id=admin.id, client_id=row.id)
    delete_assignments_by_client(db, admin_user_id=admin.id, client_id=row.id)
    delete_row(db, row)
    commit(db)
    return {"message": "내담자가 삭제되었습니다."}


def create_admin_assessment_log(db: Session, admin_session: str | None, client_id: int, assessed_on: date | None) -> dict:
    admin = get_current_admin(db, admin_session)
    client_row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if client_row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    effective_date = assessed_on or date.today()
    create_assessment_log(
        db,
        admin_user_id=admin.id,
        client_id=client_row.id,
        assessed_on=effective_date,
    )
    return {"message": "검사 실시 기록이 추가되었습니다."}
