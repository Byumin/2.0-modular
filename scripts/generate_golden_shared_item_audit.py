#!/usr/bin/env python3

from __future__ import annotations

import csv
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.repositories.parent_test_repository import (  # noqa: E402
    fetch_parent_item_bundle,
    fetch_parent_scale_rows_by_test,
)

CSV_PATH = ROOT / "docs" / "golden_shared_item_audit.csv"
MD_PATH = ROOT / "docs" / "golden_shared_item_audit.md"


@dataclass(frozen=True)
class FacetPair:
    pair_group: str
    left_top_code: str
    left_facet_code: str
    right_top_code: str
    right_facet_code: str


def load_variants() -> list[dict[str, str]]:
    variants: list[dict[str, str]] = []
    for row in fetch_parent_scale_rows_by_test("GOLDEN"):
        bundle = fetch_parent_item_bundle("GOLDEN", row.sub_test_json)
        if bundle is None:
            continue
        variants.append(
            {
                "sub_test_json": row.sub_test_json,
                "scale_struct": row.scale_struct,
                "item_json": bundle.item_json,
                "item_template": bundle.item_template,
            }
        )
    return variants


def determine_variant_label(sub_test_json: str) -> str:
    raw = json.loads(sub_test_json)
    age_range = raw.get("age_range")
    if isinstance(age_range, dict):
        start = age_range.get("start_inclusive")
        if isinstance(start, list) and start and isinstance(start[0], int):
            return "adult" if start[0] >= 18 else "child"
    return "unknown"


def pair_specs_for_variant(variant_label: str) -> list[FacetPair]:
    specs: list[FacetPair] = []
    for idx in range(1, 5):
        specs.append(FacetPair("E/I", "E", f"E{idx}", "I", f"I{idx}"))
        specs.append(FacetPair("S/N", "S", f"S{idx}", "N", f"N{idx}"))
        specs.append(FacetPair("T/F", "T", f"T{idx}", "F", f"F{idx}"))
    if variant_label == "adult":
        for idx in range(1, 5):
            specs.append(FacetPair("O/A", "Z", f"O{idx}", "A", f"A{idx}"))
    else:
        for idx in range(1, 5):
            specs.append(FacetPair("Z/A", "Z", f"Z{idx}", "A", f"A{idx}"))
    specs.append(FacetPair("Tense/Calm", "Tense", "Tense1", "Calm", "Calm1"))
    specs.append(FacetPair("Tense/Calm", "Tense", "Tense2", "Calm", "Calm2"))
    return specs


def as_dict(raw_json: str | None) -> dict[str, Any]:
    if not raw_json:
        return {}
    parsed = json.loads(raw_json)
    return parsed if isinstance(parsed, dict) else {}


def get_choice_score_map(
    scale_struct: dict[str, Any],
    top_code: str,
    facet_code: str,
) -> dict[str, dict[str, Any]]:
    top_scale = scale_struct.get(top_code)
    if not isinstance(top_scale, dict):
        return {}
    facet_scale = top_scale.get("facet_scale") or top_scale.get("facet_scale_1")
    if not isinstance(facet_scale, dict):
        return {}
    facet = facet_scale.get(facet_code)
    if not isinstance(facet, dict):
        return {}
    raw = facet.get("choice_score")
    return raw if isinstance(raw, dict) else {}


