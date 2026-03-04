from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from services.schemas import SchoolAge
from services.sub_test_service import make_sub_test_json

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Screening App", version="1.1.0")

PROFILE_BUFFER: list[dict] = []


Gender = Literal["male", "female"]


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: Gender
    birth_day: date
    school_age: SchoolAge

    @field_validator("gender", mode="before")
    @classmethod
    def normalize_gender(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("gender must be a string")

        normalized = value.strip().lower()
        mapping = {
            "male": "male",
            "m": "male",
            "남": "male",
            "female": "female",
            "f": "female",
            "여": "female",
        }
        if normalized not in mapping:
            raise ValueError("gender must be male/female")
        return mapping[normalized]


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/assessment")
def assessment() -> FileResponse:
    return FileResponse(STATIC_DIR / "assessment.html")


@app.post("/api/profile")
def save_profile(payload: ProfileIn) -> dict:
    today = date.today()
    sub_test_json = make_sub_test_json(
        birth_day=payload.birth_day,
        school_age=payload.school_age,
        as_of=today,
        gender=payload.gender,
    )

    record = payload.model_dump()
    record["sub_test_json"] = sub_test_json
    PROFILE_BUFFER.append(record)

    return {
        "message": "인적 정보가 저장되었습니다.",
        "next_url": "/assessment",
        "sub_test_json": sub_test_json,
    }


@app.get("/api/profile/latest")
def latest_profile() -> dict:
    return {"item": PROFILE_BUFFER[-1] if PROFILE_BUFFER else None}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "backend": "fastapi"}

# WSL 환경
# cd /mnt/c/Users/user/workspace/2.0-modular
# source .venv/bin/activate
# uvicorn app.main:app --reload --host 127.0.0.1 --port 8000