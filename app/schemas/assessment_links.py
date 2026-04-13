from typing import Any, Literal

from pydantic import BaseModel, Field


class SubmitCustomAssessmentIn(BaseModel):
    responder_name: str = Field(default="", max_length=80)
    profile: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, str] = Field(default_factory=dict)
    client_id: int | None = None
    is_ambiguous_match: bool = False
    responder_choice: Literal["existing", "new"] | None = None
    candidate_client_ids: list[int] = Field(default_factory=list)


class ValidateAssessmentProfileIn(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
    client_id: int | None = None
    responder_choice: Literal["existing", "new"] | None = None


class RegisterAssessmentClientIn(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
