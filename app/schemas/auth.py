from pydantic import BaseModel, Field


class AdminLoginIn(BaseModel):
    admin_id: str = Field(min_length=1, max_length=50)
    admin_pw: str = Field(min_length=1, max_length=100)