def normalize_score_map(raw_score_map: dict[str, Any]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for answer_value, score in raw_score_map.items():
        normalized[str(answer_value)] = str(score)
    return normalized


def anchor_text(item_template: dict[str, Any], item_id: str, answer_value: str) -> str:
    per_item = item_template.get(item_id)
    if not isinstance(per_item, dict):
        return ""
    return str(per_item.get(answer_value, "")).strip()


def anchor_edge_values(item_template: dict[str, Any], item_id: str) -> tuple[str, str]:
    per_item = item_template.get(item_id)
    if not isinstance(per_item, dict):
        return ("1", "7")
    populated_values = [
        str(answer_value)
        for answer_value, text in per_item.items()
        if str(text).strip()
    ]
    if not populated_values:
        return ("1", "7")
    sorted_values = sorted(
        populated_values,
        key=lambda value: int(value) if value.isdigit() else value,
    )
    return (sorted_values[0], sorted_values[-1])


def build_rows() -> list[dict[str, str]]:
    variants = load_variants()
    rows: list[dict[str, str]] = []

    for variant in variants:
        sub_test_json = str(variant["sub_test_json"])
        variant_label = determine_variant_label(sub_test_json)
        scale_struct = as_dict(variant["scale_struct"])
        item_json = as_dict(variant["item_json"])
        item_template = as_dict(variant["item_template"])

        for spec in pair_specs_for_variant(variant_label):
            left_choice_score = get_choice_score_map(
                scale_struct=scale_struct,
                top_code=spec.left_top_code,
                facet_code=spec.left_facet_code,
            )
            right_choice_score = get_choice_score_map(
                scale_struct=scale_struct,
                top_code=spec.right_top_code,
                facet_code=spec.right_facet_code,
            )
            shared_item_ids = sorted(
                set(map(str, left_choice_score.keys())) & set(map(str, right_choice_score.keys())),
                key=lambda value: int(value) if value.isdigit() else value,
            )

            for item_id in shared_item_ids:
                left_score_map = normalize_score_map(left_choice_score.get(item_id, {}))
                right_score_map = normalize_score_map(right_choice_score.get(item_id, {}))
                left_edge_value, right_edge_value = anchor_edge_values(item_template, item_id)
                rows.append(
                    {
                        "variant_label": variant_label,
                        "sub_test_json": sub_test_json,
                        "pair_group": spec.pair_group,
                        "left_scale": spec.left_facet_code,
                        "right_scale": spec.right_facet_code,
                        "item_id": item_id,
                        "item_text": str(item_json.get(item_id, "")),
                        "left_anchor": anchor_text(item_template, item_id, left_edge_value),
                        "right_anchor": anchor_text(item_template, item_id, right_edge_value),
                        "left_choice_score": json.dumps(left_score_map, ensure_ascii=False, sort_keys=True),
                        "right_choice_score": json.dumps(right_score_map, ensure_ascii=False, sort_keys=True),
                        "score_maps_equal": "yes" if left_score_map == right_score_map else "no",
                        "suggested_direct_scale": "",
                        "suggested_reverse_scale": "",
                        "review_status": "needs_review",
                    }
                )

    return rows


def write_csv(rows: list[dict[str, str]]) -> None:
    fieldnames = [
        "variant_label",
        "sub_test_json",
        "pair_group",
        "left_scale",
        "right_scale",
        "item_id",
        "item_text",
        "left_anchor",
        "right_anchor",
        "left_choice_score",
        "right_choice_score",
        "score_maps_equal",
        "suggested_direct_scale",
        "suggested_reverse_scale",
        "review_status",
    ]
    with CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_markdown(rows: list[dict[str, str]]) -> str:
    by_variant: dict[str, list[dict[str, str]]] = {"adult": [], "child": [], "unknown": []}
    for row in rows:
        by_variant.setdefault(row["variant_label"], []).append(row)

    lines = [
        "# GOLDEN Shared Item Audit",
        "",
        "이 문서는 현재 `modular.db` 기준 `GOLDEN` 척도 공유 문항을 점검하기 위해 생성되었습니다.",
        "",
    ]

    for variant_label in ("adult", "child", "unknown"):
        variant_rows = by_variant.get(variant_label, [])
        if not variant_rows:
            continue
        lines.append(f"## {variant_label}")
        lines.append("")
        lines.append(f"- row count: {len(variant_rows)}")
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def main() -> None:
    rows = build_rows()
    write_csv(rows)
    MD_PATH.write_text(build_markdown(rows), encoding="utf-8")
    print(f"rows={len(rows)}")
    print(CSV_PATH)
    print(MD_PATH)


if __name__ == "__main__":
    main()
