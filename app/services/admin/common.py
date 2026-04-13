import json
from typing import Any

from app.db.models import AdminClient, AdminCustomTest
from app.repositories.custom_test_repository import (
    get_assessed_counts_by_admin,
    get_assignment_counts_by_admin,
    list_custom_tests_by_admin,
)

CLIENT_INTAKE_MODES = {
    "pre_registered_only",
    "auto_create",
}

CLIENT_CREATED_SOURCES = {
    "admin_manual",
    "assessment_link_auto",
    "assessment_link_provisional",
}


def normalize_client_intake_mode(value: Any, default: str = "pre_registered_only") -> str:
    text = str(value or "").strip()
    if text in CLIENT_INTAKE_MODES:
        return text
    return default


def serialize_admin_client(row: AdminClient) -> dict:
    created_source = str(getattr(row, "created_source", "")).strip()
    if created_source not in CLIENT_CREATED_SOURCES:
        created_source = "admin_manual"
    return {
        "id": row.id,
        "name": row.name,
        "gender": row.gender,
        "birth_day": row.birth_day.isoformat() if row.birth_day else None,
        "memo": row.memo,
        "created_source": created_source,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def derive_progress_status(assigned_count: int, assessed_count: int) -> str:
    if assigned_count <= 0:
        return "대기"
    if assessed_count <= 0:
        return "대기"
    if assessed_count < assigned_count:
        return "실시"
    return "종료"


def _sort_item_texts(item_json: dict | list | str) -> list[str]:
    if isinstance(item_json, dict):

        def sort_key(key: str) -> tuple[int, str]:
            return (0, f"{int(key):08d}") if str(key).isdigit() else (1, str(key))

        return [str(v) for _, v in sorted(item_json.items(), key=lambda kv: sort_key(str(kv[0])))]
    if isinstance(item_json, list):
        return [str(v) for v in item_json]
    if isinstance(item_json, str):
        return [item_json]
    return []


def _normalize_item_map(item_json: dict | list | str) -> dict[str, str]:
    if isinstance(item_json, dict):
        return {str(k): str(v) for k, v in item_json.items()}
    if isinstance(item_json, list):
        return {str(i + 1): str(v) for i, v in enumerate(item_json)}
    if isinstance(item_json, str):
        return {"1": item_json}
    return {}


def _parse_response_options(item_template: str | None) -> list[dict]:
    if not item_template:
        return []
    try:
        parsed = json.loads(item_template)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict) or not parsed:
        return []

    options_map: dict[str, str] = {}
    for item_options in parsed.values():
        if not isinstance(item_options, dict):
            continue
        for value, label in item_options.items():
            value_text = str(value)
            if value_text in options_map:
                continue
            options_map[value_text] = str(label)

    if not options_map:
        return []

    options = []
    for value, label in options_map.items():
        options.append({"value": value, "label": label})
    options.sort(key=lambda x: (0, int(x["value"])) if x["value"].isdigit() else (1, x["value"]))
    return options


def _derive_required_profile_fields(sub_test_json: str) -> list[str]:
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        parsed = {}

    required: list[str] = []
    if isinstance(parsed.get("gender"), list) and parsed.get("gender"):
        required.append("gender")
    if isinstance(parsed.get("age_range"), dict):
        required.append("birth_day")

    school_raw = (
        parsed.get("school_ages")
        or parsed.get("school_age")
        or parsed.get("school_grades")
        or parsed.get("school_grade")
        or parsed.get("grades")
        or parsed.get("grade")
        or parsed.get("school_age_range")
    )
    if (isinstance(school_raw, dict) and school_raw) or (isinstance(school_raw, str) and school_raw.strip()):
        required.append("school_age")
    return required

