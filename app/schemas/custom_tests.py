from typing import Literal

from pydantic import BaseModel, Field


class CreateCustomTestIn(BaseModel): # 커스텀 검사 생성에서 요청 바디 검증 스키마
    custom_test_name: str = Field(min_length=1, max_length=120)
    test_id: str = Field(min_length=1, max_length=50)
    sub_test_json: str | None = None # 이 스키마에서는 sub_test_json가 없어도 되도록 설정 -> 추후 원본 검사 정보에서 가져오도록 처리
    selected_scale_codes: list[str] = Field(min_length=1)


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


class CreateCustomTestWithFieldsIn(CreateCustomTestIn):
    additional_profile_fields: list[AdditionalProfileFieldIn] = Field(default_factory=list)


class UpdateCustomTestIn(BaseModel):
    custom_test_name: str = Field(min_length=1, max_length=120)
    selected_scale_codes: list[str] = Field(min_length=1)


class BulkDeleteCustomTestsIn(BaseModel):
    custom_test_ids: list[int] = Field(min_length=1)
