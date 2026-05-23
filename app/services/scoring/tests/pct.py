from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from app.db.session import engine
from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


def _load_pct_norm(condition_id: str = "PCT_00000240") -> dict[str, Any]:
    with engine.connect() as conn:
        row = conn.execute(
            text('SELECT map FROM norm WHERE "test.id" = :tid AND "condition.id" = :cid LIMIT 1'),
            {"tid": "PCT", "cid": condition_id},
        ).fetchone()
    if row is None:
        return {}
    try:
        return json.loads(row[0] or "{}")
    except json.JSONDecodeError:
        return {}


def _apply_norm(
    *,
    result: ScoringResult,
    norm_map: dict[str, Any],
) -> ScoringResult:
    # B척도 + A척도 facets 모두 norm 조회 → t_score / percentile / category 부여
    for scale_data in result.scales.values():
        if not isinstance(scale_data, dict):
            continue
        code = str(scale_data.get("code", "")).strip()
        total_score = scale_data.get("total_score", 0)
        raw_str = str(int(total_score)) if isinstance(total_score, (int, float)) else "0"

        entry = norm_map.get(code, {}).get(raw_str)
        if isinstance(entry, dict):
            scale_data["t_score"] = entry.get("t")
            scale_data["percentile"] = entry.get("p")
            scale_data["category"] = entry.get("level")
        else:
            scale_data["t_score"] = None
            scale_data["percentile"] = None
            scale_data["category"] = None

        facets = scale_data.get("facets")
        if isinstance(facets, dict):
            for facet_data in facets.values():
                if not isinstance(facet_data, dict):
                    continue
                f_code = str(facet_data.get("code", "")).strip()
                f_total = facet_data.get("total_score", 0)
                f_raw = str(int(f_total)) if isinstance(f_total, (int, float)) else "0"
                f_entry = norm_map.get(f_code, {}).get(f_raw)
                if isinstance(f_entry, dict):
                    facet_data["t_score"] = f_entry.get("t")
                    facet_data["percentile"] = f_entry.get("p")
                    facet_data["category"] = f_entry.get("level")
                else:
                    facet_data["t_score"] = None
                    facet_data["percentile"] = None
                    facet_data["category"] = None

    result.meta["score_normalization"] = "t_score_norm"
    return result


class PctScorer(BaseScorer):
    test_id = "PCT"

    def score(self, context: ScoringContext) -> ScoringResult:
        result = build_choice_score_result(self.test_id, context)
        if result.status == "skipped":
            return result
        norm_map = _load_pct_norm()
        return _apply_norm(result=result, norm_map=norm_map)
