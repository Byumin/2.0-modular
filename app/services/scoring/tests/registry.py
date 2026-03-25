from __future__ import annotations

from app.services.scoring.base import BaseScorer, UnsupportedScorer
from app.services.scoring.tests.golden import GoldenScorer
from app.services.scoring.tests.sts import StsScorer

_DEFAULT_SCORERS: dict[str, BaseScorer] = {
    "STS": StsScorer(),
    "GOLDEN": GoldenScorer(),
}


def get_scorer_for_test(test_id: str) -> BaseScorer:
    normalized = str(test_id).strip().upper()
    if normalized in _DEFAULT_SCORERS:
        return _DEFAULT_SCORERS[normalized]
    return UnsupportedScorer(normalized)
