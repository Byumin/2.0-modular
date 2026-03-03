from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.db.database import Base, engine, get_db
from app.db.models import PersonalInfo
from app.schemas.personal_info import PersonalInfoCreate, PersonalInfoOut
from app.schemas.profile import ProfileIn
from app.services.sub_test_service import make_sub_test_json

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Screening App", version="2.0.0")

PROFILE_BUFFER: list[dict] = []


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/assessment")
def assessment() -> FileResponse:
    return FileResponse(STATIC_DIR / "assessment.html")


@app.post("/api/profile")
def save_profile(payload: ProfileIn, db: Session = Depends(get_db)) -> dict:
    today = date.today()
    sub_test_json = make_sub_test_json(
        birth_day=payload.birth_day,
        school_age=payload.school_age,
        as_of=today,
        gender=payload.gender,
    )

    item = PersonalInfo(
        name=payload.name,
        gender=payload.gender,
        birth_day=payload.birth_day,
        school_age=payload.school_age,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    record = payload.model_dump()
    record["id"] = item.id
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


@app.post("/api/personal-info", response_model=PersonalInfoOut)
def create_personal_info(payload: PersonalInfoCreate, db: Session = Depends(get_db)) -> PersonalInfo:
    item = PersonalInfo(
        name=payload.name,
        gender=payload.gender,
        birth_day=payload.birth_day,
        school_age=payload.school_age,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/personal-info", response_model=list[PersonalInfoOut])
def list_personal_info(db: Session = Depends(get_db)) -> list[PersonalInfo]:
    return db.query(PersonalInfo).order_by(PersonalInfo.id.desc()).all()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "app/main.py", "ui": "enabled", "db": "sqlite"}
