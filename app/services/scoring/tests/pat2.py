from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from app.db.session import engine
from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


def _sort_json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sort_json_value(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        sorted_items = [_sort_json_value(item) for item in value]
        if all(not isinstance(item, (dict, list)) for item in sorted_items):
            return sorted(sorted_items, key=lambda item: str(item))
        return sorted_items
    return value


def _normalize_json(raw_value: Any) -> str:
    try:
        parsed = json.loads(str(raw_value or "{}"))
    except (TypeError, json.JSONDecodeError):
        return str(raw_value or "").strip()
    return json.dumps(_sort_json_value(parsed), ensure_ascii=False, sort_keys=True)


def _load_pat2_norm_by_condition() -> dict[str, dict[str, Any]]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT nc.condition, n.map
                FROM norm n
                JOIN normcondition nc
                  ON nc.id = n."condition.id"
                 AND nc."test.id" = n."test.id"
                WHERE n."test.id" = :tid
                """
            ),
            {"tid": "PAT-2"},
        ).fetchall()

    norm_by_condition: dict[str, dict[str, Any]] = {}
    for condition_json, raw_map in rows:
        condition_key = _normalize_json(condition_json)
        try:
            parsed_map = json.loads(raw_map or "{}")
        except (TypeError, json.JSONDecodeError):
            parsed_map = {}
        if isinstance(parsed_map, dict):
            norm_by_condition[condition_key] = parsed_map
    return norm_by_condition


def _apply_norm(
    *,
    result: ScoringResult,
    norm_by_condition: dict[str, dict[str, Any]],
) -> ScoringResult:
    for scale_data in result.scales.values():
        if not isinstance(scale_data, dict):
            continue

        condition_key = _normalize_json(scale_data.get("sub_test_json", ""))
        norm_map = norm_by_condition.get(condition_key, {})
        code = str(scale_data.get("code", "")).strip()
        total_score = scale_data.get("total_score", 0)
        raw_str = str(int(total_score)) if isinstance(total_score, (int, float)) else "0"

        entry = norm_map.get(code, {}).get(raw_str)
        if isinstance(entry, dict):
            scale_data["t_score"] = None
            scale_data["percentile"] = entry.get("p")
            scale_data["category"] = entry.get("plevel")
        else:
            scale_data["t_score"] = None
            scale_data["percentile"] = None
            scale_data["category"] = None

    result.meta["score_normalization"] = "percentile_norm"
    result.meta["norm_condition_axis"] = "age_range+informant"
    return result


class Pat2Scorer(BaseScorer):
    test_id = "PAT-2"

    def score(self, context: ScoringContext) -> ScoringResult:
        result = build_choice_score_result(self.test_id, context)
        if result.status == "skipped":
            return result
        norm_by_condition = _load_pat2_norm_by_condition()
        return _apply_norm(result=result, norm_by_condition=norm_by_condition)
