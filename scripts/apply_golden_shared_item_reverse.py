#!/usr/bin/env python3

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "modular.db"


@dataclass(frozen=True)
class FacetPair:
    pair_group: str
    left_top_code: str
    left_facet_code: str
    right_top_code: str
    right_facet_code: str


def load_golden_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT s."test.id" AS test_id, sc.condition AS sub_test_json, s.struct AS scale_struct, s."condition.id" AS condition_id
        FROM SCALE s
        JOIN SCALECONDITION sc
          ON sc.id = s."condition.id"
         AND sc."test.id" = s."test.id"
        WHERE s."test.id" = 'GOLDEN'
        ORDER BY s."condition.id"
        """
    ).fetchall()


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


def get_facet_container(top_scale: dict[str, Any]) -> tuple[str | None, dict[str, Any] | None]:
    for key in ("facet_scale", "facet_scale_1"):
        value = top_scale.get(key)
        if isinstance(value, dict):
            return key, value
    return None, None


def get_choice_score(facet: dict[str, Any]) -> dict[str, Any]:
    raw = facet.get("choice_score")
    return raw if isinstance(raw, dict) else {}


def reverse_choice_score_map(choice_score: dict[str, Any]) -> dict[str, Any]:
    reversed_map: dict[str, Any] = {}
    for item_id, raw_score_map in choice_score.items():
        if not isinstance(raw_score_map, dict):
            continue
        answer_keys = sorted(
            [str(answer_value) for answer_value in raw_score_map.keys()],
            key=lambda value: int(value) if value.isdigit() else value,
        )
        score_values = [raw_score_map[key] for key in answer_keys]
        reversed_scores = list(reversed(score_values))
        reversed_map[str(item_id)] = {
            answer_key: reversed_scores[idx]
            for idx, answer_key in enumerate(answer_keys)
        }
    return reversed_map


def apply_reverse_to_variant(scale_struct: dict[str, Any], variant_label: str) -> tuple[dict[str, Any], int]:
    updated = json.loads(json.dumps(scale_struct))
    changed_item_count = 0

    for spec in pair_specs_for_variant(variant_label):
        left_top = updated.get(spec.left_top_code)
        right_top = updated.get(spec.right_top_code)
        if not isinstance(left_top, dict) or not isinstance(right_top, dict):
            continue

        _, left_facets = get_facet_container(left_top)
        right_container_key, right_facets = get_facet_container(right_top)
        if not isinstance(left_facets, dict) or not isinstance(right_facets, dict) or not right_container_key:
            continue

        left_facet = left_facets.get(spec.left_facet_code)
        right_facet = right_facets.get(spec.right_facet_code)
        if not isinstance(left_facet, dict) or not isinstance(right_facet, dict):
            continue

        left_choice_score = get_choice_score(left_facet)
        right_choice_score = get_choice_score(right_facet)
        if not left_choice_score or not right_choice_score:
            continue

        shared_item_ids = sorted(
            set(map(str, left_choice_score.keys())) & set(map(str, right_choice_score.keys())),
            key=lambda value: int(value) if value.isdigit() else value,
        )
        if not shared_item_ids:
            continue

        reversed_right = reverse_choice_score_map(right_choice_score)
        for item_id in shared_item_ids:
            current = right_choice_score.get(item_id)
            new_value = reversed_right.get(item_id)
            if not isinstance(current, dict) or not isinstance(new_value, dict):
                continue
            if current != new_value:
                right_choice_score[item_id] = new_value
                changed_item_count += 1

        right_facets[spec.right_facet_code]["choice_score"] = right_choice_score
        right_top[right_container_key] = right_facets
        updated[spec.right_top_code] = right_top

    return updated, changed_item_count


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = load_golden_rows(conn)
    total_changed_items = 0

    for row in rows:
        scale_struct = json.loads(row["scale_struct"])
        variant_label = determine_variant_label(str(row["sub_test_json"]))
        updated_scale_struct, changed_item_count = apply_reverse_to_variant(
            scale_struct=scale_struct,
            variant_label=variant_label,
        )
        if changed_item_count <= 0:
            continue
        conn.execute(
            """
            UPDATE SCALE
            SET struct = ?
            WHERE "test.id" = ? AND "condition.id" = ?
            """,
            (
                json.dumps(updated_scale_struct, ensure_ascii=False),
                row["test_id"],
                row["condition_id"],
            ),
        )
        total_changed_items += changed_item_count
        print(
            f"updated variant={variant_label} test_id={row['test_id']} condition_id={row['condition_id']} changed_shared_items={changed_item_count}"
        )

    conn.commit()
    conn.close()
    print(f"total_changed_shared_items={total_changed_items}")


if __name__ == "__main__":
    main()
