import hashlib
import json
import os
import secrets
from typing import Any, Literal
from datetime import date, timedelta
from pathlib import Path

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import (
    Base,
    engine,
    get_db,
)
from app.db.models import (
    AdminAssessmentLog,
    AdminClient,
    AdminClientAssignment,
    AdminCustomTestAccessLink,
    AdminCustomTestSubmission,
    AdminCustomTest,
    AdminUser,
)
from app.schemas.values import normalize_gender_value

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"

# FastAPI 앱 인스턴스: 전체 API/정적 라우팅의 진입점
app = FastAPI(title="Screening App", version="2.0.0")

# 메모리 세션 저장소: {admin_session_token: admin_user_id}
ADMIN_SESSIONS: dict[str, int] = {}


# 정적 파일 서빙 경로
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def on_startup() -> None:
    """앱 기동 시 DB 테이블 생성 및 기본 관리자 계정을 보장한다."""
    Base.metadata.create_all(bind=engine)
    seed_default_admin()

@app.get("/")
def index() -> FileResponse:
    """루트 화면(기본 진입 HTML)을 반환한다."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/assessment/custom/{access_token}")
def custom_assessment_page(access_token: str) -> FileResponse:
    """토큰 기반 검사 실시 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "assessment-custom.html")


@app.get("/admin")
def admin_login_page() -> FileResponse:
    """관리자 로그인 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "admin-login.html")


@app.get("/admin/workspace")
def admin_workspace_page() -> FileResponse:
    """관리자 대시보드 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "admin-workspace.html")


@app.get("/admin/clients")
def admin_clients_page() -> FileResponse:
    """내담자 관리 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "admin-clients.html")


@app.get("/admin/create")
def admin_create_page() -> FileResponse:
    """검사 관리/생성 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "admin-create.html")


@app.get("/admin/test-detail")
def admin_test_detail_page() -> FileResponse:
    """생성 검사 상세 화면 HTML을 반환한다."""
    return FileResponse(STATIC_DIR / "admin-test-detail.html")


@app.get("/health")
def health() -> dict:
    """헬스체크 응답을 반환한다."""
    return {"status": "ok", "service": "app/main.py", "ui": "enabled", "db": "sqlite"}


class AdminLoginIn(BaseModel):
    """관리자 로그인 요청 바디."""
    admin_id: str = Field(min_length=1, max_length=50)
    admin_pw: str = Field(min_length=1, max_length=100)


class CreateCustomTestIn(BaseModel):
    """생성 검사 기본 생성 요청 바디."""
    custom_test_name: str = Field(min_length=1, max_length=120)
    test_id: str = Field(min_length=1, max_length=50)
    sub_test_json: str = Field(min_length=2)
    selected_scale_codes: list[str] = Field(min_length=1)


class AdditionalProfileFieldIn(BaseModel):
    """검사 URL에서 추가로 받을 인적사항 필드 정의."""
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
    """생성 검사 + 추가 인적사항 정의 요청 바디."""
    additional_profile_fields: list[AdditionalProfileFieldIn] = Field(default_factory=list)


class AdminClientIn(BaseModel):
    """내담자 생성/수정 요청 바디."""
    name: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    birth_day: date | None = None
    memo: str = Field(default="", max_length=500)
    admin_custom_test_id: int | None = None


class AdminAssessmentLogIn(BaseModel):
    """내담자 검사 실시 이력 생성 요청 바디."""
    admin_client_id: int
    assessed_on: date | None = None


class UpdateCustomTestIn(BaseModel):
    """생성 검사 수정 요청 바디(이름/척도 코드)."""
    custom_test_name: str = Field(min_length=1, max_length=120)
    selected_scale_codes: list[str] = Field(min_length=1)


class BulkDeleteCustomTestsIn(BaseModel):
    """생성 검사 일괄 삭제 요청 바디."""
    custom_test_ids: list[int] = Field(min_length=1)


class UpdateClientAssignmentIn(BaseModel):
    """내담자-검사 배정 변경 요청 바디."""
    admin_custom_test_id: int | None = None


class SubmitCustomAssessmentIn(BaseModel):
    """검사 실시 제출 요청 바디."""
    responder_name: str = Field(default="", max_length=80)
    profile: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, str] = Field(default_factory=dict)


class ValidateAssessmentProfileIn(BaseModel):
    """검사 진행 전 배정 내담자 확인 요청 바디."""
    profile: dict[str, Any] = Field(default_factory=dict)


