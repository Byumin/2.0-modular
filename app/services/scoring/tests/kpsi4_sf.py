from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from app.db.session import engine
from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


def _load_kpsi4_sf_norm() -> dict[str, Any]:
    with engine.connect() as conn:
        row = conn.execute(
            text('SELECT map FROM norm WHERE "test.id" = :tid LIMIT 1'),
            {"tid": "K-PSI-4-SF"},
        ).fetchone()
    if row is None:
        return {}
    try:
        parsed = json.loads(row[0] or "{}")
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _apply_norm(
    *,
    result: ScoringResult,
    norm_map: dict[str, Any],
) -> ScoringResult:
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
                facet_code = str(facet_data.get("code", "")).strip()
                facet_total = facet_data.get("total_score", 0)
                facet_raw = str(int(facet_total)) if isinstance(facet_total, (int, float)) else "0"
                facet_entry = norm_map.get(facet_code, {}).get(facet_raw)
                if isinstance(facet_entry, dict):
                    facet_data["t_score"] = facet_entry.get("t")
                    facet_data["percentile"] = facet_entry.get("p")
                    facet_data["category"] = facet_entry.get("level")
                else:
                    facet_data["t_score"] = None
                    facet_data["percentile"] = None
                    facet_data["category"] = None

    result.meta["score_normalization"] = "t_score_percentile_norm"
    result.meta["missing_response_rule"] = "ignored"
    return result


class Kpsi4SfScorer(BaseScorer):
    test_id = "K-PSI-4-SF"

    def score(self, context: ScoringContext) -> ScoringResult:
        result = build_choice_score_result(self.test_id, context)
        if result.status == "skipped":
            return result
        norm_map = _load_kpsi4_sf_norm()
        return _apply_norm(result=result, norm_map=norm_map)
