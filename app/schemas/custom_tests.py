from typing import Literal

from pydantic import BaseModel, Field


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


class CreateCustomTestConfigIn(BaseModel):
    test_id: str = Field(min_length=1, max_length=50)
    selected_scale_codes: list[str] = Field(min_length=1)


class CreateCustomTestBatchIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    test_configs: list[CreateCustomTestConfigIn] = Field(min_length=1)
    additional_profile_fields: list[AdditionalProfileFieldIn] = Field(default_factory=list)


class UpdateCustomTestIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    selected_scale_codes: list[str] = Field(default_factory=list)
    test_configs: list[CreateCustomTestConfigIn] = Field(default_factory=list)


class BulkDeleteCustomTestsIn(BaseModel):
    custom_test_ids: list[int] = Field(min_length=1)