def make_password_hash(raw: str) -> str:
    """관리자 비밀번호 원문을 SHA-256 해시 문자열로 변환한다."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def seed_default_admin() -> None:
    """기본 관리자 계정(admin/admin1234)을 최초 1회 시드한다."""
    default_id = os.getenv("DEFAULT_ADMIN_ID", "admin")
    default_pw = os.getenv("DEFAULT_ADMIN_PW", "admin1234")
    with Session(engine) as db:
        exists = db.query(AdminUser).filter(AdminUser.username == default_id).first()
        if exists is not None:
            return
        db.add(AdminUser(username=default_id, password_hash=make_password_hash(default_pw)))
        db.commit()


def get_current_admin(
    db: Session,
    admin_session: str | None,
) -> AdminUser:
    """쿠키 세션 토큰으로 현재 로그인된 관리자를 조회/검증한다."""
    if not admin_session or admin_session not in ADMIN_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 로그인이 필요합니다.",
        )
    admin_id = ADMIN_SESSIONS[admin_session]
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if admin is None:
        ADMIN_SESSIONS.pop(admin_session, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 관리자 세션입니다.",
        )
    return admin


def serialize_admin_client(row: AdminClient) -> dict:
    """AdminClient ORM 객체를 API 응답용 dict로 직렬화한다."""
    return {
        "id": row.id,
        "name": row.name,
        "gender": row.gender,
        "birth_day": row.birth_day.isoformat() if row.birth_day else None,
        "memo": row.memo,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def derive_progress_status(assigned_count: int, assessed_count: int) -> str:
    """배정/실시 수로 검사 진행 상태(대기/실시/종료)를 계산한다."""
    if assigned_count <= 0:
        return "대기"
    if assessed_count <= 0:
        return "대기"
    if assessed_count < assigned_count:
        return "실시"
    return "종료"


def build_custom_test_items(db: Session, admin_id: int) -> list[dict]:
    """관리자별 생성 검사 목록 + 통계 정보를 합쳐 반환한다."""
    rows = (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.admin_user_id == admin_id)
        .order_by(AdminCustomTest.id.desc())
        .all()
    )

    assignment_rows = (
        db.query(
            AdminClientAssignment.admin_custom_test_id.label("custom_test_id"),
            func.count(AdminClientAssignment.id).label("assigned_count"),
        )
        .filter(AdminClientAssignment.admin_user_id == admin_id)
        .group_by(AdminClientAssignment.admin_custom_test_id)
        .all()
    )
    assigned_count_map = {row.custom_test_id: int(row.assigned_count) for row in assignment_rows}

    assessed_rows = (
        db.query(
            AdminClientAssignment.admin_custom_test_id.label("custom_test_id"),
            func.count(func.distinct(AdminAssessmentLog.admin_client_id)).label("assessed_count"),
        )
        .join(
            AdminAssessmentLog,
            (AdminAssessmentLog.admin_user_id == AdminClientAssignment.admin_user_id)
            & (AdminAssessmentLog.admin_client_id == AdminClientAssignment.admin_client_id),
            isouter=True,
        )
        .filter(AdminClientAssignment.admin_user_id == admin_id)
        .group_by(AdminClientAssignment.admin_custom_test_id)
        .all()
    )
    assessed_count_map = {row.custom_test_id: int(row.assessed_count) for row in assessed_rows}

    items = []
    for row in rows:
        selected_scale_codes = json.loads(row.selected_scales_json)
        additional_profile_fields = _normalize_additional_profile_fields(
            json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
        )
        assigned_count = assigned_count_map.get(row.id, 0)
        assessed_count = assessed_count_map.get(row.id, 0)
        progress_status = derive_progress_status(assigned_count, assessed_count)
        items.append(
            {
                "id": row.id,
                "custom_test_name": row.custom_test_name,
                "test_id": row.test_id,
                "sub_test_json": row.sub_test_json,
                "selected_scale_codes": selected_scale_codes,
                "additional_profile_fields": additional_profile_fields,
                "scale_count": len(selected_scale_codes),
                "assigned_count": assigned_count,
                "assessed_count": assessed_count,
                "progress_status": progress_status,
                "status": "운영중" if assigned_count > 0 else "대기",
                "created_at": row.created_at.isoformat(),
            }
        )
    return items


def upsert_client_assignment(
    db: Session,
    admin_id: int,
    client_id: int,
    custom_test_id: int | None,
) -> None:
    """내담자 배정을 신규 생성/수정/해제(None)한다."""
    current = (
        db.query(AdminClientAssignment)
        .filter(
            AdminClientAssignment.admin_user_id == admin_id,
            AdminClientAssignment.admin_client_id == client_id,
        )
        .first()
    )

    if custom_test_id is None:
        if current is not None:
            db.delete(current)
        return

    if current is None:
        db.add(
            AdminClientAssignment(
                admin_user_id=admin_id,
                admin_client_id=client_id,
                admin_custom_test_id=custom_test_id,
            )
        )
        return
    current.admin_custom_test_id = custom_test_id


def find_assigned_client_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> tuple[AdminClient | None, str]:
    """입력 프로필이 해당 검사에 실제 배정된 내담자인지 확인한다."""
    assigned_clients = (
        db.query(AdminClient)
        .join(
            AdminClientAssignment,
            (AdminClientAssignment.admin_client_id == AdminClient.id)
            & (AdminClientAssignment.admin_user_id == admin_user_id),
        )
        .filter(
            AdminClient.admin_user_id == admin_user_id,
            AdminClientAssignment.admin_custom_test_id == custom_test_id,
        )
        .all()
    )
    if not assigned_clients:
        return None, "이 검사에 배정된 내담자가 없습니다. 관리자에게 문의해주세요."

    name = str(profile.get("name", "")).strip()
    if not name:
        return None, "이름을 입력해주세요."

    candidates = [row for row in assigned_clients if row.name.strip() == name]
    if not candidates:
        return None, "배정된 내담자 정보와 일치하지 않습니다. 이름을 확인해주세요."

    gender = str(profile.get("gender", "")).strip()
    if gender:
        candidates = [row for row in candidates if (row.gender or "").strip() == gender]
        if not candidates:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 성별을 확인해주세요."

    birth_day_text = str(profile.get("birth_day", "")).strip()
    if birth_day_text:
        try:
            birth_day_value = date.fromisoformat(birth_day_text)
        except ValueError:
            return None, "생년월일 형식이 올바르지 않습니다."
        candidates = [row for row in candidates if row.birth_day == birth_day_value]
        if not candidates:
            return None, "배정된 내담자 정보와 일치하지 않습니다. 생년월일을 확인해주세요."

    if len(candidates) > 1:
        return None, "동일한 이름의 내담자가 여러 명입니다. 성별/생년월일을 함께 입력해주세요."
    return candidates[0], ""


def _sort_item_texts(item_json: dict | list | str) -> list[str]:
    """문항 JSON을 화면 표시용 정렬 리스트로 변환한다."""
    if isinstance(item_json, dict):
        def sort_key(key: str) -> tuple[int, str]:
            return (0, f"{int(key):08d}") if str(key).isdigit() else (1, str(key))

        return [str(v) for _, v in sorted(item_json.items(), key=lambda kv: sort_key(str(kv[0])))]
    if isinstance(item_json, list):
        return [str(v) for v in item_json]
    if isinstance(item_json, str):
        return [item_json]
    return []


def _normalize_item_map(item_json: dict | list | str) -> dict[str, str]:
    """문항 JSON을 {문항ID: 문항텍스트} 딕셔너리로 정규화한다."""
    if isinstance(item_json, dict):
        return {str(k): str(v) for k, v in item_json.items()}
    if isinstance(item_json, list):
        return {str(i + 1): str(v) for i, v in enumerate(item_json)}
    if isinstance(item_json, str):
        return {"1": item_json}
    return {}


def _parse_response_options(item_template: str | None) -> list[dict]:
    """item_template에서 공통 응답 선택지(value/label) 목록을 추출한다."""
    if not item_template:
        return []
    try:
        parsed = json.loads(item_template)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict) or not parsed:
        return []

    first_key = next(iter(parsed.keys()))
    first_item = parsed.get(first_key)
    if not isinstance(first_item, dict):
        return []

    options = []
    for value, label in first_item.items():
        options.append({"value": str(value), "label": str(label)})
    options.sort(key=lambda x: (0, int(x["value"])) if x["value"].isdigit() else (1, x["value"]))
    return options


def _derive_required_profile_fields(sub_test_json: str) -> list[str]:
    """sub_test_json 조건에서 필수 인적사항 키를 도출한다."""
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        parsed = {}

    required: list[str] = []
    if isinstance(parsed.get("gender"), list) and parsed.get("gender"):
        required.append("gender")
    if isinstance(parsed.get("age_range"), dict):
        required.append("birth_day")

    school_raw = (
        parsed.get("school_ages")
        or parsed.get("school_age")
        or parsed.get("school_grades")
        or parsed.get("school_grade")
        or parsed.get("grades")
        or parsed.get("grade")
    )
    if (isinstance(school_raw, list) and school_raw) or (isinstance(school_raw, str) and school_raw.strip()):
        required.append("school_age")

    return required


def _normalize_additional_profile_fields(raw: Any) -> list[dict]:
    """추가 인적사항 원본 데이터를 유효한 필드 스키마 리스트로 정규화한다."""
    normalized: list[dict] = []
    seen_labels: set[str] = set()
    if not isinstance(raw, list):
        return normalized

    for item in raw:
        if isinstance(item, str):
            label = item.strip()
            if not label:
                continue
            key = label.casefold()
            if key in seen_labels:
                continue
            seen_labels.add(key)
            normalized.append(
                {
                    "label": label,
                    "type": "short_text",
                    "required": False,
                    "placeholder": "",
                    "options": [],
                }
            )
            continue

        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip()
        field_type = str(item.get("type", "short_text")).strip()
        required = bool(item.get("required", False))
        placeholder = str(item.get("placeholder", "")).strip()
        options_raw = item.get("options", [])

        if not label:
            continue
        if len(label) > 60:
            label = label[:60]
        if len(placeholder) > 120:
            placeholder = placeholder[:120]

        allowed_types = {
            "short_text",
            "long_text",
            "number",
            "date",
            "select",
            "multi_select",
            "phone",
            "email",
        }
        if field_type not in allowed_types:
            field_type = "short_text"

        options: list[str] = []
        if field_type in {"select", "multi_select"}:
            seen_opts: set[str] = set()
            if isinstance(options_raw, list):
                for opt in options_raw:
                    value = str(opt).strip()
                    if not value:
                        continue
                    if len(value) > 40:
                        value = value[:40]
                    opt_key = value.casefold()
                    if opt_key in seen_opts:
                        continue
                    seen_opts.add(opt_key)
                    options.append(value)
            if not options:
                continue

        key = label.casefold()
        if key in seen_labels:
            continue
        seen_labels.add(key)
        normalized.append(
            {
                "label": label,
                "type": field_type,
                "required": required,
                "placeholder": placeholder,
                "options": options,
            }
        )

    return normalized


def build_custom_assessment_payload(custom_test_row: AdminCustomTest) -> dict:
    """생성 검사 1건을 검사 실시 화면용 payload로 조합한다."""
    with engine.connect() as conn:
        row = conn.exec_driver_sql(
            """
            SELECT
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct AS scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            WHERE i.test_id = ? AND i.sub_test_json = ?
            LIMIT 1
            """,
            (custom_test_row.test_id, custom_test_row.sub_test_json),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="검사 원본 데이터를 찾을 수 없습니다.")

    item_json = json.loads(row.item_json)
    item_meta = json.loads(row.item_meta_json)
    scale_struct = json.loads(row.scale_struct)
    item_map = _normalize_item_map(item_json)
    selected_codes = set(json.loads(custom_test_row.selected_scales_json))

    selected_scales = []
    selected_item_ids: set[str] = set()
    for code, value in scale_struct.items():
        if code not in selected_codes:
            continue
        item_ids = sorted(
            [str(item_id) for item_id in value.get("choice_score", {}).keys()],
            key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
        )
        selected_item_ids.update(item_ids)
        selected_scales.append(
            {
                "code": str(code),
                "name": str(value.get("name", code)),
                "item_ids": item_ids,
            }
        )

    sorted_item_ids = sorted(selected_item_ids, key=lambda x: (0, int(x)) if x.isdigit() else (1, x))
    items = [
        {"id": item_id, "text": item_map.get(item_id, "")}
        for item_id in sorted_item_ids
        if item_map.get(item_id)
    ]

    response_options = _parse_response_options(row.item_template)

    additional_profile_fields = _normalize_additional_profile_fields(
        json.loads(getattr(custom_test_row, "additional_profile_fields_json", "[]") or "[]")
    )

    return {
        "custom_test_id": custom_test_row.id,
        "custom_test_name": custom_test_row.custom_test_name,
        "test_id": custom_test_row.test_id,
        "sub_test_json": custom_test_row.sub_test_json,
        "display_name": item_meta.get("name", custom_test_row.custom_test_name),
        "required_profile_fields": _derive_required_profile_fields(custom_test_row.sub_test_json),
        "additional_profile_fields": additional_profile_fields,
        "selected_scale_codes": sorted(selected_codes),
        "selected_scales": selected_scales,
        "items": items,
        "item_count": len(items),
        "response_options": response_options,
    }


@app.post("/api/admin/login")
def admin_login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> JSONResponse:
    """관리자 로그인 처리 후 세션 쿠키를 발급한다."""
    admin = db.query(AdminUser).filter(AdminUser.username == payload.admin_id).first()
    if admin is None or admin.password_hash != make_password_hash(payload.admin_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 ID 또는 비밀번호가 올바르지 않습니다.",
        )

    token = secrets.token_urlsafe(32)
    ADMIN_SESSIONS[token] = admin.id
    response = JSONResponse({"message": "로그인되었습니다.", "next_url": "/admin/workspace"})
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 8,
    )
    return response


@app.post("/api/admin/logout")
def admin_logout(admin_session: str | None = Cookie(default=None)) -> Response:
    """관리자 세션을 만료시키고 쿠키를 제거한다."""
    if admin_session:
        ADMIN_SESSIONS.pop(admin_session, None)
    response = JSONResponse({"message": "로그아웃되었습니다."})
    response.delete_cookie("admin_session")
    return response


@app.get("/api/admin/me")
def admin_me(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """현재 로그인 관리자 정보를 반환한다."""
    admin = get_current_admin(db, admin_session)
    return {"id": admin.id, "username": admin.username}


@app.get("/api/admin/tests/catalog")
def admin_test_catalog(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """원본 검사(parent_*) 카탈로그를 관리자 화면용 구조로 반환한다."""
    def format_age_label(sub_test_json: str) -> str:
        """sub_test_json을 사람이 읽는 연령/학령 라벨로 변환한다."""
        try:
            parsed = json.loads(sub_test_json or "{}")
        except json.JSONDecodeError:
            return "연령/학령 정보 없음"

        age_range = parsed.get("age_range", {})
        start = age_range.get("start_inclusive", [])
        end_exclusive = age_range.get("end_exclusive", [])

        age_text = ""
        if (
            isinstance(start, list)
            and isinstance(end_exclusive, list)
            and start
            and end_exclusive
            and isinstance(start[0], int)
            and isinstance(end_exclusive[0], int)
        ):
            start_year = start[0]
            end_year = end_exclusive[0]
            if end_year >= 100:
                age_text = f"만 {start_year}세 이상"
            else:
                age_text = f"만 {start_year}~{max(start_year, end_year - 1)}세"

        school_raw = (
            parsed.get("school_ages")
            or parsed.get("school_age")
            or parsed.get("school_grades")
            or parsed.get("school_grade")
            or parsed.get("grades")
            or parsed.get("grade")
        )
        school_text = ""
        if isinstance(school_raw, list) and school_raw:
            school_text = ", ".join(str(x) for x in school_raw)
        elif isinstance(school_raw, str) and school_raw.strip():
            school_text = school_raw.strip()

        if age_text and school_text:
            return f"{age_text} / {school_text}"
        if age_text:
            return age_text
        if school_text:
            return school_text
        return "연령/학령 정보 없음"

    def sort_item_texts(item_json: dict | list | str) -> list[str]:
        """문항 JSON을 정렬된 리스트 형태로 변환한다."""
        if isinstance(item_json, dict):
            def sort_key(key: str) -> tuple[int, str]:
                return (0, f"{int(key):08d}") if str(key).isdigit() else (1, str(key))

            return [str(v) for _, v in sorted(item_json.items(), key=lambda kv: sort_key(str(kv[0])))]
        if isinstance(item_json, list):
            return [str(v) for v in item_json]
        if isinstance(item_json, str):
            return [item_json]
        return []

    def normalize_item_map(item_json: dict | list | str) -> dict[str, str]:
        """문항 JSON을 id->text 맵으로 변환한다."""
        if isinstance(item_json, dict):
            return {str(k): str(v) for k, v in item_json.items()}
        if isinstance(item_json, list):
            return {str(i + 1): str(v) for i, v in enumerate(item_json)}
        if isinstance(item_json, str):
            return {"1": item_json}
        return {}

    def parse_response_options(item_template: str | None) -> list[dict]:
        """응답 템플릿에서 선택지 목록을 추출한다."""
        if not item_template:
            return []
        try:
            parsed = json.loads(item_template)
        except json.JSONDecodeError:
            return []
        if not isinstance(parsed, dict) or not parsed:
            return []

        first_key = next(iter(parsed.keys()))
        first_item = parsed.get(first_key)
        if not isinstance(first_item, dict):
            return []

        options = []
        for value, label in first_item.items():
            options.append({"value": str(value), "label": str(label)})
        options.sort(key=lambda x: (0, int(x["value"])) if x["value"].isdigit() else (1, x["value"]))
        return options

    get_current_admin(db, admin_session)
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            """
            SELECT
                i.test_id,
                i.sub_test_json,
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            ORDER BY i.test_id, i.sub_test_json
            """
        ).fetchall()

    tests: dict[str, list[dict]] = {}
    for row in rows:
        item_json = json.loads(row.item_json)
        item_meta = json.loads(row.item_meta_json)
        scale_struct = json.loads(row.scale_struct)
        item_map = normalize_item_map(item_json)
        response_options = parse_response_options(row.item_template)
        response_scale_label = f"{len(response_options)}점 척도" if response_options else "응답형식 정보 없음"
        sub_test = {
            "sub_test_json": row.sub_test_json,
            "display_name": item_meta.get("name", "이름 없음"),
            "item_count": item_meta.get("item_count"),
            "age_label": format_age_label(row.sub_test_json),
            "item_texts": sort_item_texts(item_json),
            "item_map": item_map,
            "response_options": response_options,
            "response_scale_label": response_scale_label,
            "scales": [
                {
                    "code": code,
                    "name": value.get("name", code),
                    "item_ids": sorted(
                        [str(item_id) for item_id in value.get("choice_score", {}).keys()],
                        key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
                    ),
                }
                for code, value in scale_struct.items()
            ],
        }
        tests.setdefault(row.test_id, []).append(sub_test)

    return {"tests": [{"test_id": test_id, "sub_tests": sub_tests} for test_id, sub_tests in tests.items()]}


@app.get("/api/admin/custom-tests")
def list_admin_custom_tests(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """관리자별 생성 검사 목록을 반환한다."""
    admin = get_current_admin(db, admin_session)
    return {"items": build_custom_test_items(db, admin.id)}


@app.get("/api/admin/custom-tests/management")
def list_admin_custom_tests_for_management(
    q: str | None = None,
    status: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """검사명/상태/기간 조건으로 생성 검사 목록을 필터링해 반환한다."""
    admin = get_current_admin(db, admin_session)
    items = build_custom_test_items(db, admin.id)

    filtered = items
    if q:
        q_norm = q.strip().lower()
        filtered = [
            item
            for item in filtered
            if q_norm in item["custom_test_name"].lower() or q_norm in item["test_id"].lower()
        ]
    if status in {"대기", "실시", "종료"}:
        filtered = [item for item in filtered if item["progress_status"] == status]
    if created_from:
        filtered = [item for item in filtered if item["created_at"][:10] >= created_from.isoformat()]
    if created_to:
        filtered = [item for item in filtered if item["created_at"][:10] <= created_to.isoformat()]

    return {"items": filtered}


@app.post("/api/admin/custom-tests")
def create_admin_custom_test(
    payload: CreateCustomTestWithFieldsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """새 생성 검사(child_test)를 검증 후 저장한다."""
    admin = get_current_admin(db, admin_session)

    with engine.connect() as conn:
        row = conn.exec_driver_sql(
            """
            SELECT scale_struct
            FROM parent_scale
            WHERE test_id = ? AND sub_test_json = ?
            """,
            (payload.test_id, payload.sub_test_json),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="선택한 검사 데이터가 존재하지 않습니다.")

    scale_struct = json.loads(row.scale_struct)
    available_scale_codes = set(scale_struct.keys())
    selected_codes = set(payload.selected_scale_codes)
    if not selected_codes.issubset(available_scale_codes):
        raise HTTPException(status_code=400, detail="유효하지 않은 척도 코드가 포함되어 있습니다.")

    normalized_fields = _normalize_additional_profile_fields(
        [field.model_dump() for field in payload.additional_profile_fields]
    )
    if len(normalized_fields) != len(payload.additional_profile_fields):
        raise HTTPException(status_code=400, detail="추가 인적사항 항목 설정을 확인해주세요.")

    new_item = AdminCustomTest(
        admin_user_id=admin.id,
        test_id=payload.test_id,
        sub_test_json=payload.sub_test_json,
        custom_test_name=payload.custom_test_name,
        selected_scales_json=json.dumps(payload.selected_scale_codes, ensure_ascii=False),
        additional_profile_fields_json=json.dumps(normalized_fields, ensure_ascii=False),
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": "검사가 생성되었습니다.", "id": new_item.id}


@app.get("/api/admin/custom-tests/{custom_test_id}")
def get_admin_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """생성 검사 1건의 상세 설정 정보를 반환한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")
    selected_scale_codes = json.loads(row.selected_scales_json)
    additional_profile_fields = _normalize_additional_profile_fields(
        json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
    )
    return {
        "id": row.id,
        "custom_test_name": row.custom_test_name,
        "test_id": row.test_id,
        "sub_test_json": row.sub_test_json,
        "selected_scale_codes": selected_scale_codes,
        "additional_profile_fields": additional_profile_fields,
        "scale_count": len(selected_scale_codes),
        "created_at": row.created_at.isoformat(),
    }


