import json
import secrets
from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AdminCustomTest
from app.repositories.custom_test_repository import (
    create_access_link,
    create_submission,
    get_active_access_link_by_admin_and_test,
    get_active_access_link_by_token,
    get_custom_test_by_id_and_admin,
)
from app.repositories.parent_test_repository import fetch_parent_item_bundle
from app.services.admin.auth import get_current_admin
from app.services.admin.clients import find_assigned_client_for_profile
from app.services.admin.common import (
    _derive_required_profile_fields,
    _normalize_item_map,
    _parse_response_options,
    extract_sub_test_variant_configs,
    extract_sub_test_variants,
    normalize_additional_profile_fields,
)


def _safe_parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _age_detail(birth_day: date, as_of: date) -> tuple[int, int, int]:
    years = as_of.year - birth_day.year
    months = as_of.month - birth_day.month
    days = as_of.day - birth_day.day
    if days < 0:
        months -= 1
        days += 31
    if months < 0:
        years -= 1
        months += 12
    return max(years, 0), max(months, 0), max(days, 0)


def _to_age_tuple(raw: Any, default: tuple[int, int, int]) -> tuple[int, int, int]:
    if not isinstance(raw, list):
        return default
    parts = [0, 0, 0]
    for idx in range(3):
        try:
            parts[idx] = int(raw[idx]) if idx < len(raw) else 0
        except (TypeError, ValueError):
            parts[idx] = 0
    return parts[0], parts[1], parts[2]


def _profile_matches_sub_test(profile: dict[str, Any], sub_test_json: str) -> bool:
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        return False
    if not isinstance(parsed, dict):
        return False

    profile_gender = str(profile.get("gender", "")).strip().lower()
    genders = parsed.get("gender")
    if isinstance(genders, list) and genders:
        allowed = {str(x).strip().lower() for x in genders if str(x).strip()}
        if profile_gender and profile_gender not in allowed:
            return False

    birth_day = _safe_parse_date(profile.get("birth_day"))
    age_range = parsed.get("age_range")
    if isinstance(age_range, dict) and birth_day is not None:
        age_now = _age_detail(birth_day, date.today())
        start = _to_age_tuple(age_range.get("start_inclusive"), (0, 0, 0))
        end = _to_age_tuple(age_range.get("end_exclusive"), (999, 0, 0))
        if age_now < start:
            return False
        if age_now >= end:
            return False

    school_raw = (
        parsed.get("school_ages")
        or parsed.get("school_age")
        or parsed.get("school_grades")
        or parsed.get("school_grade")
        or parsed.get("grades")
        or parsed.get("grade")
    )
    profile_school_age = str(profile.get("school_age", "")).strip()
    if profile_school_age:
        if isinstance(school_raw, list) and school_raw:
            allowed_school = {str(x).strip() for x in school_raw if str(x).strip()}
            if profile_school_age not in allowed_school:
                return False
        elif isinstance(school_raw, str) and school_raw.strip():
            if profile_school_age != school_raw.strip():
                return False

    return True


def _resolve_sub_test_variants(custom_test_row: AdminCustomTest) -> list[str]:
    raw_payload = json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
    variant_configs = extract_sub_test_variant_configs(raw_payload)
    if variant_configs:
        return [item["sub_test_json"] for item in variant_configs]
    variants = extract_sub_test_variants(raw_payload)
    return variants or [custom_test_row.sub_test_json]


def _resolve_sub_test_variant_configs(custom_test_row: AdminCustomTest) -> list[dict]:
    raw_payload = json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
    variant_configs = extract_sub_test_variant_configs(raw_payload)
    if variant_configs:
        return variant_configs
    return [
        {
            "sub_test_json": custom_test_row.sub_test_json,
            "available_scale_codes": [],
            "selected_scale_codes": [str(x) for x in json.loads(custom_test_row.selected_scales_json)],
        }
    ]


def _select_sub_test_json_for_profile(custom_test_row: AdminCustomTest, profile: dict[str, Any]) -> str:
    variants = [item["sub_test_json"] for item in _resolve_sub_test_variant_configs(custom_test_row)]
    matches = [sub_test_json for sub_test_json in variants if _profile_matches_sub_test(profile, sub_test_json)]
    if not matches:
        raise HTTPException(status_code=400, detail="입력한 인적정보와 일치하는 검사 구간이 없습니다.")

    def age_start_from_json(raw_sub_test_json: str) -> int:
        try:
            parsed = json.loads(raw_sub_test_json or "{}")
            age_range = parsed.get("age_range", {})
            start = age_range.get("start_inclusive")
            if isinstance(start, list) and start and isinstance(start[0], int):
                return start[0]
        except json.JSONDecodeError:
            pass
        return 9999

    matches.sort(key=lambda value: (age_start_from_json(value), value))
    return matches[0]


def _required_profile_fields_for_variants(custom_test_row: AdminCustomTest) -> list[str]:
    required: list[str] = []
    for sub_test_json in [item["sub_test_json"] for item in _resolve_sub_test_variant_configs(custom_test_row)]:
        for key in _derive_required_profile_fields(sub_test_json):
            if key not in required:
                required.append(key)
    return required


