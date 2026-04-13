import json
import os
from datetime import date, datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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
    find_admin_client_by_identity,
    get_admin_client_by_id_and_admin,
    get_assigned_clients_for_profile,
    get_assignment_by_admin_client_and_test,
    get_last_assessed_rows,
    list_admin_clients_by_admin,
    list_assignments_by_client_with_test_name,
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

UNASSIGNED_CLIENT_REQUIRED_CODE = "UNASSIGNED_CLIENT_REQUIRED"
AUTO_CREATE_CONFIRM_REQUIRED_CODE = "AUTO_CREATE_CONFIRM_REQUIRED"
AMBIGUOUS_CLIENT_CODE = "AMBIGUOUS_CLIENT"


def _normalize_parent_test_text(raw_value: str | None) -> str | None:
    _, text = summarize_custom_test_ids([], fallback=raw_value)
    return text or None


def _serialize_assignment_summary(assignment_row) -> dict[str, Any]:
    return {
        "id": assignment_row.AdminClientAssignment.admin_custom_test_id,
        "custom_test_name": assignment_row.custom_test_name,
        "parent_test_name": _normalize_parent_test_text(getattr(assignment_row, "parent_test_id", None)),
    }


def _build_assignment_map(assignment_rows) -> dict[int, list[dict[str, Any]]]:
    assignment_map: dict[int, list[dict[str, Any]]] = {}
    for row in assignment_rows:
        client_id = row.AdminClientAssignment.admin_client_id
        assignment_map.setdefault(client_id, []).append(_serialize_assignment_summary(row))
    return assignment_map


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


def _build_report_scale_hierarchy(raw_result: dict[str, Any]) -> list[dict[str, Any]]:
    raw_scales = raw_result.get("scales", {})
    if not isinstance(raw_scales, dict):
        return []

    items: list[dict[str, Any]] = []
    for raw_scale in raw_scales.values():
        if not isinstance(raw_scale, dict):
            continue
        scale_item: dict[str, Any] = {
            "code": str(raw_scale.get("code", "")).strip(),
            "name": str(raw_scale.get("name", "")).strip(),
            "score": raw_scale.get("converted_score_100"),
            "children": [],
        }
        raw_facets = raw_scale.get("facets")
        if isinstance(raw_facets, dict):
            for raw_facet in raw_facets.values():
                if not isinstance(raw_facet, dict):
                    continue
                scale_item["children"].append(
                    {
                        "code": str(raw_facet.get("code", "")).strip(),
                        "name": str(raw_facet.get("name", "")).strip(),
                        "score": raw_facet.get("converted_score_100"),
                    }
                )
        items.append(scale_item)
    return items


def get_admin_client_report_llm_context(
    db: Session,
    admin_session: str | None,
    client_id: int,
    report: str,
) -> dict:
    admin = get_current_admin(db, admin_session)
    client_row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if client_row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    report_name = str(report or "").strip().upper()
    supported_reports = {"GOLDEN", "STS"}
    if report_name not in supported_reports:
        raise HTTPException(status_code=400, detail="현재는 GOLDEN, STS 리포트만 지원합니다.")

    scoring_rows = list_submission_scoring_results_by_client(
        db,
        admin_user_id=admin.id,
        client_id=client_row.id,
        limit=30,
    )
    for row in scoring_rows:
        scoring_row = row.SubmissionScoringResult
        try:
            result_payload = json.loads(scoring_row.result_json or "{}")
        except Exception:
            continue
        if not isinstance(result_payload, dict):
            continue
        raw_result = result_payload.get(report_name)
        if not isinstance(raw_result, dict):
            continue
        return {
            "client": {
                "id": client_row.id,
                "name": client_row.name,
                "gender": client_row.gender,
                "birth_day": client_row.birth_day.isoformat() if client_row.birth_day else None,
            },
            "report": report_name,
            "custom_test_name": getattr(row, "custom_test_name", "") or "커스텀 검사",
            "submission_id": scoring_row.submission_id,
            "scoring_result_id": scoring_row.id,
            "scored_at": scoring_row.created_at.isoformat(),
            "hierarchy": _build_report_scale_hierarchy(raw_result),
        }

    raise HTTPException(status_code=404, detail="해당 리포트의 채점 결과를 찾을 수 없습니다.")


