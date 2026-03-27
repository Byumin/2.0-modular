from __future__ import annotations

from typing import Any

from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


def _compute_choice_score_bounds(choice_score: dict[str, Any]) -> tuple[int | float, int | float]:
    min_score: int | float = 0
    max_score: int | float = 0
    for score_map in choice_score.values():
        if not isinstance(score_map, dict):
            continue
        numeric_scores: list[float] = []
        for raw_score in score_map.values():
            if not isinstance(raw_score, (int, float, str)) or not str(raw_score).strip():
                continue
            try:
                numeric_scores.append(float(raw_score))
            except (TypeError, ValueError):
                continue
        if not numeric_scores:
            continue
        min_score += min(numeric_scores)
        max_score += max(numeric_scores)
    return min_score, max_score


def _to_hundred_point_score(
    total_score: int | float,
    min_score: int | float,
    max_score: int | float,
) -> float | None:
    if not isinstance(min_score, (int, float)) or not isinstance(max_score, (int, float)):
        return None
    score_range = float(max_score) - float(min_score)
    if score_range <= 0:
        return None
    return round(((float(total_score) - float(min_score)) / score_range) * 100, 2)


def _apply_golden_max_score_hundred_point(
    *,
    context: ScoringContext,
    result: ScoringResult,
) -> ScoringResult:
    indexed_variants = context.scoring_index_by_test_variant.get("GOLDEN", {})
    if not indexed_variants or not result.scales:
        return result

    for sub_test_json, variant_index in indexed_variants.items():
        indexed_scales = variant_index.get("scales", {})
        if not isinstance(indexed_scales, dict):
            continue

        for code, raw_scale in indexed_scales.items():
            code_text = str(code).strip()
            if not code_text or not isinstance(raw_scale, dict):
                continue
            result_key = f"{sub_test_json}::{code_text}"
            scale_result = result.scales.get(result_key)
            if not isinstance(scale_result, dict):
                continue

            indexed_items = raw_scale.get("items")
            if isinstance(indexed_items, dict):
                min_score, max_score = _compute_choice_score_bounds(indexed_items)
                scale_result["min_score"] = min_score
                scale_result["max_score"] = max_score
                scale_result["converted_score_100"] = _to_hundred_point_score(
                    scale_result.get("total_score", 0),
                    min_score,
                    max_score,
                )
                continue

            indexed_facets = raw_scale.get("facets")
            facet_results = scale_result.get("facets")
            if not isinstance(indexed_facets, dict):
                continue

            total_min_score: int | float = 0
            total_max_score: int | float = 0
            for facet_code, raw_facet in indexed_facets.items():
                facet_code_text = str(facet_code).strip()
                if not facet_code_text or not isinstance(raw_facet, dict):
                    continue
                facet_items = raw_facet.get("items")
                if not isinstance(facet_items, dict):
                    continue
                facet_min_score, facet_max_score = _compute_choice_score_bounds(facet_items)
                total_min_score += facet_min_score
                total_max_score += facet_max_score
                if isinstance(facet_results, dict) and isinstance(facet_results.get(facet_code_text), dict):
                    facet_result = facet_results[facet_code_text]
                    facet_result["min_score"] = facet_min_score
                    facet_result["max_score"] = facet_max_score
                    facet_result["converted_score_100"] = _to_hundred_point_score(
                        facet_result.get("total_score", 0),
                        facet_min_score,
                        facet_max_score,
                    )

            scale_result["min_score"] = total_min_score
            scale_result["max_score"] = total_max_score
            scale_result["converted_score_100"] = _to_hundred_point_score(
                scale_result.get("total_score", 0),
                total_min_score,
                total_max_score,
            )

    result.meta["score_normalization"] = "min_max_to_100"
    return result


class GoldenScorer(BaseScorer):
    test_id = "GOLDEN"

    def score(self, context: ScoringContext) -> ScoringResult:
        result = build_choice_score_result(self.test_id, context)
        return _apply_golden_max_score_hundred_point(
            context=context,
            result=result,
        )
