import json
from types import SimpleNamespace
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine


def _normalize_test_id(test_id: str) -> str:
    return str(test_id or "").strip().upper()


def _parse_json_object(raw_value: Any, default: Any) -> Any:
    if raw_value in (None, ""):
        return default
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(str(raw_value))
    except json.JSONDecodeError:
        return default


def _range_tuple(value: Any, fallback: tuple[int, int, int]) -> tuple[int, int, int]:
    if not isinstance(value, list) or not value:
        return fallback
    parts: list[int] = []
    for index in range(3):
        raw_part = value[index] if index < len(value) else 0
        parts.append(raw_part if isinstance(raw_part, int) else 0)
    return (parts[0], parts[1], parts[2])


def _range_overlaps(conditions: list[dict[str, Any]], key: str) -> bool:
    starts: list[tuple[int, int, int]] = []
    ends: list[tuple[int, int, int]] = []
    for condition in conditions:
        raw_range = condition.get(key)
        if not isinstance(raw_range, dict):
            continue
        starts.append(_range_tuple(raw_range.get("start_inclusive"), (0, 0, 0)))
        ends.append(_range_tuple(raw_range.get("end_exclusive"), (999, 0, 0)))
    if not starts or not ends:
        return True
    return max(starts) < min(ends)


def _range_intersection(conditions: list[dict[str, Any]], key: str) -> dict[str, Any] | None:
    ranges = [
        condition.get(key)
        for condition in conditions
        if isinstance(condition.get(key), dict)
    ]
    if not ranges:
        return {}

    starts = [_range_tuple(raw_range.get("start_inclusive"), (0, 0, 0)) for raw_range in ranges]
    ends = [_range_tuple(raw_range.get("end_exclusive"), (999, 0, 0)) for raw_range in ranges]
    start = max(starts)
    end = min(ends)
    if start >= end:
        return None

    result: dict[str, Any] = {
        "start_inclusive": list(start),
        "end_exclusive": list(end),
    }
    for raw_range in ranges:
        as_of_time = raw_range.get("as_of_time")
        if as_of_time:
            result["as_of_time"] = as_of_time
            break
    if "as_of_time" in result:
        return {
            "as_of_time": result["as_of_time"],
            "start_inclusive": result["start_inclusive"],
            "end_exclusive": result["end_exclusive"],
        }
    return result


def _condition_values(raw_value: Any) -> set[str] | None:
    if raw_value in (None, ""):
        return None
    if isinstance(raw_value, list):
        values = {str(item).strip() for item in raw_value if str(item).strip()}
        return values or None
    text = str(raw_value).strip()
    return {text} if text else None


def _condition_intersection(raw_conditions: list[Any]) -> dict[str, Any] | None:
    conditions = [
        condition
        for condition in (_parse_json_object(raw, {}) for raw in raw_conditions)
        if isinstance(condition, dict)
    ]
    if len(conditions) != len(raw_conditions):
        return None

    active_range_keys = {
        range_key
        for condition in conditions
        for range_key in ("age_range", "school_age_range")
        if isinstance(condition.get(range_key), dict)
    }
    if len(active_range_keys) > 1:
        return None

    result: dict[str, Any] = {}
    for range_key in ("age_range", "school_age_range"):
        range_result = _range_intersection(conditions, range_key)
        if range_result is None:
            return None
        if range_result:
            result[range_key] = range_result

    categorical_keys = {
        key
        for condition in conditions
        for key in condition.keys()
        if key not in {"age_range", "school_age_range"}
    }
    for key in sorted(categorical_keys):
        constrained_values = [
            values
            for values in (_condition_values(condition.get(key)) for condition in conditions)
            if values is not None
        ]
        if not constrained_values:
            continue
        values = set.intersection(*constrained_values)
        if not values:
            return None
        result[key] = sorted(values)
    return result


