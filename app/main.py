from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.db.database import Base, engine, get_db
from app.db.models import PersonalInfo
from app.schemas.personal_info import PersonalInfoOut
from app.schemas.profile import ProfileIn
from app.services.sub_test_service import make_sub_test_json

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static" # 프론트 정적 파일 위치

app = FastAPI(title="Screening App", version="2.0.0") # 앱 생성 + 메타데이터 설정

PROFILE_BUFFER: list[dict] = [] # 인적 정보 임시 저장소 (DB 대신, 서비스 간 데이터 전달용) -> 용도가 머지


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static") # 브라우저가 /static 경로로 요청할 때 STATIC_DIR에서 파일을 제공하도록 설정 (파일 서빙)


@app.on_event("startup") # 앱이 시작될 때
def on_startup() -> None:
    Base.metadata.create_all(bind=engine) # ORM 모델 기준 DB 테이블 생성 (없으면)


@app.get("/") # 루트 경로에 GET 요청이 오면 index.html 파일을 반환 -> 웹 화면 소스(html) 직접 서빙
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/assessment") # /assessment 경로에 GET 요청이 오면 assessment.html 파일을 반환 -> 웹 화면 소스(html) 직접 서빙
def assessment() -> FileResponse:
    return FileResponse(STATIC_DIR / "assessment.html")


@app.post("/api/profile") # /api/profile 경로에 POST 요청이 오면 -> 인적 정보 저장 + 검사 대상자 정보 생성
def save_profile(payload: ProfileIn, db: Session = Depends(get_db)) -> dict: # ProfileIn 스키마 형태로 받아서 
    today = date.today()
    sub_test_json = make_sub_test_json( # 오늘 날짜 기준 검사 대상자 정보 생성 -> 이건 단순히 반환용인가?
        birth_day=payload.birth_day,
        school_age=payload.school_age,
        as_of=today,
        gender=payload.gender,
    )

    item = PersonalInfo( # DB 모델 객체 생성 (ORM 모델, 레코드)
        name=payload.name,
        gender=payload.gender,
        birth_day=payload.birth_day,
        school_age=payload.school_age,
    )
    db.add(item) # DB 세션에 객체 추가 (커밋 전까지는 DB에 반영되지 않음)
    db.commit() # DB에 변경사항 반영 (INSERT 실행)
    db.refresh(item) # DB에서 방금 추가한 객체를 다시 조회해서 item 변수에 최신 상태로 반영 (id, created_at 등 자동 생성 필드 포함)

    record = payload.model_dump() # payload는 Pydantic 모델 객체로 model_dump() 메서드를 통해 dict 형태로 변환 -> record 변수에 저장
    record["id"] = item.id
    record["sub_test_json"] = sub_test_json
    PROFILE_BUFFER.append(record) # 인적 정보 + 검사 대상자 정보(record)를 PROFILE_BUFFER 리스트에 추가 -> 이게 왜 필요한지?

    return {
        "message": "인적 정보가 저장되었습니다.",
        "next_url": "/assessment",
        "sub_test_json": sub_test_json,
    }


@app.get("/api/profile/latest") # 최신 검사 대상자 정보 반환
def latest_profile() -> dict:
    return {"item": PROFILE_BUFFER[-1] if PROFILE_BUFFER else None} # PROFILE_BUFFER 리스트에서 가장 마지막에 추가된 항목을 반환 (최신 검사 대상자 정보)


@app.get("/api/personal-info", response_model=list[PersonalInfoOut])
def list_personal_info(db: Session = Depends(get_db)) -> list[PersonalInfo]:
    return db.query(PersonalInfo).order_by(PersonalInfo.id.desc()).all()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "app/main.py", "ui": "enabled", "db": "sqlite"}
