import json
from datetime import date, datetime, timedelta
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
    get_client_assignment_with_test_name,
    get_assigned_clients_for_profile,
    get_assignment_by_admin_and_client,
    get_last_assessed_rows,
    list_admin_clients_by_admin,
    list_client_assignments_with_test_name,
)
from app.repositories.custom_test_repository import get_custom_test_by_id_and_admin
from app.repositories.custom_test_repository import (
    count_submissions_by_client_since,
    get_last_submission_by_client,
    list_submission_scoring_results_by_client,
    list_submissions_by_client_with_test_name,
)
from app.schemas.values import normalize_gender_value
from app.services.admin.auth import get_current_admin
from app.services.admin.common import serialize_admin_client, summarize_custom_test_ids


def _normalize_parent_test_text(raw_value: str | None) -> str | None:
    _, text = summarize_custom_test_ids([], fallback=raw_value)
    return text or None


def _serialize_client_scoring_rows(scoring_rows) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_parent_test_ids: set[str] = set()
    for row in scoring_rows:
        scoring_row = row.SubmissionScoringResult
        try:
            result_payload = json.loads(scoring_row.result_json or "{}")
        except Exception:
            result_payload = {}
        if not isinstance(result_payload, dict):
            continue

        assessed_on = row.submission_created_at.isoformat() if row.submission_created_at else None
        custom_test_name = getattr(row, "custom_test_name", "") or "커스텀 검사"

        for parent_test_id, raw_result in result_payload.items():
            parent_test_id_text = str(parent_test_id)
            if parent_test_id_text in seen_parent_test_ids:
                continue
            if not isinstance(raw_result, dict):
                continue
            seen_parent_test_ids.add(parent_test_id_text)
            raw_scales = raw_result.get("scales", {})
            scale_rows: list[dict[str, Any]] = []
            if isinstance(raw_scales, dict):
                for scale_key, raw_scale in raw_scales.items():
                    if not isinstance(raw_scale, dict):
                        continue
                    score_100 = raw_scale.get("converted_score_100")
                    total_score = raw_scale.get("total_score")
                    max_score = raw_scale.get("max_score")
                    note_parts: list[str] = []
                    if max_score is not None:
                        note_parts.append(f"max {max_score}")
                    facets = raw_scale.get("facets")
                    if isinstance(facets, dict) and facets:
                        note_parts.append(f"facet {len(facets)}개")
                    scale_rows.append(
                        {
                            "scale_key": str(scale_key),
                            "scale_code": str(raw_scale.get("code", "")),
                            "scale_name": str(raw_scale.get("name", "")),
                            "score": score_100,
                            "score_text": (
                                f"{score_100} / 100"
                                if score_100 is not None
                                else (str(total_score) if total_score is not None else "점수 없음")
                            ),
                            "level_text": (
                                f"원점수 {total_score}/{max_score}"
                                if total_score is not None and max_score is not None
                                else "원점수 정보 없음"
                            ),
                            "note": ", ".join(note_parts) if note_parts else "",
                            "parent_test_name": str(parent_test_id),
                        }
                    )

            items.append(
                {
                    "id": f"{scoring_row.id}::{parent_test_id_text}",
                    "custom_test_name": custom_test_name,
                    "test_name": custom_test_name,
                    "parent_test_name": parent_test_id_text,
                    "parent_test_id": parent_test_id_text,
                    "assessed_on": assessed_on,
                    "created_at": scoring_row.created_at.isoformat(),
                    "status": raw_result.get("status", scoring_row.scoring_status),
                    "scales": scale_rows,
                    "meta": raw_result.get("meta", {}),
                }
            )
    return items


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
    assigned_clients = get_assigned_clients_for_profile( # 입력한 인적사항과 배정된 내담자 조회
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
            "parent_test_name": _normalize_parent_test_text(getattr(row, "parent_test_id", None)),
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
        base["assigned_parent_test_name"] = assigned["parent_test_name"] if assigned else None
        base["last_assessed_on"] = last_assessed_on.isoformat() if last_assessed_on else None
        base["status"] = status_text
        items.append(base)

    return {"items": items}


def get_admin_client_detail(db: Session, admin_session: str | None, client_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    assignment_row = get_client_assignment_with_test_name(
        db,
        admin_user_id=admin.id,
        client_id=row.id,
    )
    last_submission_row = get_last_submission_by_client(
        db,
        admin_user_id=admin.id,
        client_id=row.id,
    )
    last_assessed_on = last_submission_row.submitted_at if last_submission_row else None
    submitted_from = datetime.now() - timedelta(days=30)
    monthly_submission_count = count_submissions_by_client_since(
        db,
        admin_user_id=admin.id,
        client_id=row.id,
        submitted_from=submitted_from,
    )
    logs = list_submissions_by_client_with_test_name(
        db,
        admin_user_id=admin.id,
        client_id=row.id,
        limit=30,
    )
    has_assignment = assignment_row is not None
    has_submission = last_assessed_on is not None
    if has_submission:
        status_text = "실시완료"
    elif has_assignment:
        status_text = "미실시"
    else:
        status_text = "배정대기"
    scoring_rows = list_submission_scoring_results_by_client(
        db,
        admin_user_id=admin.id,
        client_id=row.id,
        limit=30,
    )

    base = serialize_admin_client(row)
    base["assigned_custom_test_id"] = assignment_row.AdminClientAssignment.admin_custom_test_id if assignment_row else None
    base["assigned_custom_test_name"] = assignment_row.custom_test_name if assignment_row else None
    base["assigned_parent_test_name"] = _normalize_parent_test_text(getattr(assignment_row, "parent_test_id", None)) if assignment_row else None
    base["last_assessed_on"] = last_assessed_on.date().isoformat() if last_assessed_on else None
    base["status"] = status_text
    base["assessment_log_count"] = monthly_submission_count
    base["assessment_logs"] = [
        {
            "id": log.AdminCustomTestSubmission.id,
            "assessed_on": log.AdminCustomTestSubmission.created_at.date().isoformat(),
            "created_at": log.AdminCustomTestSubmission.created_at.isoformat(),
            "custom_test_name": getattr(log, "custom_test_name", "") or "커스텀 검사",
            "parent_test_name": _normalize_parent_test_text(getattr(log, "parent_test_id", None)),
        }
        for log in logs
    ]
    base["custom_test_results"] = _serialize_client_scoring_rows(scoring_rows)
    return {"item": base}


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
