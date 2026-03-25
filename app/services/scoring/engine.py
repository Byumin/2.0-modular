from __future__ import annotations

from typing import Iterable

from app.services.scoring.base import ScoringContext, ScoringResult
from app.services.scoring.tests.registry import get_scorer_for_test


class ScoringEngine:
    def score_tests(self, *, test_ids: Iterable[str], context: ScoringContext) -> dict[str, ScoringResult]:
        results: dict[str, ScoringResult] = {}
        for raw_test_id in test_ids:
            test_id = str(raw_test_id).strip().upper()
            if not test_id:
                continue
            scorer = get_scorer_for_test(test_id)
            results[test_id] = scorer.score(context)
        return results