def build_custom_assessment_payload(custom_test_row: AdminCustomTest, profile: dict[str, Any] | None = None) -> dict:
    variant_configs = _resolve_sub_test_variant_configs(custom_test_row)
    selected_sub_test_json = (
        _select_sub_test_json_for_profile(custom_test_row, profile or {})
        if profile
        else custom_test_row.sub_test_json
    )
    active_variant = next(
        (item for item in variant_configs if item["sub_test_json"] == selected_sub_test_json),
        None,
    )
    row = fetch_parent_item_bundle(custom_test_row.test_id, selected_sub_test_json)
    if row is None:
        raise HTTPException(status_code=404, detail="검사 원본 데이터를 찾을 수 없습니다.")

    item_json = json.loads(row.item_json)
    item_meta = json.loads(row.item_meta_json)
    scale_struct = json.loads(row.scale_struct)
    item_map = _normalize_item_map(item_json)
    selected_codes = (
        {str(x) for x in active_variant.get("selected_scale_codes", [])}
        if active_variant is not None
        else {str(x) for x in json.loads(custom_test_row.selected_scales_json)}
    )

    selected_scales = []
    selected_item_ids: set[str] = set()
    for code, value in scale_struct.items():
        if str(code) not in selected_codes:
            continue
        item_ids = sorted(
            [str(item_id) for item_id in value.get("choice_score", {}).keys()],
            key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
        )
        selected_item_ids.update(item_ids)
        selected_scales.append(
            {
                "code": str(code),
                "name": str(value.get("name", code)),
                "item_ids": item_ids,
            }
        )

    sorted_item_ids = sorted(selected_item_ids, key=lambda x: (0, int(x)) if x.isdigit() else (1, x))
    items = [
        {"id": item_id, "text": item_map.get(item_id, "")}
        for item_id in sorted_item_ids
        if item_map.get(item_id)
    ]

    response_options = _parse_response_options(row.item_template)
    raw_additional_payload = json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
    additional_profile_fields = normalize_additional_profile_fields(raw_additional_payload)

    return {
        "custom_test_id": custom_test_row.id,
        "custom_test_name": custom_test_row.custom_test_name,
        "test_id": custom_test_row.test_id,
        "sub_test_json": selected_sub_test_json,
        "display_name": item_meta.get("name", custom_test_row.custom_test_name),
        "required_profile_fields": _required_profile_fields_for_variants(custom_test_row),
        "additional_profile_fields": additional_profile_fields,
        "selected_scale_codes": sorted(selected_codes),
        "selected_scales": selected_scales,
        "items": items,
        "item_count": len(items),
        "response_options": response_options,
        "sub_test_variant_count": len(variant_configs),
    }


def generate_custom_test_access_link(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    custom_test = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    link = get_active_access_link_by_admin_and_test(
        db,
        admin_user_id=admin.id,
        custom_test_id=custom_test.id,
    )
    if link is None:
        link = create_access_link(
            db,
            admin_user_id=admin.id,
            custom_test_id=custom_test.id,
            access_token=secrets.token_urlsafe(24),
        )

    return {
        "custom_test_id": custom_test.id,
        "custom_test_name": custom_test.custom_test_name,
        "access_token": link.access_token,
        "assessment_url": f"/assessment/custom/{link.access_token}",
    }


def get_custom_test_by_access_link(db: Session, access_token: str) -> dict:
    link = get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    payload = build_custom_assessment_payload(custom_test)
    payload["access_token"] = access_token
    return payload


def validate_custom_test_profile_by_access_link(db: Session, access_token: str, profile: dict[str, Any]) -> dict:
    link = get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=profile or {},
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)

    assessment_payload = build_custom_assessment_payload(custom_test, profile or {})
    return {
        "message": "배정된 내담자 확인이 완료되었습니다.",
        "assessment_payload": assessment_payload,
    }


def submit_custom_test_by_access_link(
    db: Session,
    access_token: str,
    responder_name: str,
    profile: dict[str, Any],
    answers: dict[str, str],
) -> dict:
    link = get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    def sanitize_profile_value(value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, list):
            return [str(v) for v in value if v is not None]
        return str(value)

    clean_profile: dict[str, Any] = {str(k): sanitize_profile_value(v) for k, v in (profile or {}).items()}

    assessment_payload = build_custom_assessment_payload(custom_test, clean_profile)
    valid_item_ids = {item["id"] for item in assessment_payload["items"]}
    if not valid_item_ids:
        raise HTTPException(status_code=400, detail="문항 데이터가 없습니다.")

    cleaned_answers: dict[str, str] = {}
    for item_id, value in (answers or {}).items():
        key = str(item_id)
        if key not in valid_item_ids:
            continue
        cleaned_answers[key] = str(value)

    if len(cleaned_answers) != len(valid_item_ids):
        raise HTTPException(status_code=400, detail="모든 문항에 응답해주세요.")

    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=clean_profile,
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)

    profile_name = str(clean_profile.get("name", "")).strip()
    final_responder_name = profile_name or responder_name.strip()

    create_submission(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        access_token=access_token,
        responder_name=final_responder_name,
        answers_json=json.dumps({"profile": clean_profile, "answers": cleaned_answers}, ensure_ascii=False),
    )

    return {"message": "검사가 제출되었습니다.", "submitted_item_count": len(cleaned_answers)}
