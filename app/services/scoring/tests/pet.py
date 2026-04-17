from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from app.db.session import engine
from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


def _load_pet_norm(condition_id: str = "PET_ALL") -> dict[str, Any]:
    with engine.connect() as conn:
        row = conn.execute(
            text('SELECT map FROM norm WHERE "test.id" = :tid AND "condition.id" = :cid LIMIT 1'),
            {"tid": "PET", "cid": condition_id},
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
    """원점수 → T점수 / 백분위 / 범주 변환"""
    for scale_key, scale_data in result.scales.items():
        if not isinstance(scale_data, dict):
            continue
        code = str(scale_data.get("code", "")).strip()
        total_score = scale_data.get("total_score", 0)
        raw_str = str(int(total_score)) if isinstance(total_score, (int, float)) else "0"

        scale_norm = norm_map.get(code, {})
        entry = scale_norm.get(raw_str)
        if isinstance(entry, dict):
            scale_data["t_score"] = entry.get("t")
            scale_data["percentile"] = entry.get("percentile")
            scale_data["category"] = entry.get("category")
        else:
            scale_data["t_score"] = None
            scale_data["percentile"] = None
            scale_data["category"] = None

        # facets에도 적용
        facets = scale_data.get("facets")
        if isinstance(facets, dict):
            for facet_code, facet_data in facets.items():
                if not isinstance(facet_data, dict):
                    continue
                f_raw = str(int(facet_data.get("total_score", 0)))
                f_norm = norm_map.get(facet_code, {})
                f_entry = f_norm.get(f_raw)
                if isinstance(f_entry, dict):
                    facet_data["t_score"] = f_entry.get("t")
                    facet_data["percentile"] = f_entry.get("percentile")
                    facet_data["category"] = f_entry.get("category")

    result.meta["score_normalization"] = "t_score_norm"
    return result


class PetScorer(BaseScorer):
    test_id = "PET"

    def score(self, context: ScoringContext) -> ScoringResult:
        result = build_choice_score_result(self.test_id, context)
        if result.status == "skipped":
            return result
        norm_map = _load_pet_norm()
        return _apply_norm(result=result, norm_map=norm_map)
