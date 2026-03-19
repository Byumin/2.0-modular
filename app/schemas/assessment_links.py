from typing import Any

from pydantic import BaseModel, Field


class SubmitCustomAssessmentIn(BaseModel):
    responder_name: str = Field(default="", max_length=80)
    profile: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, str] = Field(default_factory=dict)


class ValidateAssessmentProfileIn(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