# 추가 프로필 필드의 라벨이 문자열이 아닌 경우나, 옵션이 리스트가 아닌 경우 등 다양한 형태의 입력에 대해 최대한 유연하게 처리하여, 관리자 페이지에서 추가 프로필 필드를 설정할 때 발생할 수 있는 오류를 최소화한다.
def normalize_additional_profile_fields(raw: Any) -> list[dict]:
    if isinstance(raw, dict):
        raw = raw.get("fields", [])

    normalized: list[dict] = []
    seen_labels: set[str] = set()
    if not isinstance(raw, list):
        return normalized

    for item in raw:
        if isinstance(item, str):
            label = item.strip()
            if not label:
                continue
            key = label.casefold()
            if key in seen_labels:
                continue
            seen_labels.add(key)
            normalized.append(
                {
                    "label": label,
                    "type": "short_text",
                    "required": False,
                    "placeholder": "",
                    "options": [],
                }
            )
            continue

        if not isinstance(item, dict):
            continue

        label = str(item.get("label", "")).strip()
        field_type = str(item.get("type", "short_text")).strip()
        required = bool(item.get("required", False))
        placeholder = str(item.get("placeholder", "")).strip()
        options_raw = item.get("options", [])

        if not label:
            continue
        if len(label) > 60:
            label = label[:60]
        if len(placeholder) > 120:
            placeholder = placeholder[:120]

        allowed_types = {
            "short_text",
            "long_text",
            "number",
            "date",
            "select",
            "multi_select",
            "phone",
            "email",
        }
        if field_type not in allowed_types:
            field_type = "short_text"

        options: list[str] = []
        if field_type in {"select", "multi_select"}:
            seen_opts: set[str] = set()
            if isinstance(options_raw, list):
                for opt in options_raw:
                    value = str(opt).strip()
                    if not value:
                        continue
                    if len(value) > 40:
                        value = value[:40]
                    opt_key = value.casefold()
                    if opt_key in seen_opts:
                        continue
                    seen_opts.add(opt_key)
                    options.append(value)
            if not options:
                continue

        key = label.casefold()
        if key in seen_labels:
            continue
        seen_labels.add(key)
        normalized.append(
            {
                "label": label,
                "type": field_type,
                "required": required,
                "placeholder": placeholder,
                "options": options,
            }
        )

    return normalized


def extract_sub_test_variant_configs(raw: Any) -> list[dict]:
    if not isinstance(raw, dict):
        return []
    variants_raw = raw.get("sub_test_variants")
    if not isinstance(variants_raw, list):
        return []

    normalized: list[dict] = []
    seen: set[str] = set()
    for item in variants_raw:
        if isinstance(item, str):
            sub_test_json = item.strip()
            if not sub_test_json or sub_test_json in seen:
                continue
            seen.add(sub_test_json)
            normalized.append(
                {
                    "sub_test_json": sub_test_json,
                    "available_scale_codes": [],
                    "selected_scale_codes": [],
                }
            )
            continue

        if not isinstance(item, dict):
            continue
        sub_test_json = str(item.get("sub_test_json", "")).strip()
        if not sub_test_json or sub_test_json in seen:
            continue
        seen.add(sub_test_json)
        available_codes = [
            str(code).strip()
            for code in item.get("available_scale_codes", [])
            if str(code).strip()
        ]
        selected_codes = [
            str(code).strip()
            for code in item.get("selected_scale_codes", [])
            if str(code).strip()
        ]
        normalized.append(
            {
                "sub_test_json": sub_test_json,
                "available_scale_codes": sorted(set(available_codes)),
                "selected_scale_codes": sorted(set(selected_codes)),
            }
        )
    return normalized


def _safe_json_loads(raw: Any) -> Any:
    if isinstance(raw, (dict, list)): # 딕셔너리거나 리스트면 그대로 반환
        return raw
    text = str(raw or "").strip() # 문자열 변환 후 공백 제거
    if not text:
        return None
    try:
        return json.loads(text) # JSON 파싱 시도 (문자열을 받아서 파이썬 객체로 변환)
        # test가 배열이면 리스트가 되고, 객체면 딕셔너리가 됨
    except json.JSONDecodeError:
        return None


