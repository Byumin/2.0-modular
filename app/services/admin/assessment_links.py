import json
import secrets
from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AdminCustomTest
from app.repositories.assessment_repository import create_assessment_log
from app.repositories.custom_test_repository import (
    create_access_link,
    create_submission,
    get_active_access_link_by_admin_and_test,
    get_active_access_link_by_token,
    get_custom_test_by_id_and_admin,
)
from app.repositories.parent_test_repository import fetch_parent_item_bundle
from app.services.admin.auth import get_current_admin
from app.services.admin.clients import (
    AUTO_CREATE_CONFIRM_REQUIRED_CODE,
    find_assigned_client_for_profile,
    find_assigned_client_for_profile_with_code,
    register_client_and_assign_for_public_assessment,
)
from app.services.admin.common import (
    _derive_required_profile_fields,
    _normalize_item_map,
    _parse_response_options,
    flatten_custom_test_variant_configs,
    load_custom_test_configs,
    normalize_client_intake_mode,
    normalize_additional_profile_fields,
    summarize_custom_test_ids,
)


def _safe_parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _raise_assessment_error(status_code: int, message: str, code: str | None = None) -> None:
    detail: dict[str, Any] = {"message": message}
    if code:
        detail["code"] = code
    raise HTTPException(status_code=status_code, detail=detail)


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

def _select_sub_test_variant_for_profile(variants: list[dict], profile: dict[str, Any]) -> dict:
    if not variants:
        raise HTTPException(status_code=400, detail="실시 가능한 검사 구간이 없습니다.")

    # variants가 리스트 안에 딕셔너리들이 있는 형태
    # 리스트의 딕셔너리 원소들을 sub_test_json을 키로 하고 딕셔너리 원소 전체를 값으로 하는 딕셔너리로 변환
    variant_by_json = {item["sub_test_json"]: item for item in variants if item.get("sub_test_json")}
    variant_jsons = list(variant_by_json.keys()) # sub_test_json 문자열들의 리스트
    # sub_test_json 문자열들 중에서 프로필과 일치하는 것들만 뽑아서 리스트로 만듦
    matches = [sub_test_json for sub_test_json in variant_jsons if _profile_matches_sub_test(profile, sub_test_json)]
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

