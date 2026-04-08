import json
from types import SimpleNamespace
from typing import Any

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


def _load_variant_rows(test_id: str) -> list[dict[str, Any]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return []

    with engine.connect() as conn:
        result = conn.exec_driver_sql(
            """
            SELECT
                s."test.id" AS test_id,
                s."condition.id" AS condition_id,
                sc.name AS condition_name,
                sc.condition AS sub_test_json,
                s.struct AS scale_struct
            FROM SCALE s
            LEFT JOIN SCALECONDITION sc
              ON sc.id = s."condition.id"
             AND sc."test.id" = s."test.id"
            WHERE s."test.id" = ?
            ORDER BY s."condition.id"
            """,
            (normalized,),
        )
        return [dict(row._mapping) for row in result]


def _load_items_by_variant(test_id: str) -> dict[str, list[dict[str, Any]]]:
    normalized = _normalize_test_id(test_id)
    if not normalized:
        return {}

    with engine.connect() as conn:
        result = conn.exec_driver_sql(
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
            FROM ITEM i
            LEFT JOIN ITEMCONDITION ic
              ON ic.id = i."condition.id"
             AND ic."test.id" = i."test.id"
            LEFT JOIN CHOICE c
              ON c.id = i."choice.id"
            LEFT JOIN TEMPLATE t
              ON t.id = i.template_id
            WHERE i."test.id" = ?
            ORDER BY i."condition.id", CAST(i.no AS INTEGER), i.no
            """,
            (normalized,),
        )
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in result:
            mapping = dict(row._mapping)
            grouped.setdefault(str(mapping["condition_id"]), []).append(mapping)
        return grouped


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


def _build_records_for_test(test_id: str, *, grouped_item_json: bool) -> list[SimpleNamespace]:
    variant_rows = _load_variant_rows(test_id)
    items_by_variant = _load_items_by_variant(test_id)
    records: list[SimpleNamespace] = []

    for variant in variant_rows:
        condition_id = str(variant.get("condition_id", "")).strip()
        sub_test_json = str(variant.get("sub_test_json") or "").strip()
        scale_struct = str(variant.get("scale_struct") or "").strip()
        if not condition_id or not sub_test_json or not scale_struct:
            continue
        items = items_by_variant.get(condition_id, [])
        if not items:
            continue
        records.append(
            _build_variant_record(
                test_id=str(variant.get("test_id") or "").strip(),
                sub_test_json=sub_test_json,
                scale_struct=scale_struct,
                condition_name=str(variant.get("condition_name") or "").strip(),
                items=items,
                grouped_item_json=grouped_item_json,
            )
        )

    return records


def fetch_parent_scale_rows_by_test(test_id: str):
    rows = _load_variant_rows(test_id)
    return [
        SimpleNamespace(
            test_id=str(row.get("test_id") or "").strip(),
            sub_test_json=str(row.get("sub_test_json") or "").strip(),
            scale_struct=str(row.get("scale_struct") or "").strip(),
        )
        for row in rows
        if row.get("sub_test_json") and row.get("scale_struct")
    ]


def fetch_parent_scale_struct(test_id: str, sub_test_json: str):
    normalized = _normalize_test_id(test_id)
    target_json = str(sub_test_json or "").strip()
    for row in _load_variant_rows(normalized):
        if str(row.get("sub_test_json") or "").strip() != target_json:
            continue
        return SimpleNamespace(scale_struct=str(row.get("scale_struct") or "").strip())
    return None


def fetch_parent_catalog_rows():
    records: list[SimpleNamespace] = []
    with engine.connect() as conn:
        test_ids = [
            str(row[0]).strip()
            for row in conn.exec_driver_sql('SELECT id FROM TEST ORDER BY id').fetchall()
            if row and str(row[0]).strip()
        ]
    for test_id in test_ids:
        records.extend(_build_records_for_test(test_id, grouped_item_json=False))
    return records


def fetch_parent_item_bundle(test_id: str, sub_test_json: str):
    normalized = _normalize_test_id(test_id)
    target_json = str(sub_test_json or "").strip()
    for record in _build_records_for_test(normalized, grouped_item_json=True):
        if str(record.sub_test_json).strip() == target_json:
            return record
    return None