def _normalize_scale_codes(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return sorted({str(code).strip() for code in raw if str(code).strip()})


def _normalize_sub_test_json(raw: Any) -> str:
    if isinstance(raw, dict):
        return json.dumps(raw, ensure_ascii=False)
    return str(raw or "").strip()


def _normalize_selected_scale_test_configs(raw: Any) -> list[dict]:
    # raw는 selected_scales_json을 JSON 문자열로 파싱한 결과
    if not isinstance(raw, dict):
        return []

    normalized: list[dict] = []
    for test_id_raw, variants_raw in raw.items(): # test_id와 해당하는 sub_test_variants(실시구간들과 선택 척도들)
        test_id = str(test_id_raw or "").strip()
        if not test_id or not isinstance(variants_raw, list):
            continue

        variants: list[dict] = []
        seen: set[str] = set()
        for item in variants_raw: # 하나의 test_id에 여러 sub_test_variant가 있을 수 있음
            if not isinstance(item, dict):
                continue
            sub_test_json = _normalize_sub_test_json(item.get("sub_test_json"))
            if not sub_test_json or sub_test_json in seen:
                continue
            seen.add(sub_test_json)
            variable = item.get("variable", {}) if isinstance(item.get("variable"), dict) else {}
            available_codes = _normalize_scale_codes(
                item.get("available_scale_codes", variable.get("available_scale_codes", []))
            )
            selected_codes = _normalize_scale_codes(
                item.get("selected_scale_codes", variable.get("selected_scale_codes", []))
            )
            variants.append(
                {
                    "sub_test_json": sub_test_json,
                    "available_scale_codes": available_codes,
                    "selected_scale_codes": selected_codes,
                }
            )

        if variants:
            normalized.append({"test_id": test_id, "sub_test_variants": variants})
    # 기존 sub_test_json과 variable가 row에서 분리되어 있었지만,
    # 이걸 하나의 딕셔너리에 담아서 normalized 변수에 정규화함
    return normalized

# selected_scales_json이 JSON 문자열이 아닌 경우에도 최대한 유연하게 처리하여,
# 검사 구성 정보를 파싱할 때 발생할 수 있는 오류를 최소화한다.
def parse_custom_test_configs(
    *,
    test_id: str | None,
    sub_test_json: str | None,
    selected_scales_json: str | None,
) -> list[dict]:
    selected_raw = _safe_json_loads(selected_scales_json) # selected_scales_json을 JSON 문자열이면 파싱해서 파이썬 객체로 반환
    selected_configs = _normalize_selected_scale_test_configs(selected_raw) # 실시구간 정보와 선택된 척도 코드들을 정규화해서 리스트(딕셔너리)로 반환
    if selected_configs:
        return selected_configs
    # selected_scales_json 구조가 이상한 경우 아래와 같이 처리됨
    fallback_test_id = str(test_id or "").strip()
    fallback_sub_test_json = str(sub_test_json or "").strip()
    fallback_selected_codes = _normalize_scale_codes(selected_raw)
    if not fallback_test_id or not fallback_sub_test_json:
        return []

    return [
        {
            "test_id": fallback_test_id,
            "sub_test_variants": [
                {
                    "sub_test_json": fallback_sub_test_json,
                    "available_scale_codes": [],
                    "selected_scale_codes": fallback_selected_codes,
                }
            ],
        }
    ]

# AdminCustomTest orm 모델을 통해 child_test 테이블의 row에서 정보 파싱해서
# parse_custom_test_configs 넘기는?
def load_custom_test_configs(row: AdminCustomTest) -> list[dict]:
    return parse_custom_test_configs(
        test_id=getattr(row, "test_id", ""),
        sub_test_json=getattr(row, "sub_test_json", ""),
        selected_scales_json=getattr(row, "selected_scales_json", "[]"),
    )

# 
def flatten_custom_test_variant_configs(test_configs: list[dict]) -> list[dict]:
    flattened: list[dict] = []
    for config in test_configs:
        test_id = str(config.get("test_id", "")).strip()
        for variant in config.get("sub_test_variants", []):
            sub_test_json = str(variant.get("sub_test_json", "")).strip()
            if not test_id or not sub_test_json:
                continue
            flattened.append(
                {
                    "test_id": test_id,
                    "sub_test_json": sub_test_json,
                    "available_scale_codes": _normalize_scale_codes(variant.get("available_scale_codes", [])),
                    "selected_scale_codes": _normalize_scale_codes(variant.get("selected_scale_codes", [])),
                }
            )
    return flattened

# test_configs에서 test_id들을 추출해서 리스트와 문자열로 반환, 중복 제거, 정렬, fallback 처리 등
def summarize_custom_test_ids(test_configs: list[dict], fallback: str | None = None) -> tuple[list[str], str]:
    # test_configs 향테 : [{test_id : id, sub_test_varints : [{sub_test_json, available_scale_codes, selected_scale_codes}, ...]
    # fallback 형태 : [test_id] 또는 test_id 문자열
    seen: set[str] = set()
    ordered: list[str] = []
    for config in test_configs: # test_id 별로 순환
        test_id = str(config.get("test_id", "")).strip() # test_id 추출해서 공백 제거
        if not test_id or test_id in seen: # test_id가 없거나 이미 본 test_id면 건너뜀
            continue
        seen.add(test_id)
        ordered.append(test_id)

    if ordered:
        return ordered, ", ".join(ordered) # 중복 제거된 test_id 리스트와, 쉼표로 구분된 문자열 반환
        # 예를 들어 GOLDEN, STS면 (["GOLDEN", "STS"], "GOLDEN, STS") 반환

    fallback_text = str(fallback or "").strip()
    parsed_fallback = _safe_json_loads(fallback_text)
    if isinstance(parsed_fallback, list):
        fallback_ids = [str(item).strip() for item in parsed_fallback if str(item).strip()]
        if fallback_ids:
            return fallback_ids, ", ".join(fallback_ids)
    if fallback_text:
        return [fallback_text], fallback_text
    return [], ""


def flatten_selected_scale_pairs(test_configs: list[dict]) -> list[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for config in test_configs:
        test_id = str(config.get("test_id", "")).strip()
        for variant in config.get("sub_test_variants", []):
            for code in _normalize_scale_codes(variant.get("selected_scale_codes", [])):
                if test_id:
                    pairs.add((test_id, code))
    return sorted(pairs)


def serialize_additional_profile_payload(
    fields: list[dict],
) -> str:
    payload = {
        "schema_version": 2,
        "fields": fields,
    }
    return json.dumps(payload, ensure_ascii=False)


def build_custom_test_items(db, admin_id: int) -> list[dict]:
    rows = list_custom_tests_by_admin(db, admin_id)
    assigned_count_map = get_assignment_counts_by_admin(db, admin_id)
    assessed_count_map = get_assessed_counts_by_admin(db, admin_id)

    items = []
    for row in rows:
        test_configs = load_custom_test_configs(row)
        test_ids, test_id_text = summarize_custom_test_ids(test_configs, row.test_id)
        selected_scale_pairs = flatten_selected_scale_pairs(test_configs)
        selected_scale_codes = [code for _, code in selected_scale_pairs]
        additional_profile_fields = normalize_additional_profile_fields(
            json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
        )
        assigned_count = assigned_count_map.get(row.id, 0)
        assessed_count = assessed_count_map.get(row.id, 0)
        progress_status = derive_progress_status(assigned_count, assessed_count)
        items.append(
            {
                "id": row.id,
                "custom_test_name": row.custom_test_name,
                "client_intake_mode": normalize_client_intake_mode(getattr(row, "client_intake_mode", "")),
                "test_id": test_id_text or row.test_id,
                "test_ids": test_ids,
                "sub_test_json": row.sub_test_json,
                "test_configs": test_configs,
                "selected_scale_codes": selected_scale_codes,
                "additional_profile_fields": additional_profile_fields,
                "scale_count": len(selected_scale_pairs),
                "assigned_count": assigned_count,
                "assessed_count": assessed_count,
                "progress_status": progress_status,
                "status": "운영중" if assigned_count > 0 else "대기",
                "created_at": row.created_at.isoformat(),
            }
        )
    return items
