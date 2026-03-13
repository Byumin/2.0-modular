from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


class AdminLoginIn(BaseModel):
    admin_id: str = Field(min_length=1, max_length=50)
    admin_pw: str = Field(min_length=1, max_length=100)


class CreateCustomTestIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    test_id: str = Field(min_length=1, max_length=50)
    sub_test_json: str | None = None
    selected_scale_codes: list[str] = Field(min_length=1)


class AdditionalProfileFieldIn(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    type: Literal[
        "short_text",
        "long_text",
        "number",
        "date",
        "select",
        "multi_select",
        "phone",
        "email",
    ] = "short_text"
    required: bool = False
    placeholder: str = Field(default="", max_length=120)
    options: list[str] = Field(default_factory=list)


class CreateCustomTestWithFieldsIn(CreateCustomTestIn):
    additional_profile_fields: list[AdditionalProfileFieldIn] = Field(default_factory=list)


class AdminClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    birth_day: date | None = None
    memo: str = Field(default="", max_length=500)
    admin_custom_test_id: int | None = None


class AdminAssessmentLogIn(BaseModel):
    admin_client_id: int
    assessed_on: date | None = None


class UpdateCustomTestIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    selected_scale_codes: list[str] = Field(min_length=1)


class BulkDeleteCustomTestsIn(BaseModel):
    custom_test_ids: list[int] = Field(min_length=1)


class UpdateClientAssignmentIn(BaseModel):
    admin_custom_test_id: int | None = None


class SubmitCustomAssessmentIn(BaseModel):
    responder_name: str = Field(default="", max_length=80)
    profile: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, str] = Field(default_factory=dict)


class ValidateAssessmentProfileIn(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
