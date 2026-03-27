from __future__ import annotations

from app.services.scoring.base import BaseScorer, ScoringContext, ScoringResult
from app.services.scoring.utils import build_choice_score_result


class GoldenScorer(BaseScorer):
    test_id = "GOLDEN"

    def score(self, context: ScoringContext) -> ScoringResult:
        return build_choice_score_result(self.test_id, context)
