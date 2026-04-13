from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AdditionalProfileFieldIn(BaseModel): # 추가 인적사항 필드 스키마
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

    @model_validator(mode="after")
    def validate_options_for_choice_types(self):
        if self.type not in {"select", "multi_select"}:
            return self
        normalized_options = [str(item).strip() for item in self.options if str(item).strip()]
        if not normalized_options:
            raise ValueError("select/multi_select type requires at least one option")
        return self


class CreateCustomTestConfigIn(BaseModel):
    test_id: str = Field(min_length=1, max_length=50)
    selected_scale_codes: list[str] = Field(min_length=1)
    excluded_sub_test_jsons: list[str] = Field(default_factory=list)


class CreateCustomTestBatchIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    client_intake_mode: Literal["pre_registered_only", "auto_create"] = "pre_registered_only"
    test_configs: list[CreateCustomTestConfigIn] = Field(min_length=1)
    additional_profile_fields: list[AdditionalProfileFieldIn] = Field(default_factory=list)


class UpdateCustomTestSettingsIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    client_intake_mode: Literal["pre_registered_only", "auto_create"] = "pre_registered_only"


class BulkDeleteCustomTestsIn(BaseModel):
    custom_test_ids: list[int] = Field(min_length=1)
