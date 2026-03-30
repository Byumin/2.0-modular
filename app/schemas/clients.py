from datetime import date

from pydantic import BaseModel, Field


class AdminClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    birth_day: date | None = None
    memo: str = Field(default="", max_length=500)
    admin_custom_test_id: int | None = None


class AdminAssessmentLogIn(BaseModel):
    admin_client_id: int
    assessed_on: date | None = None


class UpdateClientAssignmentIn(BaseModel):
    admin_custom_test_id: int | None = None


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
