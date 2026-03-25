from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ScoringContext:
    custom_test_id: int
    custom_test_name: str
    profile: dict[str, Any]
    answers: dict[str, str]
    assessment_payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScoringResult:
    status: str
    test_id: str
    scales: dict[str, Any] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)


class BaseScorer(ABC):
    test_id: str

    @abstractmethod
    def score(self, context: ScoringContext) -> ScoringResult:
        raise NotImplementedError


class UnsupportedScorer(BaseScorer):
    def __init__(self, test_id: str) -> None:
        self.test_id = str(test_id).upper()

    def score(self, context: ScoringContext) -> ScoringResult:
        return ScoringResult(
            status="skipped",
            test_id=self.test_id,
            scales={},
            meta={"reason": "unsupported_test_id"},
        )