@app.post("/api/admin/custom-tests/{custom_test_id}/access-link")
def generate_custom_test_access_link(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """생성 검사 1건의 실시 URL 토큰을 발급(또는 재사용)한다."""
    admin = get_current_admin(db, admin_session)
    custom_test = (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin.id)
        .first()
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    link = (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.admin_user_id == admin.id,
            AdminCustomTestAccessLink.admin_custom_test_id == custom_test.id,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .order_by(AdminCustomTestAccessLink.id.desc())
        .first()
    )
    if link is None:
        link = AdminCustomTestAccessLink(
            admin_user_id=admin.id,
            admin_custom_test_id=custom_test.id,
            access_token=secrets.token_urlsafe(24),
            is_active=True,
        )
        db.add(link)
        db.commit()
        db.refresh(link)

    return {
        "custom_test_id": custom_test.id,
        "custom_test_name": custom_test.custom_test_name,
        "access_token": link.access_token,
        "assessment_url": f"/assessment/custom/{link.access_token}",
    }


@app.get("/api/assessment-links/{access_token}")
def get_custom_test_by_access_link(
    access_token: str,
    db: Session = Depends(get_db),
) -> dict:
    """실시 URL 토큰으로 검사 실시 payload를 반환한다."""
    link = (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.access_token == access_token,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = (
        db.query(AdminCustomTest)
        .filter(
            AdminCustomTest.id == link.admin_custom_test_id,
            AdminCustomTest.admin_user_id == link.admin_user_id,
        )
        .first()
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    payload = build_custom_assessment_payload(custom_test)
    payload["access_token"] = access_token
    return payload


@app.post("/api/assessment-links/{access_token}/validate-profile")
def validate_custom_test_profile_by_access_link(
    access_token: str,
    payload: ValidateAssessmentProfileIn,
    db: Session = Depends(get_db),
) -> dict:
    """실시 진행 전 입력 인적사항이 배정된 내담자인지 검증한다."""
    link = (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.access_token == access_token,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = (
        db.query(AdminCustomTest)
        .filter(
            AdminCustomTest.id == link.admin_custom_test_id,
            AdminCustomTest.admin_user_id == link.admin_user_id,
        )
        .first()
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=payload.profile or {},
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)
    return {"message": "배정된 내담자 확인이 완료되었습니다."}


@app.post("/api/assessment-links/{access_token}/submit")
def submit_custom_test_by_access_link(
    access_token: str,
    payload: SubmitCustomAssessmentIn,
    db: Session = Depends(get_db),
) -> dict:
    """실시 URL 응답 제출을 검증하고 결과를 저장한다."""
    link = (
        db.query(AdminCustomTestAccessLink)
        .filter(
            AdminCustomTestAccessLink.access_token == access_token,
            AdminCustomTestAccessLink.is_active.is_(True),
        )
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = (
        db.query(AdminCustomTest)
        .filter(
            AdminCustomTest.id == link.admin_custom_test_id,
            AdminCustomTest.admin_user_id == link.admin_user_id,
        )
        .first()
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    assessment_payload = build_custom_assessment_payload(custom_test)
    valid_item_ids = {item["id"] for item in assessment_payload["items"]}
    if not valid_item_ids:
        raise HTTPException(status_code=400, detail="문항 데이터가 없습니다.")

    cleaned_answers: dict[str, str] = {}
    for item_id, value in (payload.answers or {}).items():
        key = str(item_id)
        if key not in valid_item_ids:
            continue
        cleaned_answers[key] = str(value)

    if len(cleaned_answers) != len(valid_item_ids):
        raise HTTPException(status_code=400, detail="모든 문항에 응답해주세요.")

    def sanitize_profile_value(value: Any) -> Any:
        """프로필 값 타입을 JSON 저장 가능한 안전 타입으로 변환한다."""
        if value is None:
            return ""
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, list):
            return [str(v) for v in value if v is not None]
        return str(value)

    profile: dict[str, Any] = {
        str(k): sanitize_profile_value(v)
        for k, v in (payload.profile or {}).items()
    }
    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=profile,
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)

    profile_name = str(profile.get("name", "")).strip()
    responder_name = profile_name or payload.responder_name.strip()

    submission = AdminCustomTestSubmission(
        admin_user_id=link.admin_user_id,
        admin_custom_test_id=custom_test.id,
        access_token=access_token,
        responder_name=responder_name,
        answers_json=json.dumps(
            {
                "profile": profile,
                "answers": cleaned_answers,
            },
            ensure_ascii=False,
        ),
    )
    db.add(submission)
    db.commit()
    return {"message": "검사가 제출되었습니다.", "submitted_item_count": len(cleaned_answers)}


@app.put("/api/admin/custom-tests/{custom_test_id}")
def update_admin_custom_test(
    custom_test_id: int,
    payload: UpdateCustomTestIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """생성 검사 이름/선택 척도를 수정한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    with engine.connect() as conn:
        scale_row = conn.exec_driver_sql(
            """
            SELECT scale_struct
            FROM parent_scale
            WHERE test_id = ? AND sub_test_json = ?
            """,
            (row.test_id, row.sub_test_json),
        ).fetchone()
    if scale_row is None:
        raise HTTPException(status_code=404, detail="원본 척도 데이터를 찾을 수 없습니다.")

    available_scale_codes = set(json.loads(scale_row.scale_struct).keys())
    selected_codes = set(payload.selected_scale_codes)
    if not selected_codes.issubset(available_scale_codes):
        raise HTTPException(status_code=400, detail="유효하지 않은 척도 코드가 포함되어 있습니다.")

    row.custom_test_name = payload.custom_test_name.strip()
    row.selected_scales_json = json.dumps(payload.selected_scale_codes, ensure_ascii=False)
    db.commit()
    return {"message": "검사 설정이 수정되었습니다."}


@app.delete("/api/admin/custom-tests/{custom_test_id}")
def delete_admin_custom_test(
    custom_test_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """생성 검사 1건과 관련 배정을 함께 삭제한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminCustomTest)
        .filter(AdminCustomTest.id == custom_test_id, AdminCustomTest.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin.id,
        AdminClientAssignment.admin_custom_test_id == row.id,
    ).delete()
    db.delete(row)
    db.commit()
    return {"message": "검사가 삭제되었습니다."}


@app.post("/api/admin/custom-tests/bulk-delete")
def bulk_delete_admin_custom_tests(
    payload: BulkDeleteCustomTestsIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """선택한 생성 검사들을 일괄 삭제한다."""
    admin = get_current_admin(db, admin_session)
    target_ids = sorted({x for x in payload.custom_test_ids if isinstance(x, int) and x > 0})
    if not target_ids:
        raise HTTPException(status_code=400, detail="삭제할 검사 ID가 없습니다.")

    rows = (
        db.query(AdminCustomTest.id)
        .filter(
            AdminCustomTest.admin_user_id == admin.id,
            AdminCustomTest.id.in_(target_ids),
        )
        .all()
    )
    found_ids = [row.id for row in rows]
    if not found_ids:
        return {"message": "삭제할 검사가 없습니다.", "deleted_count": 0}

    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin.id,
        AdminClientAssignment.admin_custom_test_id.in_(found_ids),
    ).delete(synchronize_session=False)
    db.query(AdminCustomTest).filter(
        AdminCustomTest.admin_user_id == admin.id,
        AdminCustomTest.id.in_(found_ids),
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "선택한 검사가 삭제되었습니다.", "deleted_count": len(found_ids)}


@app.get("/api/admin/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """대시보드 요약/목록/통계 데이터를 한 번에 반환한다."""
    admin = get_current_admin(db, admin_session)

    tests = list_admin_custom_tests(db=db, admin_session=admin_session)["items"]
    clients = list_admin_clients(db=db, admin_session=admin_session)["items"]
    stats = admin_assessment_stats(days=14, db=db, admin_session=admin_session)["items"]

    total_clients = len(clients)
    not_started = sum(1 for item in clients if item["status"] == "미실시")
    today_iso = date.today().isoformat()
    today_assessed_count = next(
        (item["count"] for item in stats if item["date"] == today_iso),
        0,
    )

    recent_clients = sorted(
        clients,
        key=lambda x: (
            0 if x["status"] == "미실시" else 1,
            x["last_assessed_on"] or "",
            x["created_at"],
        ),
        reverse=True,
    )[:10]

    return {
        "summary": {
            "running_tests": len(tests),
            "total_clients": total_clients,
            "not_started_clients": not_started,
            "today_assessments": int(today_assessed_count or 0),
        },
        "tests": tests,
        "clients": recent_clients,
        "stats": stats,
    }


@app.get("/api/admin/clients")
def list_admin_clients(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """관리자 소유 내담자 목록 + 배정/최근 실시 상태를 반환한다."""
    admin = get_current_admin(db, admin_session)
    rows = (
        db.query(AdminClient)
        .filter(AdminClient.admin_user_id == admin.id)
        .order_by(AdminClient.id.desc())
        .all()
    )

    assignment_rows = (
        db.query(AdminClientAssignment, AdminCustomTest.custom_test_name)
        .join(
            AdminCustomTest,
            AdminCustomTest.id == AdminClientAssignment.admin_custom_test_id,
        )
        .filter(AdminClientAssignment.admin_user_id == admin.id)
        .all()
    )
    assignment_map = {
        row.AdminClientAssignment.admin_client_id: {
            "custom_test_id": row.AdminClientAssignment.admin_custom_test_id,
            "custom_test_name": row.custom_test_name,
        }
        for row in assignment_rows
    }

    log_rows = (
        db.query(
            AdminAssessmentLog.admin_client_id.label("client_id"),
            func.max(AdminAssessmentLog.assessed_on).label("last_assessed_on"),
        )
        .filter(AdminAssessmentLog.admin_user_id == admin.id)
        .group_by(AdminAssessmentLog.admin_client_id)
        .all()
    )
    log_map = {row.client_id: row.last_assessed_on for row in log_rows}
    today_iso = date.today().isoformat()

    items = []
    for row in rows:
        base = serialize_admin_client(row)
        assigned = assignment_map.get(row.id)
        last_assessed_on = log_map.get(row.id)
        status_text = "미실시"
        if last_assessed_on is not None:
            status_text = "완료" if last_assessed_on.isoformat() == today_iso else "진행중"
        base["assigned_custom_test_id"] = assigned["custom_test_id"] if assigned else None
        base["assigned_custom_test_name"] = assigned["custom_test_name"] if assigned else None
        base["last_assessed_on"] = last_assessed_on.isoformat() if last_assessed_on else None
        base["status"] = status_text
        items.append(base)

    return {"items": items}


@app.post("/api/admin/clients")
def create_admin_client(
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """내담자를 생성하고 필요 시 검사 배정까지 저장한다."""
    admin = get_current_admin(db, admin_session)
    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if payload.admin_custom_test_id is not None:
        exists = (
            db.query(AdminCustomTest)
            .filter(
                AdminCustomTest.id == payload.admin_custom_test_id,
                AdminCustomTest.admin_user_id == admin.id,
            )
            .first()
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    new_item = AdminClient(
        admin_user_id=admin.id,
        name=payload.name.strip(),
        gender=normalized_gender,
        birth_day=payload.birth_day,
        memo=payload.memo.strip(),
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=new_item.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    db.commit()
    return {"message": "내담자가 등록되었습니다.", "item": serialize_admin_client(new_item)}


@app.put("/api/admin/clients/{client_id}")
def update_admin_client(
    client_id: int,
    payload: AdminClientIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """내담자 기본정보와 배정 정보를 수정한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminClient)
        .filter(AdminClient.id == client_id, AdminClient.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")
    if payload.admin_custom_test_id is not None:
        exists = (
            db.query(AdminCustomTest)
            .filter(
                AdminCustomTest.id == payload.admin_custom_test_id,
                AdminCustomTest.admin_user_id == admin.id,
            )
            .first()
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")
    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    row.name = payload.name.strip()
    row.gender = normalized_gender
    row.birth_day = payload.birth_day
    row.memo = payload.memo.strip()
    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=row.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    db.commit()
    db.refresh(row)
    return {"message": "내담자 정보가 수정되었습니다.", "item": serialize_admin_client(row)}


@app.put("/api/admin/clients/{client_id}/assignment")
def update_admin_client_assignment(
    client_id: int,
    payload: UpdateClientAssignmentIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """내담자 배정 검사만 단독 변경한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminClient)
        .filter(AdminClient.id == client_id, AdminClient.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    if payload.admin_custom_test_id is not None:
        exists = (
            db.query(AdminCustomTest)
            .filter(
                AdminCustomTest.id == payload.admin_custom_test_id,
                AdminCustomTest.admin_user_id == admin.id,
            )
            .first()
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=row.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    db.commit()
    return {
        "message": "배정 정보가 저장되었습니다.",
        "client_id": row.id,
        "assigned_custom_test_id": payload.admin_custom_test_id,
    }


@app.delete("/api/admin/clients/{client_id}")
def delete_admin_client(
    client_id: int,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """내담자와 해당 내담자의 기록/배정 데이터를 함께 삭제한다."""
    admin = get_current_admin(db, admin_session)
    row = (
        db.query(AdminClient)
        .filter(AdminClient.id == client_id, AdminClient.admin_user_id == admin.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    db.query(AdminAssessmentLog).filter(
        AdminAssessmentLog.admin_user_id == admin.id,
        AdminAssessmentLog.admin_client_id == row.id,
    ).delete()
    db.query(AdminClientAssignment).filter(
        AdminClientAssignment.admin_user_id == admin.id,
        AdminClientAssignment.admin_client_id == row.id,
    ).delete()
    db.delete(row)
    db.commit()
    return {"message": "내담자가 삭제되었습니다."}


@app.post("/api/admin/assessment-logs")
def create_admin_assessment_log(
    payload: AdminAssessmentLogIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """내담자 검사 실시 이력을 1건 추가한다."""
    admin = get_current_admin(db, admin_session)
    client_row = (
        db.query(AdminClient)
        .filter(
            AdminClient.id == payload.admin_client_id,
            AdminClient.admin_user_id == admin.id,
        )
        .first()
    )
    if client_row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    assessed_on = payload.assessed_on or date.today()
    row = AdminAssessmentLog(
        admin_user_id=admin.id,
        admin_client_id=client_row.id,
        assessed_on=assessed_on,
    )
    db.add(row)
    db.commit()
    return {"message": "검사 실시 기록이 추가되었습니다."}


@app.get("/api/admin/assessment-stats")
def admin_assessment_stats(
    days: int = 14,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    """최근 N일(7~60)의 일자별 검사 실시 건수를 반환한다."""
    admin = get_current_admin(db, admin_session)
    safe_days = min(max(days, 7), 60)
    from_date = date.today() - timedelta(days=safe_days - 1)

    rows = (
        db.query(
            AdminAssessmentLog.assessed_on.label("assessed_on"),
            func.count(AdminAssessmentLog.id).label("count"),
        )
        .filter(
            AdminAssessmentLog.admin_user_id == admin.id,
            AdminAssessmentLog.assessed_on >= from_date,
        )
        .group_by(AdminAssessmentLog.assessed_on)
        .order_by(AdminAssessmentLog.assessed_on.asc())
        .all()
    )
    by_day = {row.assessed_on.isoformat(): int(row.count) for row in rows}

    items = []
    for i in range(safe_days):
        d = from_date + timedelta(days=i)
        iso = d.isoformat()
        items.append({"date": iso, "count": by_day.get(iso, 0)})
    return {"items": items}
