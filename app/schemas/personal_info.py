from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.values import Gender, SchoolAge, normalize_gender_value


class PersonalInfoCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: Gender
    birth_day: date
    school_age: SchoolAge

    @field_validator("gender", mode="before")
    @classmethod
    def normalize_gender(cls, value: object) -> str:
        return normalize_gender_value(value)


class PersonalInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gender: str
    birth_day: date
    school_age: str
    created_at: datetime
