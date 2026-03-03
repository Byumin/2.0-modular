from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.schemas.values import Gender, SchoolAge, normalize_gender_value


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: Gender
    birth_day: date
    school_age: SchoolAge

    @field_validator("gender", mode="before")
    @classmethod
    def normalize_gender(cls, value: object) -> str:
        return normalize_gender_value(value)
