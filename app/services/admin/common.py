import json
from typing import Any

from app.db.models import AdminClient
from app.repositories.custom_test_repository import (
    get_assessed_counts_by_admin,
    get_assignment_counts_by_admin,
    list_custom_tests_by_admin,
)


def serialize_admin_client(row: AdminClient) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "gender": row.gender,
        "birth_day": row.birth_day.isoformat() if row.birth_day else None,
        "memo": row.memo,
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
    )
    if (isinstance(school_raw, list) and school_raw) or (isinstance(school_raw, str) and school_raw.strip()):
        required.append("school_age")

    return required


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


def extract_sub_test_variants(raw: Any) -> list[str]:
    if not isinstance(raw, dict):
        return []
    variants_raw = raw.get("sub_test_variants")
    if not isinstance(variants_raw, list):
        return []

    variants: list[str] = []
    seen: set[str] = set()
    for item in variants_raw:
        sub_test_json = ""
        if isinstance(item, str):
            sub_test_json = item.strip()
        elif isinstance(item, dict):
            sub_test_json = str(item.get("sub_test_json", "")).strip()
        if not sub_test_json:
            continue
        if sub_test_json in seen:
            continue
        seen.add(sub_test_json)
        variants.append(sub_test_json)
    return variants


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


def serialize_additional_profile_payload(fields: list[dict], sub_test_variants: list[Any]) -> str:
    variant_configs: list[dict] = []
    seen: set[str] = set()
    for item in sub_test_variants:
        if isinstance(item, str):
            sub_test_json = item.strip()
            if not sub_test_json or sub_test_json in seen:
                continue
            seen.add(sub_test_json)
            variant_configs.append(
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
        available_codes = sorted(
            {
                str(code).strip()
                for code in item.get("available_scale_codes", [])
                if str(code).strip()
            }
        )
        selected_codes = sorted(
            {
                str(code).strip()
                for code in item.get("selected_scale_codes", [])
                if str(code).strip()
            }
        )
        variant_configs.append(
            {
                "sub_test_json": sub_test_json,
                "available_scale_codes": available_codes,
                "selected_scale_codes": selected_codes,
            }
        )

    payload = {
        "schema_version": 2,
        "fields": fields,
        "sub_test_variants": variant_configs,
    }
    return json.dumps(payload, ensure_ascii=False)


def build_custom_test_items(db, admin_id: int) -> list[dict]:
    rows = list_custom_tests_by_admin(db, admin_id)
    assigned_count_map = get_assignment_counts_by_admin(db, admin_id)
    assessed_count_map = get_assessed_counts_by_admin(db, admin_id)

    items = []
    for row in rows:
        selected_scale_codes = json.loads(row.selected_scales_json)
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
                "test_id": row.test_id,
                "sub_test_json": row.sub_test_json,
                "selected_scale_codes": selected_scale_codes,
                "additional_profile_fields": additional_profile_fields,
                "scale_count": len(selected_scale_codes),
                "assigned_count": assigned_count,
                "assessed_count": assessed_count,
                "progress_status": progress_status,
                "status": "운영중" if assigned_count > 0 else "대기",
                "created_at": row.created_at.isoformat(),
            }
        )
    return items
