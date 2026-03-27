#!/usr/bin/env python3

from __future__ import annotations

import csv
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "app.db"
CSV_PATH = ROOT / "docs" / "golden_shared_item_audit.csv"
MD_PATH = ROOT / "docs" / "golden_shared_item_audit.md"


@dataclass(frozen=True)
class FacetPair:
    pair_group: str
    left_top_code: str
    left_facet_code: str
    right_top_code: str
    right_facet_code: str


def load_variants(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
            s.sub_test_json,
            s.scale_struct,
            i.item_json,
            c.item_template
        FROM parent_scale s
        JOIN parent_item i
          ON i.test_id = s.test_id
         AND i.sub_test_json = s.sub_test_json
        LEFT JOIN parent_item_choice c
          ON c.test_id = s.test_id
         AND c.sub_test_json = s.sub_test_json
        WHERE s.test_id = 'GOLDEN'
        ORDER BY s.sub_test_json
        """
    ).fetchall()


def determine_variant_label(sub_test_json: str) -> str:
    raw = json.loads(sub_test_json)
    if "age_range" in raw:
        return "adult"
    if "school_age_range" in raw:
        return "child"
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
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    variants = load_variants(conn)
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

    conn.close()
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
        "## Purpose",
        "- `parent_scale.test_id = 'GOLDEN'` 에서 반대 facet 쌍이 공유하는 문항을 item 단위로 검토한다.",
        "- 각 row는 `variant + facet pair + item_id` 단위의 검토 대상이다.",
        "- 현재 문서는 DB를 수정하지 않고, reverse 후보를 확정하기 위한 근거 표를 제공한다.",
        "",
        "## Output Files",
        f"- CSV: `{CSV_PATH.relative_to(ROOT)}`",
        f"- Markdown: `{MD_PATH.relative_to(ROOT)}`",
        "",
        "## Summary",
        f"- Total review rows: `{len(rows)}`",
        f"- Adult rows: `{len(by_variant.get('adult', []))}`",
        f"- Child rows: `{len(by_variant.get('child', []))}`",
        "",
        "## Columns",
        "- `left_scale`, `right_scale`: 같은 문항을 공유하는 반대 facet 쌍",
        "- `left_anchor`, `right_anchor`: 각 문항에서 실제 최소/최대 보기 번호에 대응하는 극단 앵커",
        "- `left_choice_score`, `right_choice_score`: 현재 DB에 저장된 양쪽 facet의 점수표",
        "- `score_maps_equal`: 현재 두 facet 점수표가 동일한지 여부",
        "- `suggested_direct_scale`, `suggested_reverse_scale`: 아직 비워둔 수동 검토 칼럼",
        "",
    ]

    for variant_label in ("adult", "child", "unknown"):
        variant_rows = by_variant.get(variant_label, [])
        if not variant_rows:
            continue
        lines.extend(
            [
                f"## Variant `{variant_label}`",
                "",
                f"- Row count: `{len(variant_rows)}`",
                "",
                "| Pair | Item | Left Scale | Right Scale | Left Anchor | Right Anchor | Maps Equal |",
                "| --- | ---: | --- | --- | --- | --- | --- |",
            ]
        )
        for row in variant_rows:
            lines.append(
                f"| {row['pair_group']} | {row['item_id']} | {row['left_scale']} | {row['right_scale']} | "
                f"{row['left_anchor']} | {row['right_anchor']} | {row['score_maps_equal']} |"
            )
        lines.append("")

    return "\n".join(lines)


def write_markdown(content: str) -> None:
    MD_PATH.write_text(content, encoding="utf-8")


def main() -> None:
    rows = build_rows()
    write_csv(rows)
    write_markdown(build_markdown(rows))
    print(f"wrote {CSV_PATH}")
    print(f"wrote {MD_PATH}")
    print(f"rows={len(rows)}")


if __name__ == "__main__":
    main()
