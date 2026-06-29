import json
import hashlib
import re
import secrets
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import AdminCustomTest, AdminCustomTestSubmission, AdminSettings, ClientConsentRecord
from app.repositories.assessment_repository import create_assessment_log
from app.repositories.custom_test_repository import (
    create_access_link,
    create_submission,
    delete_assessment_draft,
    find_pre_registered_entry_by_match,
    get_assessment_draft,
    get_latest_submission_by_client_and_test,
    get_active_access_link_by_admin_and_test,
    get_active_access_link_by_token,
    get_custom_test_by_id_and_admin,
    get_pre_registered_entries_by_link,
    create_pre_registered_entry,
    delete_pre_registered_entry,
    update_pre_registered_provisional_client,
    upsert_assessment_draft,
)
from app.repositories.custom_test_restructure_repository import (
    create_submission_custom_test_snapshot,
    load_custom_test_configs_from_restructure,
    load_custom_test_profile_fields_from_restructure,
    load_custom_test_sessions_from_restructure,
)
from app.repositories.parent_test_repository import fetch_parent_item_bundle
from app.schemas.values import normalize_gender_value
from app.services.admin.auth import get_current_admin
from app.repositories.client_repository import create_client_relation
from app.services.admin.clients import (
    AMBIGUOUS_CLIENT_CODE,
    ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE,
    AUTO_CREATE_CONFIRM_REQUIRED_CODE,
    create_provisional_client_and_assign_for_public_assessment,
    find_assigned_client_for_profile_with_code,
    register_client_and_assign_for_public_assessment,
)
from app.services.admin.common import (
    SCHOOL_AGE_LABELS,
    _derive_required_profile_fields,
    _normalize_item_map,
    _parse_response_options,
    flatten_custom_test_variant_configs,
    informant_option_entries,
    load_custom_test_configs,
    load_custom_test_session_configs,
    normalize_client_intake_mode,
    normalize_additional_profile_fields,
    summarize_custom_test_ids,
)


_SECONDARY_ROLES = {"parent", "teacher", "classmate", "guardian"}
NO_RESPONSE_ANSWER_VALUE = "NO_RESPONSE"
_HTML_LINE_BREAK_RE = re.compile(r"\s*<br\s*/?>\s*", re.IGNORECASE)
_SEAT_PCS_DEMO_TEST_TYPE_ACCESS_TOKEN_SHA256 = "906fa5955a5cab53f7e4c361000d4f4229750ad2abd279deb3f0e4aedca5234a"
_SEAT_PCS_DEMO_TEST_TYPE_OPTIONS = ("표준형", "단축형")


def _test_type_selection_for_access_token(access_token: str) -> dict[str, Any] | None:
    token_hash = hashlib.sha256(str(access_token or "").encode("utf-8")).hexdigest()
    if token_hash != _SEAT_PCS_DEMO_TEST_TYPE_ACCESS_TOKEN_SHA256:
        return None
    return {
        "enabled": True,
        "field_key": "test_type",
        "heading": "검사 유형 선택하기",
        "description": "다음 중 원하는 검사 실시 형태를 선택해 주세요.",
        "default_value": _SEAT_PCS_DEMO_TEST_TYPE_OPTIONS[0],
        "options": list(_SEAT_PCS_DEMO_TEST_TYPE_OPTIONS),
    }


def _normalize_selected_test_type(value: Any) -> str:
    normalized = str(value or "").strip()
    if normalized in _SEAT_PCS_DEMO_TEST_TYPE_OPTIONS:
        return normalized
    return ""


def _without_profile_field(profile_config: Any, field_key: str) -> Any:
    if not isinstance(profile_config, dict) or not field_key:
        return profile_config
    sanitized = dict(profile_config)
    fields = sanitized.get("fields")
    if isinstance(fields, dict) and field_key in fields:
        sanitized["fields"] = {key: value for key, value in fields.items() if key != field_key}
    optional_fields = sanitized.get("optional_fields")
    if isinstance(optional_fields, dict) and field_key in optional_fields:
        sanitized["optional_fields"] = {key: value for key, value in optional_fields.items() if key != field_key}
    sections = sanitized.get("sections")
    if isinstance(sections, list):
        next_sections: list[Any] = []
        for section in sections:
            if not isinstance(section, dict):
                next_sections.append(section)
                continue
            next_section = dict(section)
            section_fields = next_section.get("fields")
            if isinstance(section_fields, dict) and field_key in section_fields:
                next_section["fields"] = {
                    key: value
                    for key, value in section_fields.items()
                    if key != field_key
                }
            next_sections.append(next_section)
        sanitized["sections"] = next_sections
    return sanitized


def _normalize_item_display_text(value: Any) -> str:
    return _HTML_LINE_BREAK_RE.sub("\n", str(value or "")).strip()


def _resolve_subject_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """mixed profile에서 child_ 접두사 키를 top-level 키로 복사한다 (버그픽스).
    gender/birth_day/school_age_range 가 없을 때만 child_ 값을 사용한다.
    """
    result = dict(profile)
    if not str(result.get("gender", "")).strip():
        result["gender"] = str(result.get("child_gender", "")).strip()
    if not str(result.get("birth_day", "")).strip():
        result["birth_day"] = str(result.get("child_birth_day", "")).strip()
    if not str(result.get("school_age_range", "")).strip():
        result["school_age_range"] = str(result.get("child_school_age", "")).strip()
    return result