# custom_test_row의 test_configs에서 profile과 일치하는 검사 구간을 찾아서,
# 해당 검사 구간에 맞는 문항 화면 payload를 반환
def _build_custom_assessment_profile_meta(custom_test_row: AdminCustomTest, test_configs: list[dict]) -> dict:
    test_ids, test_id_text = summarize_custom_test_ids(test_configs, custom_test_row.test_id)
    raw_additional_payload = json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
    additional_profile_fields = normalize_additional_profile_fields(raw_additional_payload) # 커스텀 검사의 생성한 추가 인적사항 필드 정규화
    return {
        "custom_test_id": custom_test_row.id,
        "custom_test_name": custom_test_row.custom_test_name,
        "client_intake_mode": normalize_client_intake_mode(getattr(custom_test_row, "client_intake_mode", "")),
        "test_id": test_id_text or custom_test_row.test_id,
        "test_ids": test_ids,
        "display_name": custom_test_row.custom_test_name,
        "required_profile_fields": _required_profile_fields_for_variants(test_configs),
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

def _resolve_active_variants(test_configs: list[dict], profile: dict[str, Any]) -> list[dict]:
    resolved: list[dict] = []
    for config in test_configs:
        test_id = str(config.get("test_id", "")).strip()
        variants = config.get("sub_test_variants", [])
        if not test_id or not variants:
            continue
        active_variant = _select_sub_test_variant_for_profile(variants, profile or {})
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
                    row_text = str(outer_value.get(row_key, "") or "").strip()
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
            value_text = str(outer_value or "").strip()
            if not value_text:
                continue
            item_map[outer_key_text] = value_text
        return item_map, matrix_row_meta

    return _normalize_item_map(item_json), matrix_row_meta


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


def _resolve_scale_item_ids(scale_struct: dict, selected_codes: set[str]) -> dict[str, list[str]]:
    resolved: dict[str, list[str]] = {}
    for code, raw_scale in scale_struct.items():
        code_text = str(code)
        if selected_codes and code_text not in selected_codes:
            continue
        item_ids = sorted(
            _collect_choice_score_item_ids(raw_scale),
            key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
        )
        if item_ids:
            resolved[code_text] = item_ids
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
    for answer_key, raw_value in (raw_answers or {}).items():
        key = str(answer_key).strip()
        meta = item_meta_by_id.get(key)
        if meta is None:
            continue
        group_key = (meta["test_id"], meta["sub_test_json"])
        grouped_items.setdefault(group_key, []).append(
            {
                "order": int(meta["order"]),
                "parent_item_id": meta["parent_item_id"],
                "answer_value": str(raw_value),
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
    for code, item_ids in resolved_scale_item_ids.items():
        raw_scale = scale_struct.get(code, {}) if isinstance(scale_struct, dict) else {}
        selected_item_ids.update(item_ids)
        selected_scales.append(
            {
                "test_id": test_id,
                "sub_test_json": sub_test_json,
                "code": code,
                "name": str(raw_scale.get("name", code)) if isinstance(raw_scale, dict) else code,
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
def build_custom_assessment_question_payload(custom_test_row: AdminCustomTest, profile: dict[str, Any]) -> dict:
    test_configs = load_custom_test_configs(custom_test_row)
    if not test_configs:
        raise HTTPException(status_code=404, detail="검사 구성 정보를 찾을 수 없습니다.")

    base_payload = _build_custom_assessment_profile_meta(custom_test_row, test_configs)
    resolved_variants = _resolve_active_variants(test_configs, profile or {})

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
        )
        all_items.extend(part_items)
        selected_scales.extend(variant_scales)
        selected_sub_tests.append(selected_sub_test)

    if not all_items:
        raise HTTPException(status_code=400, detail="표시할 문항이 없습니다.")

    parts = _assemble_parts(parts_buffer)
    primary_sub_test_json = selected_sub_tests[0]["sub_test_json"] if selected_sub_tests else custom_test_row.sub_test_json
    return {
        **base_payload,
        "sub_test_json": primary_sub_test_json,
        "selected_scale_codes": sorted({scale["code"] for scale in selected_scales}),
        "selected_scales": selected_scales,
        "items": all_items,
        "item_count": len(all_items),
        "response_options": parts[0]["response_options"] if parts else [],
        "selected_sub_tests": selected_sub_tests,
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
        )

    return {
        "custom_test_id": custom_test.id,
        "custom_test_name": custom_test.custom_test_name,
        "access_token": link.access_token,
        "assessment_url": f"/assessment/custom/{link.access_token}",
    }

# access token으로 링크 조회, 해당 링크의 custom_test row 조회, 인적사항 화면 payload 반환
def get_custom_test_by_access_link(db: Session, access_token: str) -> dict:
    link = get_active_access_link_by_token(db, access_token) # access token으로 링크 조회
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = get_custom_test_by_id_and_admin( # 해당 링크의 custom_test row 조회
        db,
        custom_test_id=link.admin_custom_test_id, # 링크의 custom_test_id
        admin_user_id=link.admin_user_id, # 링크의 admin_user_id(생성한 사람)
    ) # child_test 테이블에서 row 반환
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    payload = build_custom_assessment_profile_payload(custom_test) # 인적사항 입력 화면용 payload 빌드
    payload["access_token"] = access_token # 응답에 access_token 포함
    return payload

# access token으로 링크 조회, 해당 링크의 custom_test row 조회, 인적사항과 일치하는 검사 구간 확인, 검사 문항 화면 payload 반환
def validate_custom_test_profile_by_access_link(db: Session, access_token: str, profile: dict[str, Any]) -> dict:
    link = get_active_access_link_by_token(db, access_token) # access token으로 링크 조회
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = get_custom_test_by_id_and_admin( # 해당 링크의 custom_test row 조회
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    client_intake_mode = normalize_client_intake_mode(getattr(custom_test, "client_intake_mode", ""))
    if client_intake_mode == "pre_registered_only":
        _, error_message, error_code = find_assigned_client_for_profile_with_code( # 입력한 인적사항과 배정된 내담자 확인 + 값 검증
            db,
            admin_user_id=link.admin_user_id,
            custom_test_id=custom_test.id,
            profile=profile or {},
        )
        if error_message:
            _raise_assessment_error(403, error_message, error_code)
    else:
        client, _, _ = find_assigned_client_for_profile_with_code(
            db,
            admin_user_id=link.admin_user_id,
            custom_test_id=custom_test.id,
            profile=profile or {},
        )
        if client is None:
            _raise_assessment_error(
                403,
                "기존 내담자 재사용 또는 신규 등록을 위해 확인이 필요합니다. 계속하면 현재 검사에 연결됩니다.",
                AUTO_CREATE_CONFIRM_REQUIRED_CODE,
            )

    assessment_payload = build_custom_assessment_question_payload(custom_test, profile or {})
    return {
        "message": "배정된 내담자 확인이 완료되었습니다.",
        "assessment_payload": assessment_payload,
    }


def register_client_for_custom_test_by_access_link(
    db: Session,
    access_token: str,
    profile: dict[str, Any],
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


def submit_custom_test_by_access_link(
    db: Session,
    access_token: str,
    responder_name: str,
    profile: dict[str, Any],
    answers: dict[str, str],
) -> dict:
    from app.services.scoring.submissions import score_submission_by_id

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

    assessment_payload = build_custom_assessment_question_payload(custom_test, clean_profile)
    valid_item_ids = {
        str(item.get("id", "")).strip()
        for item in assessment_payload["items"]
        if str(item.get("id", "")).strip()
    }
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

    client, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=clean_profile,
    )
    if error_message or client is None:
        _raise_assessment_error(403, error_message or "배정된 내담자를 확인할 수 없습니다.")

    profile_name = str(clean_profile.get("name", "")).strip()
    final_responder_name = profile_name or responder_name.strip()

    submission = create_submission(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        client_id=client.id,
        access_token=access_token,
        responder_name=final_responder_name,
        answers_json=json.dumps(
            {
                "profile": clean_profile,
                "answers": _build_structured_answers(
                    raw_answers=cleaned_answers,
                    assessment_items=assessment_payload["items"],
                ),
            },
            ensure_ascii=False,
        ),
    )

    scoring_result = score_submission_by_id(
        db,
        admin_user_id=link.admin_user_id,
        submission_id=submission.id,
    )

    if client.id is not None:
        create_assessment_log(
            db,
            admin_user_id=link.admin_user_id,
            client_id=client.id,
            assessed_on=date.today(),
        )

    return {
        "message": "검사가 제출되었습니다.",
        "submitted_item_count": len(cleaned_answers),
        "submission_id": submission.id,
        "scoring_result_id": scoring_result.get("scoring_result_id"),
        "scoring_status": scoring_result.get("status"),
    }
