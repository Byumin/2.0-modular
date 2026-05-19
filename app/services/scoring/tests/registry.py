from __future__ import annotations

from app.services.scoring.base import BaseScorer, UnsupportedScorer
from app.services.scoring.tests.golden import GoldenScorer
from app.services.scoring.tests.pet import PetScorer
from app.services.scoring.tests.sts import StsScorer

_DEFAULT_SCORERS: dict[str, BaseScorer] = {
    "STS": StsScorer(),
    "GOLDEN": GoldenScorer(),
    "PET": PetScorer(),
}


def get_scorer_for_test(test_id: str) -> BaseScorer:
    # test_id를 가지고 해당 검사에 대한 채점 로직을 제공하는 Scorer 객체를 반환하는 함수
    normalized = str(test_id).strip().upper()
    if normalized in _DEFAULT_SCORERS:
        return _DEFAULT_SCORERS[normalized]
    return UnsupportedScorer(normalized)