def _condition_group_key(condition: dict[str, Any]) -> str:
    range_only = {
        key: condition[key]
        for key in ("age_range", "school_age_range")
        if key in condition
    }
    if range_only:
        return json.dumps(range_only, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return json.dumps(condition, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _merge_condition_variants(conditions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for condition in conditions:
        key = _condition_group_key(condition)
        target = grouped.setdefault(
            key,
            {
                range_key: condition[range_key]
                for range_key in ("age_range", "school_age_range")
                if range_key in condition
            },
        )
        for condition_key, raw_value in condition.items():
            if condition_key in {"age_range", "school_age_range"}:
                continue
            values = _condition_values(raw_value)
            if values is None:
                continue
            existing = _condition_values(target.get(condition_key)) or set()
            target[condition_key] = sorted(existing.union(values))
    return list(grouped.values())


def _condition_sort_key(condition: dict[str, Any]) -> tuple[Any, ...]:
    age_range = condition.get("age_range")
    school_age_range = condition.get("school_age_range")
    age_start = (999, 0, 0)
    school_start = (999, 0, 0)
    if isinstance(age_range, dict):
        age_start = _range_tuple(age_range.get("start_inclusive"), (999, 0, 0))
    if isinstance(school_age_range, dict):
        school_start = _range_tuple(school_age_range.get("start_inclusive"), (999, 0, 0))
    return (
        age_start,
        school_start,
        json.dumps(condition, ensure_ascii=False, sort_keys=True),
    )


def _conditions_overlap(raw_conditions: list[Any]) -> bool:
    conditions = [
        condition
        for condition in (_parse_json_object(raw, {}) for raw in raw_conditions)
        if isinstance(condition, dict)
    ]
    if len(conditions) != len(raw_conditions):
        return False

    for range_key in ("age_range", "school_age_range"):
        if not _range_overlaps(conditions, range_key):
            return False

    categorical_keys = {
        key
        for condition in conditions
        for key in condition.keys()
        if key not in {"age_range", "school_age_range"}
    }
    for key in categorical_keys:
        constrained_values = [
            values
            for values in (_condition_values(condition.get(key)) for condition in conditions)
            if values is not None
        ]
        if constrained_values and not set.intersection(*constrained_values):
            return False
    return True


def _merge_scale_structs(rows: list[dict[str, Any]]) -> str:
    merged: dict[str, Any] = {}
    for row in rows:
        parsed = _parse_json_object(row.get("scale_struct"), {})
        if not isinstance(parsed, dict):
            continue
        merged.update(parsed)
    return json.dumps(merged, ensure_ascii=False)


def _sort_item_no(value: str) -> tuple[int, Any]:
    text = str(value or "").strip()
    return (0, int(text)) if text.isdigit() else (1, text)


def _choice_options_for_item(choice_contents: Any, item_no: str, item_id: str) -> dict[str, str]:
    parsed = _parse_json_object(choice_contents, {})
    if not isinstance(parsed, dict) or not parsed:
        return {}

    if all(not isinstance(value, dict) for value in parsed.values()):
        return {str(key): str(value) for key, value in parsed.items()}

    for lookup_key in (str(item_no), str(item_id)):
        selected = parsed.get(lookup_key)
        if isinstance(selected, dict):
            return {str(key): str(value) for key, value in selected.items()}
    return {}


def _normalize_choice_template(items: list[dict[str, Any]]) -> str:
    template: dict[str, dict[str, str]] = {}
    for item in items:
        item_no = str(item["item_no"])
        options = _choice_options_for_item(item.get("choice_contents"), item_no, str(item.get("item_id", "")))
        if options:
            template[item_no] = options
    return json.dumps(template, ensure_ascii=False)


def _normalize_item_meta(condition_name: str, items: list[dict[str, Any]]) -> str:
    merged_meta: dict[str, Any] = {}
    for item in items:
        raw_meta = _parse_json_object(item.get("item_meta_json"), {})
        if isinstance(raw_meta, dict):
            merged_meta.update(raw_meta)
    merged_meta.setdefault("name", str(condition_name or "").strip() or "이름 없음")
    merged_meta["item_count"] = len(items)
    return json.dumps(merged_meta, ensure_ascii=False)


def _build_catalog_item_json(items: list[dict[str, Any]]) -> str:
    item_map = {str(item["item_no"]): item.get("text") or "" for item in items}
    return json.dumps(item_map, ensure_ascii=False)


def _build_bundle_item_json(items: list[dict[str, Any]]) -> str:
    grouped: dict[str, dict[str, str]] = {}
    flat_item_map: dict[str, str] = {}
    matrix_seen = False

    for item in items:
        item_no = str(item["item_no"])
        text = item.get("text") or ""
        template_type = str(item.get("template_type") or "").strip()
        group_prompt = str(item.get("item_meta_json") or "").strip()
        if template_type == "likert_matrix" and group_prompt:
            matrix_seen = True
            grouped.setdefault(group_prompt, {})[item_no] = text
            continue
        flat_item_map[item_no] = text

    if not matrix_seen:
        return json.dumps(flat_item_map, ensure_ascii=False)

    mixed: dict[str, Any] = {}
    for item_no, text in flat_item_map.items():
        mixed[item_no] = text
    for group_prompt, item_map in grouped.items():
        mixed[group_prompt] = item_map
    return json.dumps(mixed, ensure_ascii=False)


def _build_render_rules(items: list[dict[str, Any]]) -> str:
    rules: list[dict[str, Any]] = []
    run_start: str | None = None
    run_end: str | None = None
    run_type = ""

    for item in items:
        item_no = str(item["item_no"])
        render_type = str(item.get("template_type") or "").strip() or "likert"
        if render_type == run_type:
            run_end = item_no
            continue
        if run_start is not None and run_end is not None:
            rules.append(
                {
                    "render_type": run_type,
                    "start_item_id": int(run_start) if run_start.isdigit() else run_start,
                    "end_item_id": int(run_end) if run_end.isdigit() else run_end,
                    "config": {"hide_empty_labels": True} if run_type == "bipolar_labels_only" else {},
                }
            )
        run_start = item_no
        run_end = item_no
        run_type = render_type

    if run_start is not None and run_end is not None:
        rules.append(
            {
                "render_type": run_type,
                "start_item_id": int(run_start) if run_start.isdigit() else run_start,
                "end_item_id": int(run_end) if run_end.isdigit() else run_end,
                "config": {"hide_empty_labels": True} if run_type == "bipolar_labels_only" else {},
            }
        )

    return json.dumps(rules, ensure_ascii=False)


def _execute_sql(query: str, params: dict[str, Any], db: Session | None = None):
    if db is not None:
        return db.execute(text(query), params)
    with engine.connect() as conn:
        return conn.execute(text(query), params)


def _load_variant_rows(test_id: str, db: Session | None = None) -> list[dict[str, Any]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return []

    result = _execute_sql(
            """
            SELECT
                s."test.id" AS test_id,
                s."condition.id" AS condition_id,
                sc.name AS condition_name,
                sc.condition AS sub_test_json,
                s.struct AS scale_struct
            FROM scale s
            LEFT JOIN scalecondition sc
              ON sc.id = s."condition.id"
             AND sc."test.id" = s."test.id"
            WHERE s."test.id" = :test_id
            ORDER BY s."condition.id"
            """,
            {"test_id": normalized},
            db,
        )
    return [dict(row._mapping) for row in result]


def _load_item_condition_rows(test_id: str, db: Session | None = None) -> list[dict[str, Any]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return []

    result = _execute_sql(
            """
            SELECT
                ic."test.id" AS test_id,
                ic.id AS condition_id,
                ic.name AS condition_name,
                ic.condition AS condition_json
            FROM itemcondition ic
            WHERE ic."test.id" = :test_id
            ORDER BY ic.id
            """,
            {"test_id": normalized},
            db,
        )
    return [dict(row._mapping) for row in result]


def _load_items_by_variant(test_id: str, db: Session | None = None) -> dict[str, list[dict[str, Any]]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return {}

    result = _execute_sql(
            """
            SELECT
                i.id AS item_id,
                i.no AS item_no,
                i.text AS text,
                i.meta_json AS item_meta_json,
                i."condition.id" AS condition_id,
                ic.name AS condition_name,
                c.contents AS choice_contents,
                t.type AS template_type
            FROM item i
            LEFT JOIN itemcondition ic
              ON ic.id = i."condition.id"
             AND ic."test.id" = i."test.id"
            LEFT JOIN choice c
              ON c.id = i."choice.id"
            LEFT JOIN template t
              ON t.id = i.template_id
            WHERE i."test.id" = :test_id
            ORDER BY i."condition.id", CAST(i.no AS INTEGER), i.no
            """,
            {"test_id": normalized},
            db,
        )
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in result:
        mapping = dict(row._mapping)
        grouped.setdefault(str(mapping["condition_id"]), []).append(mapping)
    return grouped


def _load_norm_condition_rows(test_id: str, db: Session | None = None) -> list[dict[str, Any]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return []

    result = _execute_sql(
            """
            SELECT
                id AS condition_id,
                name AS condition_name,
                condition AS condition_json
            FROM normcondition
            WHERE "test.id" = :test_id
            ORDER BY id
            """,
            {"test_id": normalized},
            db,
        )
    return [dict(row._mapping) for row in result]


def _build_variant_record(
    *,
    test_id: str,
    sub_test_json: str,
    scale_struct: str,
    condition_name: str,
    items: list[dict[str, Any]],
    grouped_item_json: bool,
) -> SimpleNamespace:
    return SimpleNamespace(
        test_id=test_id,
        sub_test_json=sub_test_json,
        item_json=_build_bundle_item_json(items) if grouped_item_json else _build_catalog_item_json(items),
        item_meta_json=_normalize_item_meta(condition_name, items),
        scale_struct=scale_struct,
        item_template=_normalize_choice_template(items),
        render_rules_json=_build_render_rules(items),
    )


def _build_records_for_test(test_id: str, *, grouped_item_json: bool, db: Session | None = None) -> list[SimpleNamespace]:
    scale_rows = _load_variant_rows(test_id, db)
    item_condition_rows = _load_item_condition_rows(test_id, db)
    items_by_variant = _load_items_by_variant(test_id, db)
    norm_condition_rows = _load_norm_condition_rows(test_id, db)
    records: list[SimpleNamespace] = []

    if not scale_rows or not norm_condition_rows:
        return records

    for item_condition in item_condition_rows:
        condition_id = str(item_condition.get("condition_id", "")).strip()
        item_condition_json = str(item_condition.get("condition_json") or "").strip()
        if not condition_id or not item_condition_json:
            continue
        items = items_by_variant.get(condition_id, [])
        if not items:
            continue
        buckets: dict[str, dict[str, Any]] = {}
        for scale_row in scale_rows:
            scale_condition = str(scale_row.get("sub_test_json") or "").strip()
            scale_struct = str(scale_row.get("scale_struct") or "").strip()
            if not scale_condition or not scale_struct:
                continue
            intersections = _merge_condition_variants(
                [
                    intersection
                    for norm_row in norm_condition_rows
                    for intersection in [
                        _condition_intersection(
                            [
                                item_condition_json,
                                scale_condition,
                                str(norm_row.get("condition_json") or "").strip(),
                            ]
                        )
                    ]
                    if intersection
                ]
            )
            for intersection in intersections:
                bucket_key = json.dumps(intersection, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                bucket = buckets.setdefault(bucket_key, {"condition": intersection, "scale_rows": []})
                bucket["scale_rows"].append(scale_row)

        for bucket in sorted(
            buckets.values(),
            key=lambda item: _condition_sort_key(item["condition"]),
        ):
            scale_struct = _merge_scale_structs(bucket["scale_rows"])
            if not scale_struct or scale_struct == "{}":
                continue
            records.append(
                _build_variant_record(
                    test_id=str(item_condition.get("test_id") or "").strip(),
                    sub_test_json=json.dumps(bucket["condition"], ensure_ascii=False),
                    scale_struct=scale_struct,
                    condition_name=str(item_condition.get("condition_name") or "").strip(),
                    items=items,
                    grouped_item_json=grouped_item_json,
                )
        )

    records.sort(
        key=lambda record: _condition_sort_key(
            _parse_json_object(getattr(record, "sub_test_json", ""), {})
        )
    )
    return records


def fetch_parent_scale_rows_by_test(test_id: str, db: Session | None = None):
    rows = _build_records_for_test(test_id, grouped_item_json=False, db=db)
    return [
        SimpleNamespace(
            test_id=str(row.test_id or "").strip(),
            sub_test_json=str(row.sub_test_json or "").strip(),
            scale_struct=str(row.scale_struct or "").strip(),
        )
        for row in rows
        if row.sub_test_json and row.scale_struct
    ]


def fetch_parent_scale_struct(test_id: str, sub_test_json: str, db: Session | None = None):
    normalized = _normalize_test_id(test_id)
    target_json = str(sub_test_json or "").strip()
    for row in _build_records_for_test(normalized, grouped_item_json=False, db=db):
        if str(row.sub_test_json or "").strip() != target_json:
            continue
        return SimpleNamespace(scale_struct=str(row.scale_struct or "").strip())
    return None


def fetch_parent_catalog_rows(db: Session | None = None):
    records: list[SimpleNamespace] = []
    result = _execute_sql('SELECT id FROM test ORDER BY id', {}, db)
    test_ids = [
        str(row[0]).strip()
        for row in result.fetchall()
        if row and str(row[0]).strip()
    ]
    for test_id in test_ids:
        records.extend(_build_records_for_test(test_id, grouped_item_json=False, db=db))
    return records


def fetch_parent_item_bundle(test_id: str, sub_test_json: str, db: Session | None = None):
    normalized = _normalize_test_id(test_id)
    target_json = str(sub_test_json or "").strip()
    for record in _build_records_for_test(normalized, grouped_item_json=True, db=db):
        if str(record.sub_test_json).strip() == target_json:
            return record
    return None