def _extract_secondary_subjects(profile: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """profile에서 보조 대상자(부모, 선생 등)의 이름/성별/생년월일을 추출한다.
    이름+성별+생년월일 3개 모두 있을 때만 결과에 포함한다.
    returns: list of (role, {"name": ..., "gender": ..., "birth_day": ...})
    """
    result = []
    for role in _SECONDARY_ROLES:
        name = str(profile.get(f"{role}_name", "")).strip()
        gender = str(profile.get(f"{role}_gender", "")).strip()
        birth_day = str(profile.get(f"{role}_birth_day", "")).strip()
        if name and gender and birth_day:
            result.append((role, {"name": name, "gender": gender, "birth_day": birth_day}))
    return result


def _safe_parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _raise_assessment_error(
    status_code: int,
    message: str,
    code: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    detail: dict[str, Any] = {"message": message}
    if code:
        detail["code"] = code
    if data:
        detail.update(data)
    raise HTTPException(status_code=status_code, detail=detail)


def _generate_submission_report_token(db: Session) -> str:
    for _ in range(10):
        token = secrets.token_urlsafe(32)
        exists = db.query(AdminCustomTestSubmission.id).filter_by(access_token=token).first()
        if exists is None:
            return token
    raise HTTPException(status_code=500, detail="보고서 접근 토큰 생성에 실패했습니다.")


def _sanitize_profile_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    return str(value)


def _clean_profile(profile: dict[str, Any] | None) -> dict[str, Any]:
    return {str(k): _sanitize_profile_value(v) for k, v in (profile or {}).items()}


def _valid_item_ids_for_profile(db: Session, custom_test: AdminCustomTest, profile: dict[str, Any]) -> set[str]:
    assessment_payload = build_custom_assessment_question_payload(custom_test, profile, db=db)
    return {
        str(item.get("id", "")).strip()
        for item in assessment_payload["items"]
        if str(item.get("id", "")).strip()
    }


def _clean_answers_for_items(answers: dict[str, Any] | None, valid_item_ids: set[str]) -> dict[str, str]:
    cleaned_answers: dict[str, str] = {}
    for item_id, value in (answers or {}).items():
        key = str(item_id)
        if key not in valid_item_ids:
            continue
        answer = str(value).strip()
        if answer:
            cleaned_answers[key] = answer
    return cleaned_answers


def _parse_json_object(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def _serialize_assessment_draft(row) -> dict[str, Any]:
    return {
        "client_id": row.admin_client_id,
        "profile": _parse_json_object(row.profile_json),
        "answers": _parse_json_object(row.answers_json),
        "current_part_index": row.current_part_index,
        "current_page": row.current_page,
        "is_ambiguous_match": bool(row.is_ambiguous_match),
        "responder_choice": row.responder_choice,
        "candidate_client_ids": _parse_json_list(row.candidate_client_ids_json),
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_selected_client_matches_profile(client_row, profile: dict[str, Any]) -> None:
    profile_name = str(profile.get("name", "")).strip()
    if profile_name and client_row.name.strip() != profile_name:
        _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")

    profile_gender = str(profile.get("gender", "")).strip()
    if profile_gender:
        try:
            normalized_gender = normalize_gender_value(profile_gender)
        except ValueError:
            _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")
        if (client_row.gender or "").strip() != normalized_gender:
            _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")

    birth_day_text = str(profile.get("birth_day", "")).strip()
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError:
            _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")
        if client_row.birth_day != birth_day_value:
            _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")


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


def _load_condition_profile_maps(db: Session, test_ids: list[str]) -> dict[str, dict[str, dict]]:
    normalized_ids = [str(test_id).strip() for test_id in test_ids if str(test_id).strip()]
    if not normalized_ids:
        return {}
    placeholders = ",".join(f":id{i}" for i in range(len(normalized_ids)))
    params = {f"id{i}": test_id for i, test_id in enumerate(normalized_ids)}
    rows = db.execute(
        text(f"SELECT test_id, essential_profile_json FROM test_profile_config WHERE test_id IN ({placeholders})"),
        params,
    ).fetchall()

    maps: dict[str, dict[str, dict]] = {}
    for test_id, raw_config in rows:
        try:
            config = json.loads(raw_config or "{}")
        except json.JSONDecodeError:
            continue
        if not isinstance(config, dict):
            continue
        condition_map = config.get("condition_profile_map")
        if not isinstance(condition_map, dict):
            continue
        normalized_map = {
            str(condition_key): mapping
            for condition_key, mapping in condition_map.items()
            if str(condition_key).strip() and isinstance(mapping, dict)
        }
        if normalized_map:
            maps[str(test_id)] = normalized_map
    return maps


def _profile_value_for_condition(
    profile: dict[str, Any],
    condition_key: str,
    condition_profile_map: dict[str, dict] | None,
    fallback_field: str,
) -> Any:
    mapping = (condition_profile_map or {}).get(condition_key)
    if isinstance(mapping, dict):
        profile_field = str(mapping.get("profile_field", "")).strip()
        if profile_field:
            value = profile.get(profile_field)
            if str(value or "").strip():
                return value
            if "_" in profile_field:
                fallback_suffix = profile_field.split("_", 1)[1]
                return profile.get(fallback_suffix)
    return profile.get(fallback_field)


def _as_of_value_for_condition(
    profile: dict[str, Any],
    condition_key: str,
    condition_profile_map: dict[str, dict] | None,
) -> Any:
    mapping = (condition_profile_map or {}).get(condition_key)
    if isinstance(mapping, dict):
        as_of_field = str(mapping.get("as_of_field", "")).strip()
        if as_of_field:
            return profile.get(as_of_field)
    return profile.get("exam_date")


def _matches_enum_condition(raw_value: Any, raw_allowed: Any) -> bool:
    value = str(raw_value or "").strip().lower()
    if isinstance(raw_allowed, list) and raw_allowed:
        allowed = {str(x).strip().lower() for x in raw_allowed if str(x).strip()}
        return bool(value) and value in allowed
    if isinstance(raw_allowed, str) and raw_allowed.strip():
        return bool(value) and value == raw_allowed.strip().lower()
    return True


def _matches_age_range_condition(raw_birth_day: Any, raw_as_of: Any, age_range: Any) -> bool:
    if not isinstance(age_range, dict):
        return True
    birth_day = _safe_parse_date(raw_birth_day)
    if birth_day is None:
        return False
    as_of = _safe_parse_date(raw_as_of) or date.today()
    age_now = _age_detail(birth_day, as_of)
    start = _to_age_tuple(age_range.get("start_inclusive"), (0, 0, 0))
    end = _to_age_tuple(age_range.get("end_exclusive"), (999, 0, 0))
    if age_now < start:
        return False
    if age_now >= end:
        return False
    return True


def _school_age_index(raw_value: Any) -> int | None:
    text = str(raw_value or "").strip()
    if not text:
        return None
    try:
        index = int(text)
    except ValueError:
        index = -1
    if 0 <= index < len(SCHOOL_AGE_LABELS):
        return index
    try:
        return SCHOOL_AGE_LABELS.index(text)
    except ValueError:
        return None


def _is_school_age_boundary_tuple(raw_value: Any) -> bool:
    return (
        isinstance(raw_value, list)
        and len(raw_value) >= 3
        and all(isinstance(item, int) for item in raw_value[:3])
    )


def _matches_school_age_condition(raw_value: Any, raw_condition: Any, *, condition_key: str = "") -> bool:
    value = str(raw_value or "").strip()
    value_index = _school_age_index(value)
    if condition_key in {"school_age_range", "school_age_index_range"} and _is_school_age_boundary_tuple(raw_condition):
        if value_index is None:
            return False
        return raw_condition[0] <= value_index < len(SCHOOL_AGE_LABELS)
    if isinstance(raw_condition, list) and raw_condition:
        for item in raw_condition:
            allowed_value = str(item or "").strip()
            if value and value == allowed_value:
                return True
            allowed_index = _school_age_index(allowed_value)
            if value_index is not None and allowed_index == value_index:
                return True
        return False
    if isinstance(raw_condition, str) and raw_condition.strip():
        allowed_value = raw_condition.strip()
        if value and value == allowed_value:
            return True
        allowed_index = _school_age_index(allowed_value)
        return value_index is not None and allowed_index == value_index
    if isinstance(raw_condition, dict) and raw_condition:
        if value_index is None:
            return False
        start = _to_age_tuple(raw_condition.get("start_inclusive"), (0, 0, 0))[0]
        end = _to_age_tuple(raw_condition.get("end_exclusive"), (999, 0, 0))[0]
        return start <= value_index < end
    return True


def _match_age_range_condition(
    profile: dict[str, Any],
    condition_key: str,
    condition_value: Any,
    condition_profile_map: dict[str, dict] | None,
) -> bool:
    return _matches_age_range_condition(
        _profile_value_for_condition(profile, condition_key, condition_profile_map, "birth_day"),
        _as_of_value_for_condition(profile, condition_key, condition_profile_map),
        condition_value,
    )


def _match_enum_condition(
    profile: dict[str, Any],
    condition_key: str,
    condition_value: Any,
    condition_profile_map: dict[str, dict] | None,
) -> bool:
    return _matches_enum_condition(
        _profile_value_for_condition(profile, condition_key, condition_profile_map, condition_key),
        condition_value,
    )


def _match_school_age_condition(
    profile: dict[str, Any],
    condition_key: str,
    condition_value: Any,
    condition_profile_map: dict[str, dict] | None,
) -> bool:
    return _matches_school_age_condition(
        _profile_value_for_condition(profile, condition_key, condition_profile_map, "school_age_range"),
        condition_value,
        condition_key=condition_key,
    )


_CONDITION_MATCHERS = {
    "age_range": _match_age_range_condition,
    "enum": _match_enum_condition,
    "school_age_range": _match_school_age_condition,
    "school_age_index_range": _match_school_age_condition,
}


def _profile_matches_sub_test(
    profile: dict[str, Any],
    sub_test_json: str,
    condition_profile_map: dict[str, dict] | None = None,
) -> bool:
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        return False
    if not isinstance(parsed, dict):
        return False

    handled_keys: set[str] = set()
    for condition_key, mapping in (condition_profile_map or {}).items():
        if condition_key not in parsed or not isinstance(mapping, dict):
            continue
        condition_type = str(mapping.get("type", "")).strip()
        matcher = _CONDITION_MATCHERS.get(condition_type)
        if matcher is None:
            continue
        if not matcher(profile, condition_key, parsed.get(condition_key), condition_profile_map):
            return False
        handled_keys.add(condition_key)

    if "gender" not in handled_keys:
        profile_gender = str(profile.get("gender", "")).strip().lower()
        genders = parsed.get("gender")
        if isinstance(genders, list) and genders:
            allowed = {str(x).strip().lower() for x in genders if str(x).strip()}
            if not profile_gender or profile_gender not in allowed:
                return False

    if "informant" not in handled_keys:
        profile_informant = str(profile.get("informant", "")).strip().lower()
        informants = parsed.get("informant")
        if isinstance(informants, list) and informants:
            allowed_informants = {str(x).strip().lower() for x in informants if str(x).strip()}
            if not profile_informant or profile_informant not in allowed_informants:
                return False

    age_range = parsed.get("age_range")
    if "age_range" not in handled_keys and isinstance(age_range, dict):
        if not _matches_age_range_condition(profile.get("birth_day"), profile.get("exam_date"), age_range):
            return False

    school_raw = None
    school_key = ""
    for key in ("school_ages", "school_age", "school_grades", "school_grade", "grades", "grade", "school_age_range"):
        if key in parsed and parsed.get(key) not in (None, "", []):
            school_key = key
            school_raw = parsed.get(key)
            break
    school_keys = {"school_ages", "school_age", "school_grades", "school_grade", "grades", "grade", "school_age_range"}
    if not handled_keys.intersection(school_keys):
        profile_school_age = str(profile.get("school_age_range") or profile.get("school_age", "")).strip()
        if not _matches_school_age_condition(profile_school_age, school_raw, condition_key=school_key):
            return False

    return True

def _select_sub_test_variant_for_profile(
    variants: list[dict],
    profile: dict[str, Any],
    *,
    test_id: str = "",
    condition_profile_map: dict[str, dict] | None = None,
) -> dict:
    prefix = f"({test_id}) " if test_id else ""
    if not variants:
        raise HTTPException(status_code=400, detail=f"{prefix}실시 가능한 검사 구간이 없습니다.")

    variant_by_json = {item["sub_test_json"]: item for item in variants if item.get("sub_test_json")}
    variant_jsons = list(variant_by_json.keys())
    matches = [
        sub_test_json
        for sub_test_json in variant_jsons
        if _profile_matches_sub_test(profile, sub_test_json, condition_profile_map)
    ]
    if not matches:
        raise HTTPException(status_code=400, detail=f"{prefix}입력한 인적정보와 일치하는 검사 구간이 없습니다.")

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
    return variant_by_json[matches[0]]

# 여러 sub_test_json을 포함하는 test_configs에서 필요한 인적사항 필드들을 추출해서 리스트로 반환
def _required_profile_fields_for_variants(test_configs: list[dict]) -> list[str]:
    required: list[str] = []
    variant_configs = flatten_custom_test_variant_configs(test_configs)
    for sub_test_json in [item["sub_test_json"] for item in variant_configs]:
        for key in _derive_required_profile_fields(sub_test_json):
            if key not in required:
                required.append(key)
    return required

def _school_age_boundary_index(raw_value: Any, fallback: int) -> int:
    if isinstance(raw_value, list) and raw_value and isinstance(raw_value[0], int):
        return raw_value[0]
    if isinstance(raw_value, int):
        return raw_value
    try:
        return int(str(raw_value).strip())
    except (TypeError, ValueError):
        return fallback


def _school_age_option_entries_from_condition(raw_condition: Any, *, condition_key: str = "") -> list[dict[str, str]]:
    allowed_indexes: set[int] = set()
    if condition_key in {"school_age_range", "school_age_index_range"} and _is_school_age_boundary_tuple(raw_condition):
        start = max(0, min(raw_condition[0], len(SCHOOL_AGE_LABELS)))
        allowed_indexes.update(range(start, len(SCHOOL_AGE_LABELS)))
    elif isinstance(raw_condition, dict) and raw_condition:
        start = _school_age_boundary_index(raw_condition.get("start_inclusive"), 0)
        end = _school_age_boundary_index(raw_condition.get("end_exclusive"), len(SCHOOL_AGE_LABELS))
        start = max(0, min(start, len(SCHOOL_AGE_LABELS)))
        end = max(start, min(end, len(SCHOOL_AGE_LABELS)))
        allowed_indexes.update(range(start, end))
    elif isinstance(raw_condition, list):
        for item in raw_condition:
            index = _school_age_index(item)
            if index is not None:
                allowed_indexes.add(index)
    else:
        index = _school_age_index(raw_condition)
        if index is not None:
            allowed_indexes.add(index)

    return [
        {"value": str(index), "label": SCHOOL_AGE_LABELS[index]}
        for index in sorted(allowed_indexes)
        if 0 <= index < len(SCHOOL_AGE_LABELS)
    ]


def _collect_profile_field_options(test_configs: list[dict]) -> dict[str, list[Any]]:
    informant_options: set[str] = set()
    school_age_options_by_value: dict[str, dict[str, str]] = {}
    for variant in flatten_custom_test_variant_configs(test_configs):
        try:
            parsed = json.loads(variant["sub_test_json"] or "{}")
        except (TypeError, json.JSONDecodeError):
            continue
        informants = parsed.get("informant")
        if isinstance(informants, list):
            informant_options.update(str(x) for x in informants if x)
        school_raw = None
        school_key = ""
        for key in ("school_ages", "school_age", "school_grades", "school_grade", "grades", "grade", "school_age_range"):
            if key in parsed and parsed.get(key) not in (None, "", []):
                school_key = key
                school_raw = parsed.get(key)
                break
        for option in _school_age_option_entries_from_condition(school_raw, condition_key=school_key):
            school_age_options_by_value[option["value"]] = option
    result: dict[str, list[Any]] = {}
    if informant_options:
        result["informant"] = informant_option_entries(informant_options)
    if school_age_options_by_value:
        result["school_age_range"] = [
            school_age_options_by_value[value]
            for value in sorted(school_age_options_by_value, key=lambda raw: int(raw))
        ]
    return result

# custom_test_row의 test_configs에서 profile과 일치하는 검사 구간을 찾아서,
# 해당 검사 구간에 맞는 문항 화면 payload를 반환
def _build_custom_assessment_profile_meta(
    custom_test_row: AdminCustomTest,
    test_configs: list[dict],
    additional_profile_fields_override: list[dict] | None = None,
) -> dict:
    test_ids, test_id_text = summarize_custom_test_ids(test_configs, custom_test_row.test_id)
    if additional_profile_fields_override is not None:
        additional_profile_fields = additional_profile_fields_override
    else:
        raw_additional_payload = json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
        additional_profile_fields = normalize_additional_profile_fields(raw_additional_payload) # 커스텀 검사의 생성한 추가 인적사항 필드 정규화
    return {
        "custom_test_id": custom_test_row.id,
        "custom_test_name": custom_test_row.custom_test_name,
        "client_intake_mode": normalize_client_intake_mode(getattr(custom_test_row, "client_intake_mode", "")),
        "test_id": test_id_text or custom_test_row.test_id,
        "test_ids": test_ids,
        "display_name": custom_test_row.custom_test_name,
        "show_research_notice": bool(getattr(custom_test_row, "show_research_notice", True)),
        "required_profile_fields": _required_profile_fields_for_variants(test_configs),
        "profile_field_options": _collect_profile_field_options(test_configs),
        "additional_profile_fields": additional_profile_fields,
        "sub_test_variant_count": len(flatten_custom_test_variant_configs(test_configs)),
        "test_configs": test_configs,
    }

# custom_test_row 정규화 및 이상한 경우 오류 처리
def build_custom_assessment_profile_payload(custom_test_row: AdminCustomTest) -> dict:
    test_configs = load_custom_test_configs(custom_test_row)
    if not test_configs:
        raise HTTPException(status_code=404, detail="검사 구성 정보를 찾을 수 없습니다.")
    return _build_custom_assessment_profile_meta(custom_test_row, test_configs)

def _resolve_active_variants(
    test_configs: list[dict],
    profile: dict[str, Any],
    condition_profile_maps: dict[str, dict[str, dict]] | None = None,
) -> list[dict]:
    resolved: list[dict] = []
    for config in test_configs:
        test_id = str(config.get("test_id", "")).strip()
        variants = config.get("sub_test_variants", [])
        if not test_id or not variants:
            continue
        active_variant = _select_sub_test_variant_for_profile(
            variants,
            profile or {},
            test_id=test_id,
            condition_profile_map=(condition_profile_maps or {}).get(test_id),
        )
        selected_sub_test_json = str(active_variant.get("sub_test_json", "")).strip()
        if not selected_sub_test_json:
            continue
        resolved.append(
            {
                "test_id": test_id,
                "sub_test_json": selected_sub_test_json,
                "selected_scale_codes": [str(x) for x in active_variant.get("selected_scale_codes", [])],
            }
        )
    return resolved

# custom_test_row의 test_configs에서 profile과 일치하는 검사 구간을 찾아서, 해당 검사 구간에 맞는 문항 화면 payload를 반환
def _load_question_bundle(test_id: str, sub_test_json: str) -> dict:
    row = fetch_parent_item_bundle(test_id, sub_test_json)
    if row is None:
        raise HTTPException(status_code=404, detail="검사 원본 데이터를 찾을 수 없습니다.")

    item_json = json.loads(row.item_json)
    try:
        item_meta = json.loads(row.item_meta_json)
    except json.JSONDecodeError:
        item_meta = {}
    if not isinstance(item_meta, dict):
        item_meta = {}
    scale_struct = json.loads(row.scale_struct)
    if not isinstance(scale_struct, dict):
        raise HTTPException(status_code=404, detail="척도 구조 데이터를 찾을 수 없습니다.")
    item_map, matrix_row_meta = _build_item_text_and_matrix_meta(item_json)
    response_options = _parse_response_options(row.item_template)
    item_response_options_map = _parse_item_response_options(row.item_template)
    render_rules = _parse_render_rules(getattr(row, "render_rules_json", "[]"))
    if not response_options and item_response_options_map:
        first_key = next(iter(item_response_options_map.keys()), "")
        response_options = item_response_options_map.get(first_key, [])
    return {
        "item_map": item_map,
        "matrix_row_meta": matrix_row_meta,
        "item_meta": item_meta,
        "scale_struct": scale_struct,
        "response_options": response_options,
        "item_response_options_map": item_response_options_map,
        "render_rules": render_rules,
        "response_key": json.dumps(response_options, ensure_ascii=False, sort_keys=True),
    }


def _build_item_text_and_matrix_meta(item_json: Any) -> tuple[dict[str, str], dict[str, dict]]:
    item_map: dict[str, str] = {}
    matrix_row_meta: dict[str, dict] = {}

    if isinstance(item_json, dict):
        matrix_group_order = 0
        for outer_key, outer_value in item_json.items():
            outer_key_text = str(outer_key)
            if isinstance(outer_value, dict):
                matrix_group_order += 1
                row_keys = sorted(
                    [str(k) for k in outer_value.keys()],
                    key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
                )
                for row_idx, row_key in enumerate(row_keys, start=1):
                    row_text = _normalize_item_display_text(outer_value.get(row_key, ""))
                    if not row_text:
                        continue
                    item_map[row_key] = row_text
                    matrix_row_meta[row_key] = {
                        "group_key": outer_key_text,
                        "group_prompt": outer_key_text,
                        "group_order": matrix_group_order,
                        "row_order": row_idx,
                    }
                continue
            value_text = _normalize_item_display_text(outer_value)
            if not value_text:
                continue
            item_map[outer_key_text] = value_text
        return item_map, matrix_row_meta

    return {key: _normalize_item_display_text(value) for key, value in _normalize_item_map(item_json).items()}, matrix_row_meta


def _parse_item_response_options(item_template: str | None) -> dict[str, list[dict]]:
    if not item_template:
        return {}
    try:
        parsed = json.loads(item_template)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}

    item_options: dict[str, list[dict]] = {}
    for item_id, raw_options in parsed.items():
        if not isinstance(raw_options, dict):
            continue
        options: list[dict] = []
        for raw_value, raw_label in raw_options.items():
            value = str(raw_value).strip()
            if not value:
                continue
            options.append(
                {
                    "value": value,
                    "label": str(raw_label or "").strip(),
                }
            )
        if not options:
            continue
        options.sort(key=lambda x: (0, int(x["value"])) if x["value"].isdigit() else (1, x["value"]))
        item_options[str(item_id)] = options
    return item_options


def _parse_render_rules(render_rules_json: str | None) -> list[dict]:
    if not render_rules_json:
        return []
    try:
        parsed = json.loads(render_rules_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []

    normalized: list[dict] = []
    for raw in parsed:
        if not isinstance(raw, dict):
            continue
        render_type = str(raw.get("render_type", "")).strip()
        if not render_type:
            continue
        try:
            start_item_id = int(str(raw.get("start_item_id")))
            end_item_id = int(str(raw.get("end_item_id")))
        except (TypeError, ValueError):
            continue
        if start_item_id > end_item_id:
            start_item_id, end_item_id = end_item_id, start_item_id
        config = raw.get("config")
        normalized.append(
            {
                "start_item_id": start_item_id,
                "end_item_id": end_item_id,
                "render_type": render_type,
                "config": config if isinstance(config, dict) else {},
            }
        )
    return normalized


def _resolve_render_rule_for_item(item_id: str, render_rules: list[dict]) -> dict | None:
    try:
        numeric_item_id = int(str(item_id))
    except (TypeError, ValueError):
        return None
    for rule in render_rules:
        if int(rule["start_item_id"]) <= numeric_item_id <= int(rule["end_item_id"]):
            return rule
    return None


def _infer_response_style(options: list[dict]) -> str:
    if not options:
        return "free_text"
    non_empty = sum(1 for option in options if str(option.get("label", "")).strip())
    blank = len(options) - non_empty
    if len(options) >= 5 and non_empty >= 2 and blank > 0:
        return "bipolar"
    return "likert"


def _collect_choice_score_item_ids(raw: Any) -> set[str]:
    item_ids: set[str] = set()
    if isinstance(raw, dict):
        choice_score = raw.get("choice_score")
        if isinstance(choice_score, dict):
            item_ids.update(str(item_id) for item_id in choice_score.keys())
        for key, child in raw.items():
            if key == "choice_score":
                continue
            item_ids.update(_collect_choice_score_item_ids(child))
    elif isinstance(raw, list):
        for child in raw:
            item_ids.update(_collect_choice_score_item_ids(child))
    return item_ids


def _resolve_scale_item_ids(scale_struct: dict, selected_codes: set[str]) -> dict[str, dict[str, Any]]:
    resolved: dict[str, dict[str, Any]] = {}

    def visit(code: str, raw_scale: Any, inherited_selected: bool = False) -> None:
        if not isinstance(raw_scale, dict):
            return
        code_text = str(code)
        is_selected = inherited_selected or not selected_codes or code_text in selected_codes
        facet_scale = raw_scale.get("facet_scale")
        if isinstance(facet_scale, dict):
            for child_code, child_scale in facet_scale.items():
                visit(str(child_code), child_scale, is_selected)
        if not is_selected:
            return
        item_ids = sorted(
            _collect_choice_score_item_ids(raw_scale),
            key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
        )
        if item_ids:
            resolved[code_text] = {
                "name": str(raw_scale.get("name", code_text)),
                "item_ids": item_ids,
            }

    for code, raw_scale in scale_struct.items():
        visit(str(code), raw_scale)
    return resolved


def _resolve_item_render_type(item: dict[str, Any]) -> str:
    render_type = str(item.get("render_type", "")).strip()
    if render_type:
        return render_type
    if str(item.get("response_style", "")).strip() == "bipolar":
        return "bipolar"
    return "likert"


def _build_structured_answers(
    *,
    raw_answers: dict[str, str],
    assessment_items: list[dict[str, Any]],
    include_unanswered: bool = False,
) -> list[dict[str, Any]]:
    item_meta_by_id: dict[str, dict[str, Any]] = {}
    ordered_item_ids: list[str] = []
    for order, item in enumerate(assessment_items, start=1):
        answer_key = str(item.get("id", "")).strip()
        if not answer_key:
            continue
        ordered_item_ids.append(answer_key)
        item_meta_by_id[answer_key] = {
            "order": order,
            "test_id": str(item.get("test_id", "")).strip(),
            "sub_test_json": str(item.get("sub_test_json", "")).strip(),
            "parent_item_id": str(item.get("item_id", "")).strip(),
        }

    grouped_items: dict[tuple[str, str], list[dict[str, str | int]]] = {}
    source_item_ids = ordered_item_ids if include_unanswered else list((raw_answers or {}).keys())
    for answer_key in source_item_ids:
        key = str(answer_key).strip()
        meta = item_meta_by_id.get(key)
        if meta is None:
            continue
        raw_value = (raw_answers or {}).get(key)
        answer_value = str(raw_value).strip() if raw_value is not None else ""
        if not answer_value:
            if not include_unanswered:
                continue
            answer_value = NO_RESPONSE_ANSWER_VALUE
        group_key = (meta["test_id"], meta["sub_test_json"])
        grouped_items.setdefault(group_key, []).append(
            {
                "order": int(meta["order"]),
                "parent_item_id": meta["parent_item_id"],
                "answer_value": answer_value,
            }
        )

    structured_answers: list[dict[str, Any]] = []
    for answer_key in ordered_item_ids:
        meta = item_meta_by_id.get(answer_key)
        if meta is None:
            continue
        group_key = (meta["test_id"], meta["sub_test_json"])
        items = grouped_items.get(group_key)
        if not items:
            continue
        if structured_answers and structured_answers[-1]["test_id"] == meta["test_id"] and structured_answers[-1]["sub_test_json"] == meta["sub_test_json"]:
            continue
        structured_answers.append(
            {
                "test_id": meta["test_id"],
                "sub_test_json": meta["sub_test_json"],
                "items": sorted(items, key=lambda x: int(x["order"])),
            }
        )
    return structured_answers


def _build_variant_items_and_scales(
    *,
    test_id: str,
    sub_test_json: str,
    selected_scale_codes: list[str],
    bundle: dict,
    default_display_name: str,
) -> tuple[list[dict], list[dict], dict]:
    selected_codes = {str(code) for code in selected_scale_codes}
    item_map = bundle["item_map"]
    scale_struct = bundle["scale_struct"]
    item_response_options_map: dict[str, list[dict]] = bundle.get("item_response_options_map", {})
    matrix_row_meta: dict[str, dict] = bundle.get("matrix_row_meta", {})
    render_rules: list[dict] = bundle.get("render_rules", [])
    display_name = bundle["item_meta"].get("name", default_display_name)

    resolved_scale_item_ids = _resolve_scale_item_ids(scale_struct, selected_codes)
    selected_item_ids: set[str] = set()
    selected_scales: list[dict] = []
    for code, scale_info in resolved_scale_item_ids.items():
        item_ids = scale_info["item_ids"]
        selected_item_ids.update(item_ids)
        selected_scales.append(
            {
                "test_id": test_id,
                "sub_test_json": sub_test_json,
                "code": code,
                "name": scale_info["name"],
                "item_ids": [f"{test_id}::{sub_test_json}::{item_id}" for item_id in item_ids],
            }
        )

    sorted_item_ids = sorted(selected_item_ids, key=lambda x: (0, int(x)) if x.isdigit() else (1, x))
    items: list[dict] = []
    for item_id in sorted_item_ids:
        text = item_map.get(item_id, "")
        response_options = item_response_options_map.get(item_id, bundle["response_options"])
        matched_rule = _resolve_render_rule_for_item(item_id, render_rules)
        render_type = matched_rule["render_type"] if matched_rule else ""
        # bipolar_labels_only는 문항 본문 없이도 렌더되므로 빈 텍스트 문항을 제외하지 않는다.
        if not text and render_type != "bipolar_labels_only":
            continue
        row_meta = matrix_row_meta.get(item_id, {})
        items.append(
            {
                "id": f"{test_id}::{sub_test_json}::{item_id}",
                "item_id": item_id,
                "test_id": test_id,
                "sub_test_json": sub_test_json,
                "display_name": display_name,
                "text": text,
                "response_options": response_options,
                "response_style": _infer_response_style(response_options),
                "render_type": render_type,
                "render_config": matched_rule["config"] if matched_rule else {},
                "matrix_group_key": row_meta.get("group_key", ""),
                "matrix_group_prompt": row_meta.get("group_prompt", ""),
                "matrix_group_order": row_meta.get("group_order", 0),
                "matrix_row_order": row_meta.get("row_order", 0),
            }
        )
    selected_sub_test = {
        "test_id": test_id,
        "sub_test_json": sub_test_json,
        "display_name": display_name,
        "selected_scale_codes": sorted(selected_codes),
    }
    return items, selected_scales, selected_sub_test


def _assemble_parts(parts_buffer: list[dict]) -> list[dict]:
    parts: list[dict] = []
    for part_idx, part in enumerate(parts_buffer):
        if not part["items"]:
            continue
        parts.append(
            {
                "part_id": f"part_{part_idx + 1}",
                "part_index": part_idx,
                "title": f"파트 {part_idx + 1}",
                "response_options": part["response_options"],
                "response_scale_label": part["response_scale_label"],
                "render_type": part["render_type"],
                "session_id": part.get("session_id", "session_1"),
                "session_index": int(part.get("session_index", 0)),
                "session_title": part.get("session_title", "세션 1"),
                "session_description": part.get("session_description", ""),
                "session_guide_items": part.get("session_guide_items", []),
                "items": part["items"],
                "item_count": len(part["items"]),
                "selected_sub_tests": part["selected_sub_tests"],
            }
        )
    return parts


def _append_items_as_render_parts(
    parts_buffer: list[dict],
    *,
    items: list[dict],
    response_options: list[dict],
    selected_sub_test: dict,
    session: dict,
) -> None:
    if not items:
        return
    response_key = json.dumps(response_options, ensure_ascii=False, sort_keys=True)
    segment_start = 0
    segment_render_type = _resolve_item_render_type(items[0])

    def flush_segment(start_idx: int, end_idx: int, render_type: str) -> None:
        segment_items = items[start_idx:end_idx]
        if not segment_items:
            return
        can_merge = (
            bool(parts_buffer)
            and parts_buffer[-1]["response_key"] == response_key
            and parts_buffer[-1]["render_type"] == render_type
            and parts_buffer[-1].get("session_id") == session.get("session_id")
        )
        if can_merge:
            parts_buffer[-1]["items"].extend(segment_items)
            parts_buffer[-1]["selected_sub_tests"].append(selected_sub_test)
            return
        parts_buffer.append(
            {
                "response_key": response_key,
                "response_options": response_options,
                "response_scale_label": f"{len(response_options)}점 척도" if response_options else "응답형식 정보 없음",
                "render_type": render_type,
                "session_id": session.get("session_id", "session_1"),
                "session_index": int(session.get("session_index", 0)),
                "session_title": session.get("title", "세션 1"),
                "session_description": session.get("description", ""),
                "session_guide_items": session.get("guide_items", []),
                "items": list(segment_items),
                "selected_sub_tests": [selected_sub_test],
            }
        )

    for idx in range(1, len(items)):
        current_type = _resolve_item_render_type(items[idx])
        if current_type == segment_render_type:
            continue
        flush_segment(segment_start, idx, segment_render_type)
        segment_start = idx
        segment_render_type = current_type
    flush_segment(segment_start, len(items), segment_render_type)

# 입력 인적사항에 맞는 검사 구간 찾아서, 해당 검사 구간에 맞는 문항 payload 반환
def build_custom_assessment_question_payload(
    custom_test_row: AdminCustomTest,
    profile: dict[str, Any],
    db: Session | None = None,
    selected_test_type: str | None = None,
) -> dict:
    test_configs = (
        load_custom_test_configs_from_restructure(db, custom_test_id=custom_test_row.id)
        if db is not None
        else []
    ) or load_custom_test_configs(custom_test_row)
    if not test_configs:
        raise HTTPException(status_code=404, detail="검사 구성 정보를 찾을 수 없습니다.")

    additional_profile_fields = (
        load_custom_test_profile_fields_from_restructure(db, custom_test_id=custom_test_row.id)
        if db is not None
        else []
    )
    base_payload = _build_custom_assessment_profile_meta(
        custom_test_row,
        test_configs,
        additional_profile_fields_override=additional_profile_fields or None,
    )
    condition_profile_maps = _load_condition_profile_maps(db, base_payload.get("test_ids") or []) if db is not None else {}
    match_profile = dict(profile or {})
    normalized_test_type = _normalize_selected_test_type(selected_test_type)
    if normalized_test_type:
        match_profile["test_type"] = normalized_test_type
    resolved_variants = _resolve_active_variants(test_configs, match_profile, condition_profile_maps)
    session_configs = (
        load_custom_test_sessions_from_restructure(db, custom_test_id=custom_test_row.id)
        if db is not None
        else []
    ) or load_custom_test_session_configs(custom_test_row)
    session_by_test_id: dict[str, dict] = {}
    for session in session_configs:
        for test_id in session.get("test_ids", []):
            session_by_test_id[str(test_id)] = session
    default_session = session_configs[0] if session_configs else {
        "session_id": "session_1",
        "session_index": 0,
        "title": "세션 1",
        "description": "",
        "guide_items": [],
        "test_ids": [],
    }

    parts_buffer: list[dict] = []
    selected_scales: list[dict] = []
    all_items: list[dict] = []
    selected_sub_tests: list[dict] = []

    for variant in resolved_variants:
        test_id = variant["test_id"]
        sub_test_json = variant["sub_test_json"]
        bundle = _load_question_bundle(test_id, sub_test_json)
        response_options = bundle["response_options"]

        part_items, variant_scales, selected_sub_test = _build_variant_items_and_scales(
            test_id=test_id,
            sub_test_json=sub_test_json,
            selected_scale_codes=variant["selected_scale_codes"],
            bundle=bundle,
            default_display_name=custom_test_row.custom_test_name,
        )
        _append_items_as_render_parts(
            parts_buffer,
            items=part_items,
            response_options=response_options,
            selected_sub_test=selected_sub_test,
            session=session_by_test_id.get(test_id, default_session),
        )
        all_items.extend(part_items)
        selected_scales.extend(variant_scales)
        selected_sub_tests.append(selected_sub_test)

    if not all_items:
        raise HTTPException(status_code=400, detail="표시할 문항이 없습니다.")

    parts = _assemble_parts(parts_buffer)
    if selected_sub_tests:
        primary_sub_test_json = selected_sub_tests[0]["sub_test_json"]
    else:
        try:
            structured = json.loads(custom_test_row.sub_test_json or "{}")
            if isinstance(structured, dict) and all(isinstance(v, list) for v in structured.values()):
                first_conditions = next(iter(structured.values()), [])
                primary_sub_test_json = json.dumps(first_conditions[0], ensure_ascii=False) if first_conditions else custom_test_row.sub_test_json
            else:
                primary_sub_test_json = custom_test_row.sub_test_json
        except (TypeError, json.JSONDecodeError):
            primary_sub_test_json = custom_test_row.sub_test_json
    return {
        **base_payload,
        "sub_test_json": primary_sub_test_json,
        "selected_scale_codes": sorted({scale["code"] for scale in selected_scales}),
        "selected_scales": selected_scales,
        "items": all_items,
        "item_count": len(all_items),
        "response_options": parts[0]["response_options"] if parts else [],
        "selected_sub_tests": selected_sub_tests,
        "sessions": session_configs,
        "parts": parts,
        "part_count": len(parts),
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
            allow_unanswered_submission=bool(getattr(custom_test, "allow_unanswered_submission", False)),
            show_report_result=bool(getattr(custom_test, "show_report_result", True)),
        )

    return {
        "custom_test_id": custom_test.id,
        "custom_test_name": custom_test.custom_test_name,
        "access_token": link.access_token,
        "assessment_url": f"/assessment/custom/{link.access_token}",
        "allow_unanswered_submission": bool(getattr(link, "allow_unanswered_submission", False)),
        "show_report_result": bool(getattr(link, "show_report_result", True)),
    }

def _derive_required_fields_for_test(test_id: str, test_configs: list[dict]) -> list[str]:
    """test_id에 해당하는 variants에서 required_fields를 추출한다."""
    required: set[str] = set()
    for tc in test_configs:
        if str(tc.get("test_id", "")).strip() != test_id:
            continue
        for variant in tc.get("sub_test_variants", []):
            for field in _derive_required_profile_fields(variant.get("sub_test_json", "")):
                required.add(field)
    return sorted(required)


def _build_profile_section(cfg: dict, sub_test_required: set, profile_field_options: dict[str, list[Any]] | None = None) -> dict:
    section: dict = {"subject_type": cfg.get("subject_type", "self")}
    if cfg.get("section_hint"):
        section["section_hint"] = cfg["section_hint"]

    fields = {k: dict(v) for k, v in cfg.get("fields", {}).items()}
    # sub_test_json에서 파생된 필수 필드 중 config에 없는 것만 주입
    for f in sub_test_required:
        if f not in fields:
            fields[f] = {"required": True}
        else:
            fields[f].setdefault("required", True)
    for field_key, options in (profile_field_options or {}).items():
        if field_key in fields and options:
            fields[field_key]["options"] = options
            fields[field_key].setdefault("type", "select")
    if fields:
        section["fields"] = fields
    return section


def _load_test_profile_config(db: Session, test_ids: list[str], test_configs: list[dict] | None = None) -> dict:
    if not test_ids:
        return {}
    placeholders = ",".join(f":id{i}" for i in range(len(test_ids)))
    params = {f"id{i}": tid for i, tid in enumerate(test_ids)}
    rows = db.execute(
        text(f"SELECT test_id, essential_profile_json, optional_profile_json FROM test_profile_config WHERE test_id IN ({placeholders})"),
        params,
    ).fetchall()
    configs: dict[str, dict] = {}
    optional_fields: dict[str, dict] = {}
    for row in rows:
        try:
            configs[row[0]] = json.loads(row[1] or "{}")
        except Exception:
            configs[row[0]] = {}
        try:
            opt = json.loads(row[2] or "{}")
            optional_fields.update(opt.get("fields", {}))
        except Exception:
            pass

    if not configs:
        return {}

    # subject_type별로 그룹화 (test_ids 순서 기준, 첫 등장 순)
    seen: list[str] = []
    groups: dict[str, dict] = {}   # subject_type → section cfg
    group_required: dict[str, set] = {}

    def _merge_fields_into_group(st: str, src_fields: dict) -> None:
        """같은 subject_type 섹션의 fields를 기존 그룹에 병합한다."""
        for fk, fv in src_fields.items():
            groups[st].setdefault("fields", {})[fk] = fv

    def _explicit_required(fields: dict) -> set:
        return {k for k, v in fields.items() if v.get("required")}

    for test_id in test_ids:
        cfg = configs.get(test_id, {})
        sub_test_required = set(_derive_required_fields_for_test(test_id, test_configs or []))

        if cfg.get("sections"):
            # config에 명시된 required 필드 수집 (sub_test 파생 제외 대상)
            explicitly_required = {
                f for sec in cfg["sections"]
                for f in _explicit_required(sec.get("fields", {}))
            }
            remaining_sub_test = sub_test_required - explicitly_required

            for sec in cfg["sections"]:
                st = sec.get("subject_type", "self")
                src_fields = sec.get("fields", {})
                if st not in groups:
                    seen.append(st)
                    groups[st] = dict(sec)
                    groups[st]["fields"] = {k: dict(v) for k, v in src_fields.items()}
                    group_required[st] = set()
                else:
                    _merge_fields_into_group(st, src_fields)
                group_required[st].update(_explicit_required(src_fields))
                if st == "child":
                    group_required[st].update(remaining_sub_test)
        else:
            st = cfg.get("subject_type", "self")
            src_fields = cfg.get("fields", {})
            if st not in groups:
                seen.append(st)
                groups[st] = dict(cfg)
                groups[st]["fields"] = {k: dict(v) for k, v in src_fields.items()}
                group_required[st] = set()
            else:
                _merge_fields_into_group(st, src_fields)
            group_required[st].update(sub_test_required)
            group_required[st].update(_explicit_required(src_fields))

    profile_field_options = _collect_profile_field_options(test_configs or [])
    sections = [
        _build_profile_section(groups[st], group_required[st], profile_field_options)
        for st in seen
    ]

    result = sections[0] if len(sections) == 1 else {"subject_type": "mixed", "sections": sections}
    if optional_fields:
        result["optional_fields"] = optional_fields
    return result


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

    test_configs = load_custom_test_configs_from_restructure(db, custom_test_id=custom_test.id) or load_custom_test_configs(custom_test)
    if not test_configs:
        raise HTTPException(status_code=404, detail="검사 구성 정보를 찾을 수 없습니다.")

    additional_profile_fields = load_custom_test_profile_fields_from_restructure(db, custom_test_id=custom_test.id)
    payload = _build_custom_assessment_profile_meta(
        custom_test,
        test_configs,
        additional_profile_fields_override=additional_profile_fields or None,
    )
    payload["access_token"] = access_token
    payload["allow_unanswered_submission"] = bool(getattr(link, "allow_unanswered_submission", False))
    payload["show_report_result"] = bool(getattr(link, "show_report_result", True))
    payload["profile_config"] = _load_test_profile_config(db, payload.get("test_ids") or [], test_configs)
    test_type_selection = _test_type_selection_for_access_token(access_token)
    if test_type_selection is not None:
        payload["profile_config"] = _without_profile_field(payload.get("profile_config"), test_type_selection["field_key"])
        payload["test_type_selection"] = test_type_selection
    return payload

# access token으로 링크 조회, 내담자 매칭(단일/모호/없음) 처리 후 검사 문항 payload 반환
def validate_custom_test_profile_by_access_link(
    db: Session,
    access_token: str,
    profile: dict[str, Any],
    selected_client_id: int | None = None,
    responder_choice: str | None = None,
    allow_retake: bool = False,
    selected_test_type: str | None = None,
) -> dict:
    profile = _resolve_subject_profile(profile)

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

    scoped_selected_test_type = (
        selected_test_type
        if _test_type_selection_for_access_token(access_token) is not None
        else None
    )
    assessment_payload = build_custom_assessment_question_payload(
        custom_test,
        profile or {},
        db=db,
        selected_test_type=scoped_selected_test_type,
    )
    client_intake_mode = normalize_client_intake_mode(getattr(custom_test, "client_intake_mode", ""))

    is_ambiguous_match = False
    candidates: list = []

    if client_intake_mode == "pre_registered_only":
        # 링크 사전 등록 테이블 기반 매칭
        match_keys = _parse_json_list(getattr(link, "match_field_keys_json", '["name"]')) or ["name"]
        pre_entry = find_pre_registered_entry_by_match(
            db,
            access_link_id=link.id,
            match_keys=match_keys,
            profile=profile or {},
        )
        if pre_entry is None:
            _raise_assessment_error(403, "사전 등록되지 않은 내담자입니다. 담당자에게 문의하세요.")

        if pre_entry.provisional_client_id is not None:
            from app.repositories.client_repository import get_admin_client_by_id_and_admin
            client = get_admin_client_by_id_and_admin(
                db,
                client_id=pre_entry.provisional_client_id,
                admin_user_id=link.admin_user_id,
            )
            if client is None:
                # provisional client가 삭제된 경우 재생성
                client = create_provisional_client_and_assign_for_public_assessment(
                    db,
                    admin_user_id=link.admin_user_id,
                    custom_test_id=custom_test.id,
                    profile=profile or {},
                )
                update_pre_registered_provisional_client(db, entry_id=pre_entry.id, client_id=client.id)
                db.commit()
        else:
            client = create_provisional_client_and_assign_for_public_assessment(
                db,
                admin_user_id=link.admin_user_id,
                custom_test_id=custom_test.id,
                profile=profile or {},
            )
            update_pre_registered_provisional_client(db, entry_id=pre_entry.id, client_id=client.id)
            db.commit()
    else:
        # auto_create 모드: 기존 assignment 기반 매칭
        client, error_message, error_code, candidates = find_assigned_client_for_profile_with_code(
            db,
            admin_user_id=link.admin_user_id,
            custom_test_id=custom_test.id,
            profile=profile or {},
        )

        if client is None:
            if error_code == AMBIGUOUS_CLIENT_CODE:
                if responder_choice == "new":
                    client = create_provisional_client_and_assign_for_public_assessment(
                        db,
                        admin_user_id=link.admin_user_id,
                        custom_test_id=custom_test.id,
                        profile=profile or {},
                    )
                    is_ambiguous_match = True
                elif selected_client_id is not None:
                    selected = next((c for c in candidates if c.id == selected_client_id), None)
                    if selected is None:
                        _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")
                    client = selected
                    is_ambiguous_match = True
                else:
                    _raise_assessment_error(
                        403,
                        error_message,
                        AMBIGUOUS_CLIENT_CODE,
                        data={
                            "candidates": [
                                {
                                    "id": c.id,
                                    "name": c.name,
                                    "gender": c.gender,
                                    "birth_day": c.birth_day.isoformat() if c.birth_day else None,
                                }
                                for c in candidates
                            ]
                        },
                    )
            else:
                _raise_assessment_error(
                    403,
                    "기존 내담자 재사용 또는 신규 등록을 위해 확인이 필요합니다. 계속하면 현재 검사에 연결됩니다.",
                    AUTO_CREATE_CONFIRM_REQUIRED_CODE,
                )

    if not allow_retake:
        latest_submission = get_latest_submission_by_client_and_test(
            db,
            admin_user_id=link.admin_user_id,
            client_id=client.id,
            custom_test_id=custom_test.id,
        )
        if latest_submission is not None:
            submitted_at = latest_submission.created_at.isoformat() if latest_submission.created_at else ""
            _raise_assessment_error(
                409,
                "이미 완료된 검사 결과가 있습니다. 기존 결과를 보거나 다시 실시할 수 있습니다.",
                ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE,
                data={
                    "existing_submission": {
                        "submission_id": latest_submission.id,
                        "access_token": latest_submission.access_token,
                        "submitted_at": submitted_at,
                    }
                },
            )

    draft = get_assessment_draft(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client.id,
    )
    return {
        "message": "배정된 내담자 확인이 완료되었습니다.",
        "client_id": client.id,
        "is_ambiguous_match": is_ambiguous_match,
        "responder_choice": responder_choice if is_ambiguous_match else None,
        "candidate_client_ids": [c.id for c in candidates] if is_ambiguous_match else [],
        "assessment_payload": assessment_payload,
        "draft": _serialize_assessment_draft(draft) if draft is not None else None,
    }


def register_client_for_custom_test_by_access_link(
    db: Session,
    access_token: str,
    profile: dict[str, Any],
) -> dict:
    profile = _resolve_subject_profile(profile)

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
    if normalize_client_intake_mode(getattr(custom_test, "client_intake_mode", "")) != "auto_create":
        _raise_assessment_error(403, "이 검사는 자동 등록이 허용되지 않습니다.")

    client, created = register_client_and_assign_for_public_assessment(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=profile or {},
    )
    return {
        "message": "내담자 등록과 배정이 완료되었습니다." if created else "기존 내담자를 현재 검사에 배정했습니다.",
        "client_id": client.id,
        "created": created,
    }


def get_assessment_draft_by_access_link(
    db: Session,
    access_token: str,
    client_id: int,
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

    from app.repositories.client_repository import get_admin_client_by_id_and_admin, get_assignment_by_admin_client_and_test

    client = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=link.admin_user_id)
    if client is None:
        _raise_assessment_error(403, "내담자를 찾을 수 없습니다.")
    assignment = get_assignment_by_admin_client_and_test(db, link.admin_user_id, client_id, custom_test.id)
    if assignment is None:
        _raise_assessment_error(403, "이 검사에 배정된 내담자가 아닙니다.")

    draft = get_assessment_draft(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client_id,
    )
    return {"draft": _serialize_assessment_draft(draft) if draft is not None else None}


def save_assessment_draft_by_access_link(
    db: Session,
    access_token: str,
    *,
    profile: dict[str, Any],
    answers: dict[str, str],
    client_id: int,
    current_part_index: int,
    current_page: int,
    is_ambiguous_match: bool = False,
    responder_choice: str | None = None,
    candidate_client_ids: list[int] | None = None,
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

    from app.repositories.client_repository import get_admin_client_by_id_and_admin, get_assignment_by_admin_client_and_test

    client = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=link.admin_user_id)
    if client is None:
        _raise_assessment_error(403, "내담자를 찾을 수 없습니다.")
    assignment = get_assignment_by_admin_client_and_test(db, link.admin_user_id, client_id, custom_test.id)
    if assignment is None:
        _raise_assessment_error(403, "이 검사에 배정된 내담자가 아닙니다.")

    clean_profile = _clean_profile(profile)
    valid_item_ids = _valid_item_ids_for_profile(db, custom_test, clean_profile)
    if not valid_item_ids:
        raise HTTPException(status_code=400, detail="문항 데이터가 없습니다.")
    cleaned_answers = _clean_answers_for_items(answers, valid_item_ids)
    if responder_choice not in ("existing", "new"):
        responder_choice = None

    draft = upsert_assessment_draft(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client_id,
        access_token=access_token,
        profile_json=json.dumps(clean_profile, ensure_ascii=False),
        answers_json=json.dumps(cleaned_answers, ensure_ascii=False),
        current_part_index=max(0, int(current_part_index)),
        current_page=max(0, int(current_page)),
        is_ambiguous_match=is_ambiguous_match,
        responder_choice=responder_choice,
        candidate_client_ids_json=json.dumps(candidate_client_ids or [], ensure_ascii=False),
    )
    return {"message": "임시저장되었습니다.", "draft": _serialize_assessment_draft(draft)}


def _register_secondary_clients_and_relations(
    db: Session,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
    primary_client,
) -> None:
    """보조 대상자(부모, 선생 등)를 내담자로 등록하고 primary_client와 relation을 생성한다.
    보조 대상자도 같은 검사에 배정 처리한다 (배정 상태 = 실시됨으로 표시).
    """
    from app.repositories.base_repository import commit
    from app.repositories.client_repository import find_admin_client_by_identity
    from app.services.admin.clients import assign_client_to_test

    # primary role 판별: child_ 접두사 키가 있으면 "child", 없으면 "self"
    has_child_prefix = any(k.startswith("child_") for k in profile)
    primary_role = "child" if has_child_prefix else "self"

    secondary_subjects = _extract_secondary_subjects(profile)
    if not secondary_subjects:
        return

    for role, subject_profile in secondary_subjects:
        try:
            normalized_gender = normalize_gender_value(subject_profile["gender"])
        except ValueError:
            continue

        birth_day_text = subject_profile.get("birth_day", "").strip()
        try:
            birth_day_value = date.fromisoformat(birth_day_text) if birth_day_text else None
        except ValueError:
            continue

        secondary_client = find_admin_client_by_identity(
            db,
            admin_user_id=admin_user_id,
            name=subject_profile["name"],
            gender=normalized_gender,
            birth_day=birth_day_value,
        )
        if secondary_client is None:
            from app.repositories.client_repository import create_admin_client
            secondary_client = create_admin_client(
                db,
                admin_user_id=admin_user_id,
                name=subject_profile["name"],
                gender=normalized_gender,
                birth_day=birth_day_value,
                memo="검사 링크에서 자동 등록 (보조 대상자)",
                created_source="assessment_link_secondary",
            )
            db.flush()

        # 같은 검사에 배정 처리 (이미 배정되어 있으면 무시)
        assign_client_to_test(
            db,
            admin_id=admin_user_id,
            client_id=secondary_client.id,
            custom_test_id=custom_test_id,
        )

        # 실시 완료 로그 기록 (마지막 실시일 + 실시완료 상태)
        from app.repositories.assessment_repository import create_assessment_log
        create_assessment_log(
            db,
            admin_user_id=admin_user_id,
            client_id=secondary_client.id,
            assessed_on=date.today(),
        )

        create_client_relation(
            db,
            admin_user_id=admin_user_id,
            client_id_a=primary_client.id,
            role_a=primary_role,
            client_id_b=secondary_client.id,
            role_b=role,
        )

    commit(db)


def submit_custom_test_by_access_link(
    db: Session,
    access_token: str,
    responder_name: str,
    profile: dict[str, Any],
    answers: dict[str, str],
    client_id: int | None = None,
    is_ambiguous_match: bool = False,
    responder_choice: str | None = None,
    candidate_client_ids: list[int] | None = None,
) -> dict:
    from app.services.scoring.submissions import score_submission_by_id

    profile = _resolve_subject_profile(profile)

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

    clean_profile = _clean_profile(profile)

    assessment_payload = build_custom_assessment_question_payload(custom_test, clean_profile, db=db)
    valid_item_ids = {
        str(item.get("id", "")).strip()
        for item in assessment_payload["items"]
        if str(item.get("id", "")).strip()
    }
    if not valid_item_ids:
        raise HTTPException(status_code=400, detail="문항 데이터가 없습니다.")

    cleaned_answers = _clean_answers_for_items(answers, valid_item_ids)
    allow_unanswered_submission = bool(getattr(link, "allow_unanswered_submission", False))

    if not allow_unanswered_submission and len(cleaned_answers) != len(valid_item_ids):
        raise HTTPException(status_code=400, detail="모든 문항에 응답해주세요.")

    if client_id is not None:
        # validate-profile에서 동명이인 모달로 선택한 client_id 검증
        from app.repositories.client_repository import get_admin_client_by_id_and_admin, get_assignment_by_admin_client_and_test
        client_row = get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=link.admin_user_id)
        if client_row is None:
            _raise_assessment_error(403, "선택한 내담자를 찾을 수 없습니다.")
        assignment = get_assignment_by_admin_client_and_test(db, link.admin_user_id, client_id, custom_test.id)
        if assignment is None:
            _raise_assessment_error(403, "이 검사에 배정된 내담자가 아닙니다.")
        if is_ambiguous_match and responder_choice == "existing" and client_id not in set(candidate_client_ids or []):
            _raise_assessment_error(403, "선택한 내담자 정보가 일치하지 않습니다.")
        if normalize_client_intake_mode(getattr(custom_test, "client_intake_mode", "")) != "pre_registered_only":
            _validate_selected_client_matches_profile(client_row, clean_profile)
        client = client_row
    else:
        client, error_message, error_code, candidates = find_assigned_client_for_profile_with_code(
            db,
            admin_user_id=link.admin_user_id,
            custom_test_id=custom_test.id,
            profile=clean_profile,
        )
        if client is None:
            if error_code == AMBIGUOUS_CLIENT_CODE:
                _raise_assessment_error(403, "내담자를 특정할 수 없습니다. 인적사항 확인을 다시 진행해주세요.", AMBIGUOUS_CLIENT_CODE)
            _raise_assessment_error(403, error_message or "배정된 내담자를 확인할 수 없습니다.")

    profile_name = str(clean_profile.get("name", "")).strip()
    final_responder_name = profile_name or responder_name.strip()

    report_access_token = _generate_submission_report_token(db)
    submission = create_submission(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client.id,
        access_token=report_access_token,
        responder_name=final_responder_name,
        answers_json=json.dumps(
            {
                "profile": clean_profile,
                "answers": _build_structured_answers(
                    raw_answers=cleaned_answers,
                    assessment_items=assessment_payload["items"],
                    include_unanswered=allow_unanswered_submission,
                ),
            },
            ensure_ascii=False,
        ),
    )
    create_submission_custom_test_snapshot(
        db,
        submission=submission,
        custom_test=custom_test,
        assessment_payload=assessment_payload,
    )
    db.commit()

    scoring_result = score_submission_by_id(
        db,
        admin_user_id=link.admin_user_id,
        submission_id=submission.id,
    )

    create_assessment_log(
        db,
        admin_user_id=link.admin_user_id,
        client_id=client.id,
        assessed_on=date.today(),
    )

    delete_assessment_draft(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client.id,
    )

    if is_ambiguous_match and responder_choice in ("existing", "new"):
        from app.repositories.identity_review_repository import (
            create_identity_review,
            link_review_submission,
        )
        from app.repositories.base_repository import commit as _commit

        chosen_client_id = client.id if responder_choice == "existing" else None
        provisional_client_id = client.id if responder_choice == "new" else None
        review = create_identity_review(
            db,
            admin_user_id=link.admin_user_id,
            admin_custom_test_id=custom_test.id,
            access_token=access_token,
            input_profile_json=json.dumps(clean_profile, ensure_ascii=False),
            candidate_client_ids_json=json.dumps(candidate_client_ids or [], ensure_ascii=False),
            responder_choice=responder_choice,
            chosen_client_id=chosen_client_id,
            provisional_client_id=provisional_client_id,
        )
        link_review_submission(db, review, submission.id)
        _commit(db)

    # 보조 대상자(부모, 선생 등) 클라이언트 등록 + relation 생성
    _register_secondary_clients_and_relations(db, link.admin_user_id, custom_test.id, clean_profile, client)

    return {
        "message": "검사가 제출되었습니다.",
        "submitted_item_count": len(cleaned_answers),
        "submission_id": submission.id,
        "access_token": submission.access_token if bool(getattr(link, "show_report_result", True)) else None,
        "show_report_result": bool(getattr(link, "show_report_result", True)),
        "scoring_result_id": scoring_result.get("scoring_result_id"),
        "scoring_status": scoring_result.get("status"),
    }


def get_consent_info_by_token(db: Session, access_token: str) -> dict:
    """수검자용: 해당 검사의 동의 필요 여부와 동의서 텍스트 반환."""
    from app.repositories.custom_test_repository import get_active_access_link_by_token, get_custom_test_by_id
    link = get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")
    custom_test = get_custom_test_by_id(db, link.admin_custom_test_id)
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")
    requires_consent = bool(getattr(custom_test, "requires_consent", False))
    requires_security_notice = bool(getattr(custom_test, "requires_security_notice", False))
    consent_text = ""
    security_notice_text = ""
    if requires_consent:
        custom_consent_text = str(getattr(custom_test, "consent_text", "") or "").strip()
        if custom_consent_text:
            consent_text = custom_consent_text
        else:
            settings = db.query(AdminSettings).filter(AdminSettings.admin_user_id == link.admin_user_id).first()
            consent_text = settings.consent_text if settings else ""
    if requires_security_notice:
        settings = db.query(AdminSettings).filter(AdminSettings.admin_user_id == link.admin_user_id).first()
        security_notice_text = settings.security_notice_text if settings else ""
    return {
        "requires_consent": requires_consent,
        "consent_text": consent_text,
        "requires_security_notice": requires_security_notice,
        "security_notice_text": security_notice_text,
    }


def submit_consent_by_token(db: Session, access_token: str, client_id: int, consented: bool) -> dict:
    """수검자용: 동의 기록 저장."""
    from app.repositories.custom_test_repository import get_active_access_link_by_token, get_custom_test_by_id
    link = get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")
    custom_test = get_custom_test_by_id(db, link.admin_custom_test_id)
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")
    record = ClientConsentRecord(
        admin_user_id=link.admin_user_id,
        admin_client_id=client_id,
        admin_custom_test_id=custom_test.id,
        consented=consented,
        consented_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    return {"message": "동의 기록이 저장되었습니다.", "consented": consented}


# ── 관리자: 링크 사전 등록 내담자 관리 ────────────────────────────────────────

def _get_link_and_verify_admin(db: Session, admin_session: str | None, access_token: str):
    admin = get_current_admin(db, admin_session)
    link = get_active_access_link_by_token(db, access_token)
    if link is None or link.admin_user_id != admin.id:
        raise HTTPException(status_code=404, detail="링크를 찾을 수 없습니다.")
    return admin, link


_BASE_FIELD_LABELS: dict[str, str] = {
    "name": "이름",
    "gender": "성별",
    "birth_day": "생년월일",
    "phone": "휴대폰 번호",
    "school_age_range": "학령",
    "informant": "관찰자",
}

_FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("이름", "성명", "내담자명", "수검자명", "name"),
    "gender": ("성별", "gender"),
    "birth_day": ("생년월일", "생일", "출생일", "birth_day", "birth", "birthday"),
    "phone": ("휴대폰 번호", "휴대폰번호", "휴대전화", "핸드폰", "핸드폰 번호", "전화번호", "연락처", "phone"),
}


def _normalize_header_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "").replace("_", "").replace("-", "")


def _profile_field_lookup(available_fields: list[dict], match_keys: list[str] | None = None) -> dict[str, str]:
    lookup: dict[str, str] = {}

    def add(alias: Any, key: str, *, override: bool = False) -> None:
        normalized = _normalize_header_key(alias)
        if normalized:
            if override:
                lookup[normalized] = key
            else:
                lookup.setdefault(normalized, key)

    for key, aliases in _FIELD_ALIASES.items():
        add(key, key)
        add(_BASE_FIELD_LABELS.get(key, ""), key)
        for alias in aliases:
            add(alias, key)

    for field in available_fields:
        key = str(field.get("key", "")).strip()
        if not key:
            continue
        add(key, key, override=True)
        add(field.get("label", ""), key, override=True)
        add(_BASE_FIELD_LABELS.get(key, ""), key, override=True)
        for alias in _FIELD_ALIASES.get(key, ()):
            add(alias, key, override=True)

    for key in match_keys or []:
        key = str(key).strip()
        if not key:
            continue
        add(key, key, override=True)
        add(_BASE_FIELD_LABELS.get(key, ""), key, override=True)
        for alias in _FIELD_ALIASES.get(key, ()):
            add(alias, key, override=True)
    return lookup


def _normalize_pre_registered_profile_data(
    raw_profile_data: dict[str, Any],
    *,
    available_fields: list[dict],
    match_keys: list[str] | None = None,
) -> dict[str, str]:
    lookup = _profile_field_lookup(available_fields, match_keys)
    normalized: dict[str, str] = {}
    extras: dict[str, str] = {}

    for raw_key, raw_value in (raw_profile_data or {}).items():
        value = str(raw_value or "").strip()
        if value == "":
            continue
        key = lookup.get(_normalize_header_key(raw_key))
        if key:
            normalized[key] = value
        else:
            extras[str(raw_key).strip()] = value

    for key, value in extras.items():
        normalized.setdefault(key, value)
    return normalized


def _match_key_labels(match_keys: list[str], available_fields: list[dict]) -> dict[str, str]:
    labels = {str(field.get("key", "")): str(field.get("label") or field.get("key") or "") for field in available_fields}
    return {key: labels.get(key) or _BASE_FIELD_LABELS.get(key) or key for key in match_keys}


def _format_match_key_values(profile_data: dict[str, Any], match_keys: list[str], match_labels: dict[str, str]) -> str:
    values: list[str] = []
    for key in match_keys:
        value = str(profile_data.get(key, "")).strip()
        if value:
            values.append(f"{match_labels.get(key, key)}={value}")
    return ", ".join(values)


def _available_profile_fields_for_link(
    db: Session,
    custom_test: AdminCustomTest,
    test_configs: list,
) -> list[dict]:
    """링크에서 수집하는 전체 프로필 필드 목록을 {key, label} 형태로 반환한다.
    test_profile_config 테이블 + additional_profile_fields_json 모두 포함한다."""
    seen: set[str] = set()
    fields: list[dict] = []

    def _add(key: str, label: str) -> None:
        if key not in seen:
            seen.add(key)
            fields.append({"key": key, "label": label or key})

    # 1. test_profile_config 테이블에서 각 test_id의 essential/optional 필드 로드
    test_ids, _ = summarize_custom_test_ids(test_configs, custom_test.test_id)
    if test_ids:
        placeholders = ",".join(f":id{i}" for i in range(len(test_ids)))
        params = {f"id{i}": tid for i, tid in enumerate(test_ids)}
        rows = db.execute(
            text(f"SELECT essential_profile_json, optional_profile_json FROM test_profile_config WHERE test_id IN ({placeholders})"),
            params,
        ).fetchall()
        for row in rows:
            for raw_json in (row[0], row[1]):
                if not raw_json:
                    continue
                try:
                    cfg = json.loads(raw_json)
                except Exception:
                    continue
                # sections 형태
                for sec in cfg.get("sections", []):
                    for fk, fv in (sec.get("fields") or {}).items():
                        label = (fv.get("label") if isinstance(fv, dict) else None) or _BASE_FIELD_LABELS.get(fk, fk)
                        _add(fk, label)
                # flat fields 형태
                for fk, fv in (cfg.get("fields") or {}).items():
                    label = (fv.get("label") if isinstance(fv, dict) else None) or _BASE_FIELD_LABELS.get(fk, fk)
                    _add(fk, label)

    # 2. _required_profile_fields_for_variants 기반 기본 필드 보완 (test_profile_config 없는 경우 대비)
    required_keys = set(_required_profile_fields_for_variants(test_configs))
    for key in ["name", "gender", "birth_day", "phone", "school_age_range", "informant"]:
        if key == "name" or key in required_keys:
            _add(key, _BASE_FIELD_LABELS.get(key, key))

    # 3. additional_profile_fields_json (관리자가 직접 추가한 필드)
    raw = json.loads(getattr(custom_test, "additional_profile_fields_json", "[]") or "[]")
    for f in normalize_additional_profile_fields(raw):
        label = f.get("label", "")
        if label:
            _add(label, label)

    return fields


def list_pre_registered_clients_for_link(
    db: Session,
    admin_session: str | None,
    access_token: str,
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    match_keys = _parse_json_list(getattr(link, "match_field_keys_json", '["name"]')) or ["name"]
    entries = get_pre_registered_entries_by_link(db, link.id)
    custom_test = get_custom_test_by_id_and_admin(
        db, custom_test_id=link.admin_custom_test_id, admin_user_id=link.admin_user_id
    )
    test_configs = load_custom_test_configs(custom_test) if custom_test else []
    available_fields = _available_profile_fields_for_link(db, custom_test, test_configs) if custom_test else [{"key": "name", "label": "이름"}]
    return {
        "match_field_keys": match_keys,
        "available_profile_fields": available_fields,
        "entries": [
            {
                "id": e.id,
                "profile_data": json.loads(e.profile_data_json or "{}"),
                "has_provisional_client": e.provisional_client_id is not None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


def add_pre_registered_client_for_link(
    db: Session,
    admin_session: str | None,
    access_token: str,
    profile_data: dict[str, Any],
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    match_keys = _parse_json_list(getattr(link, "match_field_keys_json", '["name"]')) or ["name"]
    custom_test = get_custom_test_by_id_and_admin(
        db, custom_test_id=link.admin_custom_test_id, admin_user_id=link.admin_user_id
    )
    test_configs = load_custom_test_configs(custom_test) if custom_test else []
    available_fields = _available_profile_fields_for_link(db, custom_test, test_configs) if custom_test else [{"key": "name", "label": "이름"}]
    profile_data = _normalize_pre_registered_profile_data(
        profile_data,
        available_fields=available_fields,
        match_keys=match_keys,
    )
    match_labels = _match_key_labels(match_keys, available_fields)

    # match key 값이 모두 있어야 등록 가능
    for key in match_keys:
        if not str(profile_data.get(key, "")).strip():
            raise HTTPException(status_code=422, detail=f"'{match_labels.get(key, key)}' 필드가 비어 있습니다.")

    # 중복 확인
    existing = find_pre_registered_entry_by_match(
        db,
        access_link_id=link.id,
        match_keys=match_keys,
        profile=profile_data,
    )
    if existing is not None:
        matched_values = _format_match_key_values(profile_data, match_keys, match_labels)
        detail = f"이미 등록된 내담자입니다. ({matched_values})" if matched_values else "이미 등록된 내담자입니다."
        raise HTTPException(status_code=409, detail=detail)

    entry = create_pre_registered_entry(
        db,
        access_link_id=link.id,
        admin_user_id=admin.id,
        profile_data_json=json.dumps(profile_data, ensure_ascii=False),
    )
    db.commit()
    return {
        "message": "사전 등록이 완료되었습니다.",
        "entry": {
            "id": entry.id,
            "profile_data": profile_data,
            "has_provisional_client": False,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        },
    }


def remove_pre_registered_client_for_link(
    db: Session,
    admin_session: str | None,
    access_token: str,
    entry_id: int,
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    deleted = delete_pre_registered_entry(db, entry_id=entry_id, admin_user_id=admin.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="등록 정보를 찾을 수 없습니다.")
    db.commit()
    return {"message": "삭제되었습니다."}


def update_link_match_field_keys(
    db: Session,
    admin_session: str | None,
    access_token: str,
    match_field_keys: list[str],
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    if not match_field_keys:
        raise HTTPException(status_code=422, detail="확인 기준 필드를 하나 이상 선택해야 합니다.")
    link.match_field_keys_json = json.dumps(match_field_keys, ensure_ascii=False)
    db.commit()
    return {"message": "확인 기준 필드가 저장되었습니다.", "match_field_keys": match_field_keys}


def update_link_response_options(
    db: Session,
    admin_session: str | None,
    access_token: str,
    *,
    allow_unanswered_submission: bool,
    show_report_result: bool,
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    link.allow_unanswered_submission = bool(allow_unanswered_submission)
    link.show_report_result = bool(show_report_result)
    db.commit()
    return {
        "message": "실시 링크 응답 옵션이 저장되었습니다.",
        "allow_unanswered_submission": bool(link.allow_unanswered_submission),
        "show_report_result": bool(link.show_report_result),
    }


def bulk_add_pre_registered_clients_for_link(
    db: Session,
    admin_session: str | None,
    access_token: str,
    rows: list[dict[str, Any]],
) -> dict:
    admin, link = _get_link_and_verify_admin(db, admin_session, access_token)
    match_keys = _parse_json_list(getattr(link, "match_field_keys_json", '["name"]')) or ["name"]
    custom_test = get_custom_test_by_id_and_admin(
        db, custom_test_id=link.admin_custom_test_id, admin_user_id=link.admin_user_id
    )
    test_configs = load_custom_test_configs(custom_test) if custom_test else []
    available_fields = _available_profile_fields_for_link(db, custom_test, test_configs) if custom_test else [{"key": "name", "label": "이름"}]
    match_labels = _match_key_labels(match_keys, available_fields)

    added = 0
    skipped = 0
    errors: list[str] = []

    for i, raw_profile_data in enumerate(rows, start=1):
        profile_data = _normalize_pre_registered_profile_data(
            raw_profile_data,
            available_fields=available_fields,
            match_keys=match_keys,
        )
        # match key 값 검사
        missing = [k for k in match_keys if not str(profile_data.get(k, "")).strip()]
        if missing:
            missing_labels = [match_labels.get(k, k) for k in missing]
            errors.append(f"{i}행: '{', '.join(missing_labels)}' 필드가 비어 있습니다.")
            skipped += 1
            continue

        # 중복 확인
        existing = find_pre_registered_entry_by_match(
            db, access_link_id=link.id, match_keys=match_keys, profile=profile_data
        )
        if existing is not None:
            matched_values = _format_match_key_values(profile_data, match_keys, match_labels)
            errors.append(f"{i}행: 이미 등록된 내담자입니다. ({matched_values})" if matched_values else f"{i}행: 이미 등록된 내담자입니다.")
            skipped += 1
            continue

        create_pre_registered_entry(
            db,
            access_link_id=link.id,
            admin_user_id=admin.id,
            profile_data_json=json.dumps(profile_data, ensure_ascii=False),
        )
        added += 1

    db.commit()
    return {"message": f"{added}명 등록, {skipped}명 건너뜀", "added": added, "skipped": skipped, "errors": errors}
