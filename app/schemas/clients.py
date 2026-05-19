from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class AdminClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    birth_day: date
    phone: str = Field(default="", max_length=30)
    address: str = Field(default="", max_length=200)
    is_closed: bool = False
    tags: list[str] = Field(default_factory=list)
    memo: str = Field(default="", max_length=500)


class ClientGroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#3b82f6", max_length=20)


class ClientGroupMemberIn(BaseModel):
    group_id: int


class ClientReportSectionIn(BaseModel):
    title: str = Field(default="", max_length=100)
    content: str = Field(default="")


class ClientReportIn(BaseModel):
    sections: list[ClientReportSectionIn] = Field(default_factory=list)


class AdminAssessmentLogIn(BaseModel):
    admin_client_id: int
    assessed_on: date | None = None


class CreateClientAssignmentIn(BaseModel):
    admin_custom_test_id: int


class ReportLlmChatIn(BaseModel):
    prompt: str = Field(min_length=1)
    selected_test: str = Field(min_length=1, max_length=30)
    model_name: str = Field(min_length=1, max_length=200)
    base_url: str = Field(min_length=1, max_length=500)
    api_key: str = Field(min_length=1, max_length=200)
    temperature: float = 0.2
    top_p: float = 0.9
    max_tokens: int = 700
    timeout: int = 120
    mock_mode: bool = False
