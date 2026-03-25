from __future__ import annotations

from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult


class GoldenScorer(BaseScorer):
    test_id = "GOLDEN"

    def score(self, context: ScoringContext) -> ScoringResult:
        return ScoringResult(
            status="not_implemented",
            test_id=self.test_id,
            scales={},
            meta={"message": "GOLDEN scoring strategy is not implemented yet."},
        )