def proxy_report_llm_chat(
    db: Session,
    admin_session: str | None,
    *,
    client_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    admin = get_current_admin(db, admin_session)
    client_row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if client_row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    chat_url = os.getenv("LLM_CHAT_URL", "http://127.0.0.1:9000/chat").strip() or "http://127.0.0.1:9000/chat"
    request_body = json.dumps(payload).encode("utf-8")
    request = Request(
        chat_url,
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = max(1, min(int(payload.get("timeout", 120) or 120), 300))
    try:
        with urlopen(request, timeout=timeout) as response:
            response_text = response.read().decode("utf-8")
            return json.loads(response_text or "{}")
    except HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode("utf-8") or "{}")
        except Exception:
            error_payload = {}
        detail = error_payload.get("detail") or error_payload.get("error") or f"LLM 서버 호출 실패 ({exc.code})"
        raise HTTPException(status_code=502, detail=str(detail)) from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail="LLM 서버에 연결하지 못했습니다.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="LLM 응답 처리에 실패했습니다.") from exc


def assign_client_to_test(
    db: Session,
    admin_id: int,
    client_id: int,
    custom_test_id: int,
) -> bool:
    current = get_assignment_by_admin_client_and_test(db, admin_id, client_id, custom_test_id)
    if current is not None:
        return False
    create_assignment(db, admin_id, client_id, custom_test_id)
    return True


def unassign_client_from_test(
    db: Session,
    admin_id: int,
    client_id: int,
    custom_test_id: int,
) -> bool:
    current = get_assignment_by_admin_client_and_test(db, admin_id, client_id, custom_test_id)
    if current is None:
        return False
    delete_row(db, current)
    return True


def find_assigned_client_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> tuple[AdminClient | None, str]:
    client, message, _, _ = find_assigned_client_for_profile_with_code(
        db,
        admin_user_id=admin_user_id,
        custom_test_id=custom_test_id,
        profile=profile,
    )
    return client, message


def find_assigned_client_for_profile_with_code(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> tuple[AdminClient | None, str, str | None, list[AdminClient]]:
    """(client, message, code, candidates) 반환.
    - 단일 매칭: (client, "", None, [])
    - 동명이인 등 모호: (None, message, AMBIGUOUS_CLIENT_CODE, [후보목록])
    - 배정 없음: (None, message, UNASSIGNED_CLIENT_REQUIRED_CODE, [])
    - 기타 오류: (None, message, None, [])
    """
    assigned_clients = get_assigned_clients_for_profile(
        db,
        admin_user_id=admin_user_id,
        custom_test_id=custom_test_id,
    )
    if not assigned_clients:
        return None, "이 검사에 배정된 내담자가 없습니다. 계속하면 내담자로 등록되고 이 검사에 배정됩니다.", UNASSIGNED_CLIENT_REQUIRED_CODE, []

    name = str(profile.get("name", "")).strip()
    if not name:
        return None, "이름을 입력해주세요.", None, []

    candidates = [row for row in assigned_clients if row.name.strip() == name]
    if not candidates:
        return None, "배정된 내담자 정보와 일치하지 않습니다. 이름을 확인해주세요.", None, []

    gender = str(profile.get("gender", "")).strip()
    if gender:
        gender_filtered = [row for row in candidates if (row.gender or "").strip() == gender]
        if not gender_filtered:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 성별을 확인해주세요.", None, []
        candidates = gender_filtered

    birth_day_text = str(profile.get("birth_day", "")).strip()
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError:
            return None, "생년월일 형식이 올바르지 않습니다.", None, []
        birth_filtered = [row for row in candidates if row.birth_day == birth_day_value]
        if not birth_filtered:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 생년월일을 확인해주세요.", None, []
        candidates = birth_filtered

    if len(candidates) == 1:
        return candidates[0], "", None, []

    return None, "동일한 인적사항의 내담자가 여러 명입니다. 본인을 선택해주세요.", AMBIGUOUS_CLIENT_CODE, candidates


def register_client_and_assign_for_public_assessment(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
    created_source: str = "assessment_link_auto",
) -> tuple[AdminClient, bool]:
    name = str(profile.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")

    raw_gender = str(profile.get("gender", "")).strip()
    try:
        normalized_gender = normalize_gender_value(raw_gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="성별을 확인해주세요.") from exc

    birth_day_text = str(profile.get("birth_day", "")).strip()
    birth_day_value = None
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="생년월일 형식이 올바르지 않습니다.") from exc

    existing = find_admin_client_by_identity(
        db,
        admin_user_id=admin_user_id,
        name=name,
        gender=normalized_gender,
        birth_day=birth_day_value,
    )
    if existing is not None:
        assign_client_to_test(
            db=db,
            admin_id=admin_user_id,
            client_id=existing.id,
            custom_test_id=custom_test_id,
        )
        commit(db)
        refresh(db, existing)
        return existing, False

    new_item = create_client_row(
        db,
        admin_user_id=admin_user_id,
        name=name,
        gender=normalized_gender,
        birth_day=birth_day_value,
        memo="검사 링크에서 자동 등록",
        created_source=created_source,
    )
    db.flush()
    assign_client_to_test(
        db=db,
        admin_id=admin_user_id,
        client_id=new_item.id,
        custom_test_id=custom_test_id,
    )
    commit(db)
    refresh(db, new_item)
    return new_item, True


def create_provisional_client_and_assign_for_public_assessment(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> AdminClient:
    name = str(profile.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")

    raw_gender = str(profile.get("gender", "")).strip()
    try:
        normalized_gender = normalize_gender_value(raw_gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="성별을 확인해주세요.") from exc

    birth_day_text = str(profile.get("birth_day", "")).strip()
    birth_day_value = None
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="생년월일 형식이 올바르지 않습니다.") from exc

    new_item = create_client_row(
        db,
        admin_user_id=admin_user_id,
        name=name,
        gender=normalized_gender,
        birth_day=birth_day_value,
        memo="검사 링크에서 신규 내담자로 선택",
        created_source="assessment_link_provisional",
    )
    db.flush()
    assign_client_to_test(
        db=db,
        admin_id=admin_user_id,
        client_id=new_item.id,
        custom_test_id=custom_test_id,
    )
    commit(db)
    refresh(db, new_item)
    return new_item


def list_admin_clients(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    rows = list_admin_clients_by_admin(db, admin_user_id=admin.id)
    assignment_rows = list_client_assignments_with_test_name(db, admin_user_id=admin.id)

    assignment_map = _build_assignment_map(assignment_rows)

    log_rows = get_last_assessed_rows(db, admin_user_id=admin.id)
    log_map = {row.client_id: row.last_assessed_on for row in log_rows}

    items = []
    for row in rows:
        base = serialize_admin_client(row)
        assigned_tests = assignment_map.get(row.id, [])
        last_assessed_on = log_map.get(row.id)
        if last_assessed_on is not None:
            status_text = "실시완료"
        elif assigned_tests:
            status_text = "미실시"
        else:
            status_text = "배정대기"
        base["assigned_custom_tests"] = assigned_tests
        base["assigned_custom_test_count"] = len(assigned_tests)
        base["last_assessed_on"] = last_assessed_on.isoformat() if last_assessed_on else None
        base["status"] = status_text
        items.append(base)

    return {"items": items}


def get_admin_client_detail(db: Session, admin_session: str | None, client_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    assignment_rows = list_assignments_by_client_with_test_name(
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
    assigned_tests = [_serialize_assignment_summary(item) for item in assignment_rows]
    has_assignment = bool(assigned_tests)
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
    base["assigned_custom_tests"] = assigned_tests
    base["assigned_custom_test_count"] = len(assigned_tests)
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

    new_item = create_client_row(
        db,
        admin_user_id=admin.id,
        name=payload.name.strip(),
        gender=normalized_gender,
        birth_day=payload.birth_day,
        memo=payload.memo.strip(),
        created_source="admin_manual",
    )
    commit(db)

    return {"message": "내담자가 등록되었습니다.", "item": serialize_admin_client(new_item)}


def update_admin_client(db: Session, admin_session: str | None, client_id: int, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row.name = payload.name.strip()
    row.gender = normalized_gender
    row.birth_day = payload.birth_day
    row.memo = payload.memo.strip()
    commit(db)
    refresh(db, row)

    return {"message": "내담자 정보가 수정되었습니다.", "item": serialize_admin_client(row)}


def add_admin_client_assignment(db: Session, admin_session: str | None, client_id: int, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    exists = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if exists is None:
        raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    created = assign_client_to_test(db=db, admin_id=admin.id, client_id=row.id, custom_test_id=custom_test_id)
    commit(db)
    return {
        "message": "검사가 배정되었습니다." if created else "이미 배정된 검사입니다.",
        "created": created,
        "client_id": row.id,
        "admin_custom_test_id": custom_test_id,
    }


def remove_admin_client_assignment(db: Session, admin_session: str | None, client_id: int, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    exists = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if exists is None:
        raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    removed = unassign_client_from_test(db=db, admin_id=admin.id, client_id=row.id, custom_test_id=custom_test_id)
    commit(db)
    return {
        "message": "검사 배정이 해제되었습니다." if removed else "이미 해제된 상태입니다.",
        "deleted": removed,
        "client_id": row.id,
        "admin_custom_test_id": custom_test_id,
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
