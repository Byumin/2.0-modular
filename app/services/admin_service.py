import hashlib
import json
import os
import secrets
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import AdminClient, AdminCustomTest, AdminUser
from app.db.session import SessionLocal
from app.schemas.values import normalize_gender_value

ADMIN_SESSIONS: dict[str, int] = {}


def make_password_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def seed_default_admin() -> None:
    default_id = os.getenv("DEFAULT_ADMIN_ID", "admin")
    default_pw = os.getenv("DEFAULT_ADMIN_PW", "admin1234")
    with SessionLocal() as db:
        exists = crud.get_admin_by_username(db, default_id)
        if exists is not None:
            return
        crud.create_admin_user(db, username=default_id, password_hash=make_password_hash(default_pw))


def get_current_admin(db: Session, admin_session: str | None) -> AdminUser:
    if not admin_session or admin_session not in ADMIN_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 로그인이 필요합니다.",
        )

    admin_id = ADMIN_SESSIONS[admin_session]
    admin = crud.get_admin_by_id(db, admin_id)
    if admin is None:
        ADMIN_SESSIONS.pop(admin_session, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 관리자 세션입니다.",
        )
    return admin


def admin_login(db: Session, admin_id: str, admin_pw: str) -> dict[str, str]:
    admin = crud.get_admin_by_username(db, admin_id)
    if admin is None or admin.password_hash != make_password_hash(admin_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 ID 또는 비밀번호가 올바르지 않습니다.",
        )

    token = secrets.token_urlsafe(32)
    ADMIN_SESSIONS[token] = admin.id
    return {"token": token, "message": "로그인되었습니다.", "next_url": "/admin/workspace"}


def admin_logout(admin_session: str | None) -> dict[str, str]:
    if admin_session:
        ADMIN_SESSIONS.pop(admin_session, None)
    return {"message": "로그아웃되었습니다."}


def serialize_admin_client(row: AdminClient) -> dict:
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
    if assigned_count <= 0:
        return "대기"
    if assessed_count <= 0:
        return "대기"
    if assessed_count < assigned_count:
        return "실시"
    return "종료"


def _sort_item_texts(item_json: dict | list | str) -> list[str]:
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
    if isinstance(item_json, dict):
        return {str(k): str(v) for k, v in item_json.items()}
    if isinstance(item_json, list):
        return {str(i + 1): str(v) for i, v in enumerate(item_json)}
    if isinstance(item_json, str):
        return {"1": item_json}
    return {}


def _parse_response_options(item_template: str | None) -> list[dict]:
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


def normalize_additional_profile_fields(raw: Any) -> list[dict]:
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


def build_custom_test_items(db: Session, admin_id: int) -> list[dict]:
    rows = crud.list_custom_tests_by_admin(db, admin_id)
    assigned_count_map = crud.get_assignment_counts_by_admin(db, admin_id)
    assessed_count_map = crud.get_assessed_counts_by_admin(db, admin_id)

    items = []
    for row in rows:
        selected_scale_codes = json.loads(row.selected_scales_json)
        additional_profile_fields = normalize_additional_profile_fields(
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
    current = crud.get_assignment_by_admin_and_client(db, admin_id, client_id)

    if custom_test_id is None:
        if current is not None:
            crud.delete_row(db, current)
        return

    if current is None:
        crud.create_assignment(db, admin_id, client_id, custom_test_id)
        return

    current.admin_custom_test_id = custom_test_id


def find_assigned_client_for_profile(
    db: Session,
    *,
    admin_user_id: int,
    custom_test_id: int,
    profile: dict[str, Any],
) -> tuple[AdminClient | None, str]:
    assigned_clients = crud.get_assigned_clients_for_profile(
        db,
        admin_user_id=admin_user_id,
        custom_test_id=custom_test_id,
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


def build_custom_assessment_payload(custom_test_row: AdminCustomTest) -> dict:
    row = crud.fetch_parent_item_bundle(custom_test_row.test_id, custom_test_row.sub_test_json)
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
    additional_profile_fields = normalize_additional_profile_fields(
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


def get_admin_test_catalog(db: Session, admin_session: str | None) -> dict:
    get_current_admin(db, admin_session)

    rows = crud.fetch_parent_catalog_rows()

    def format_age_label(sub_test_json: str) -> str:
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

    tests: dict[str, list[dict]] = {}
    for row in rows:
        item_json = json.loads(row.item_json)
        item_meta = json.loads(row.item_meta_json)
        scale_struct = json.loads(row.scale_struct)
        item_map = _normalize_item_map(item_json)
        response_options = _parse_response_options(row.item_template)
        response_scale_label = f"{len(response_options)}점 척도" if response_options else "응답형식 정보 없음"
        sub_test = {
            "sub_test_json": row.sub_test_json,
            "display_name": item_meta.get("name", "이름 없음"),
            "item_count": item_meta.get("item_count"),
            "age_label": format_age_label(row.sub_test_json),
            "item_texts": _sort_item_texts(item_json),
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


def list_admin_custom_tests(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    return {"items": build_custom_test_items(db, admin.id)}


def list_admin_custom_tests_for_management(
    db: Session,
    admin_session: str | None,
    q: str | None,
    status_filter: str | None,
    created_from: date | None,
    created_to: date | None,
) -> dict:
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
    if status_filter in {"대기", "실시", "종료"}:
        filtered = [item for item in filtered if item["progress_status"] == status_filter]
    if created_from:
        filtered = [item for item in filtered if item["created_at"][:10] >= created_from.isoformat()]
    if created_to:
        filtered = [item for item in filtered if item["created_at"][:10] <= created_to.isoformat()]

    return {"items": filtered}


def _age_start_from_sub_test_json(sub_test_json: str) -> int:
    """sub_test_json에서 age_range.start_inclusive[0]를 추출해 정렬 키로 사용한다."""
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        return 9999

    age_range = parsed.get("age_range", {})
    start = age_range.get("start_inclusive")
    if isinstance(start, list) and start and isinstance(start[0], int):
        return start[0]
    return 9999


def _resolve_common_sub_test_json(test_id: str, selected_scale_codes: list[str]) -> str:
    """선택 척도 코드가 모두 포함되는 공통 sub_test_json 후보 중 시작연령이 가장 낮은 1건을 반환한다."""
    rows = crud.fetch_parent_scale_rows_by_test(test_id)
    if not rows:
        raise HTTPException(status_code=404, detail="선택한 검사 데이터가 존재하지 않습니다.")

    selected_codes = {str(code) for code in selected_scale_codes}
    if not selected_codes:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 척도를 선택해주세요.")

    candidates: list[tuple[str, int]] = []
    for row in rows:
        try:
            scale_struct = json.loads(row.scale_struct)
        except json.JSONDecodeError:
            continue
        if not isinstance(scale_struct, dict):
            continue

        available_codes = set(scale_struct.keys())
        if selected_codes.issubset(available_codes):
            candidate_json = str(row.sub_test_json)
            candidates.append((candidate_json, _age_start_from_sub_test_json(candidate_json)))

    if not candidates:
        raise HTTPException(status_code=400, detail=f"{test_id}: 선택 척도의 공통 연령/학령 구간이 없습니다.")

    candidates.sort(key=lambda item: (item[1], item[0]))
    return candidates[0][0]


def create_admin_custom_test(
    db: Session,
    admin_session: str | None,
    payload,
) -> dict:
    admin = get_current_admin(db, admin_session) # 관리자 인증
    resolved_sub_test_json = _resolve_common_sub_test_json(payload.test_id, payload.selected_scale_codes) # _resolve_common_sub_test_json : 선택된 척도 코드에 맞는 공통 sub_test_json 추출

    normalized_fields = normalize_additional_profile_fields(
        [field.model_dump() for field in payload.additional_profile_fields]
    )
    if len(normalized_fields) != len(payload.additional_profile_fields):
        raise HTTPException(status_code=400, detail="추가 인적사항 항목 설정을 확인해주세요.")

    new_item = crud.create_custom_test(
        db,
        admin_user_id=admin.id,
        test_id=payload.test_id,
        sub_test_json=resolved_sub_test_json,
        custom_test_name=payload.custom_test_name,
        selected_scales_json=json.dumps(payload.selected_scale_codes, ensure_ascii=False),
        additional_profile_fields_json=json.dumps(normalized_fields, ensure_ascii=False),
    )
    return {"message": "검사가 생성되었습니다.", "id": new_item.id}


def get_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    selected_scale_codes = json.loads(row.selected_scales_json)
    additional_profile_fields = normalize_additional_profile_fields(
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


def generate_custom_test_access_link(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    custom_test = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    link = crud.get_active_access_link_by_admin_and_test(
        db,
        admin_user_id=admin.id,
        custom_test_id=custom_test.id,
    )
    if link is None:
        link = crud.create_access_link(
            db,
            admin_user_id=admin.id,
            custom_test_id=custom_test.id,
            access_token=secrets.token_urlsafe(24),
        )

    return {
        "custom_test_id": custom_test.id,
        "custom_test_name": custom_test.custom_test_name,
        "access_token": link.access_token,
        "assessment_url": f"/assessment/custom/{link.access_token}",
    }


def get_custom_test_by_access_link(db: Session, access_token: str) -> dict:
    link = crud.get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    payload = build_custom_assessment_payload(custom_test)
    payload["access_token"] = access_token
    return payload


def validate_custom_test_profile_by_access_link(db: Session, access_token: str, profile: dict[str, Any]) -> dict:
    link = crud.get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=profile or {},
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)

    return {"message": "배정된 내담자 확인이 완료되었습니다."}


def submit_custom_test_by_access_link(
    db: Session,
    access_token: str,
    responder_name: str,
    profile: dict[str, Any],
    answers: dict[str, str],
) -> dict:
    link = crud.get_active_access_link_by_token(db, access_token)
    if link is None:
        raise HTTPException(status_code=404, detail="유효하지 않은 검사 URL입니다.")

    custom_test = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=link.admin_custom_test_id,
        admin_user_id=link.admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    assessment_payload = build_custom_assessment_payload(custom_test)
    valid_item_ids = {item["id"] for item in assessment_payload["items"]}
    if not valid_item_ids:
        raise HTTPException(status_code=400, detail="문항 데이터가 없습니다.")

    cleaned_answers: dict[str, str] = {}
    for item_id, value in (answers or {}).items():
        key = str(item_id)
        if key not in valid_item_ids:
            continue
        cleaned_answers[key] = str(value)

    if len(cleaned_answers) != len(valid_item_ids):
        raise HTTPException(status_code=400, detail="모든 문항에 응답해주세요.")

    def sanitize_profile_value(value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, list):
            return [str(v) for v in value if v is not None]
        return str(value)

    clean_profile: dict[str, Any] = {str(k): sanitize_profile_value(v) for k, v in (profile or {}).items()}

    _, error_message = find_assigned_client_for_profile(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        profile=clean_profile,
    )
    if error_message:
        raise HTTPException(status_code=403, detail=error_message)

    profile_name = str(clean_profile.get("name", "")).strip()
    final_responder_name = profile_name or responder_name.strip()

    crud.create_submission(
        db,
        admin_user_id=link.admin_user_id,
        custom_test_id=custom_test.id,
        access_token=access_token,
        responder_name=final_responder_name,
        answers_json=json.dumps({"profile": clean_profile, "answers": cleaned_answers}, ensure_ascii=False),
    )

    return {"message": "검사가 제출되었습니다.", "submitted_item_count": len(cleaned_answers)}


def update_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    scale_row = crud.fetch_parent_scale_struct(row.test_id, row.sub_test_json)
    if scale_row is None:
        raise HTTPException(status_code=404, detail="원본 척도 데이터를 찾을 수 없습니다.")

    available_scale_codes = set(json.loads(scale_row.scale_struct).keys())
    selected_codes = set(payload.selected_scale_codes)
    if not selected_codes.issubset(available_scale_codes):
        raise HTTPException(status_code=400, detail="유효하지 않은 척도 코드가 포함되어 있습니다.")

    row.custom_test_name = payload.custom_test_name.strip()
    row.selected_scales_json = json.dumps(payload.selected_scale_codes, ensure_ascii=False)
    crud.commit(db)
    return {"message": "검사 설정이 수정되었습니다."}


def delete_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    crud.delete_assignments_by_test(db, admin_user_id=admin.id, custom_test_id=row.id)
    crud.delete_row(db, row)
    crud.commit(db)
    return {"message": "검사가 삭제되었습니다."}


def bulk_delete_admin_custom_tests(db: Session, admin_session: str | None, custom_test_ids: list[int]) -> dict:
    admin = get_current_admin(db, admin_session)
    target_ids = sorted({x for x in custom_test_ids if isinstance(x, int) and x > 0})
    if not target_ids:
        raise HTTPException(status_code=400, detail="삭제할 검사 ID가 없습니다.")

    found_ids = crud.get_custom_test_ids_in(db, admin_user_id=admin.id, target_ids=target_ids)
    if not found_ids:
        return {"message": "삭제할 검사가 없습니다.", "deleted_count": 0}

    crud.bulk_delete_assignments_by_test_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    crud.bulk_delete_custom_tests_by_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    crud.commit(db)
    return {"message": "선택한 검사가 삭제되었습니다.", "deleted_count": len(found_ids)}


def list_admin_clients(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    rows = crud.list_admin_clients_by_admin(db, admin_user_id=admin.id)
    assignment_rows = crud.list_client_assignments_with_test_name(db, admin_user_id=admin.id)

    assignment_map = {
        row.AdminClientAssignment.admin_client_id: {
            "custom_test_id": row.AdminClientAssignment.admin_custom_test_id,
            "custom_test_name": row.custom_test_name,
        }
        for row in assignment_rows
    }

    log_rows = crud.get_last_assessed_rows(db, admin_user_id=admin.id)
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


def create_admin_client(db: Session, admin_session: str | None, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    try:
        normalized_gender = normalize_gender_value(payload.gender)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.admin_custom_test_id is not None:
        exists = crud.get_custom_test_by_id_and_admin(
            db,
            custom_test_id=payload.admin_custom_test_id,
            admin_user_id=admin.id,
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    new_item = crud.create_admin_client(
        db,
        admin_user_id=admin.id,
        name=payload.name.strip(),
        gender=normalized_gender,
        birth_day=payload.birth_day,
        memo=payload.memo.strip(),
    )

    upsert_client_assignment(
        db=db,
        admin_id=admin.id,
        client_id=new_item.id,
        custom_test_id=payload.admin_custom_test_id,
    )
    crud.commit(db)

    return {"message": "내담자가 등록되었습니다.", "item": serialize_admin_client(new_item)}


def update_admin_client(db: Session, admin_session: str | None, client_id: int, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    if payload.admin_custom_test_id is not None:
        exists = crud.get_custom_test_by_id_and_admin(
            db,
            custom_test_id=payload.admin_custom_test_id,
            admin_user_id=admin.id,
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
    crud.commit(db)
    crud.refresh(db, row)

    return {"message": "내담자 정보가 수정되었습니다.", "item": serialize_admin_client(row)}


def update_admin_client_assignment(db: Session, admin_session: str | None, client_id: int, custom_test_id: int | None) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    if custom_test_id is not None:
        exists = crud.get_custom_test_by_id_and_admin(
            db,
            custom_test_id=custom_test_id,
            admin_user_id=admin.id,
        )
        if exists is None:
            raise HTTPException(status_code=400, detail="배정할 검사를 찾을 수 없습니다.")

    upsert_client_assignment(db=db, admin_id=admin.id, client_id=row.id, custom_test_id=custom_test_id)
    crud.commit(db)
    return {
        "message": "배정 정보가 저장되었습니다.",
        "client_id": row.id,
        "assigned_custom_test_id": custom_test_id,
    }


def delete_admin_client(db: Session, admin_session: str | None, client_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = crud.get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    crud.delete_logs_by_client(db, admin_user_id=admin.id, client_id=row.id)
    crud.delete_assignments_by_client(db, admin_user_id=admin.id, client_id=row.id)
    crud.delete_row(db, row)
    crud.commit(db)
    return {"message": "내담자가 삭제되었습니다."}


def create_admin_assessment_log(db: Session, admin_session: str | None, client_id: int, assessed_on: date | None) -> dict:
    admin = get_current_admin(db, admin_session)
    client_row = crud.get_admin_client_by_id_and_admin(db, client_id=client_id, admin_user_id=admin.id)
    if client_row is None:
        raise HTTPException(status_code=404, detail="내담자를 찾을 수 없습니다.")

    effective_date = assessed_on or date.today()
    crud.create_assessment_log(
        db,
        admin_user_id=admin.id,
        client_id=client_row.id,
        assessed_on=effective_date,
    )
    return {"message": "검사 실시 기록이 추가되었습니다."}


def admin_assessment_stats(db: Session, admin_session: str | None, days: int = 14) -> dict:
    admin = get_current_admin(db, admin_session)
    safe_days = min(max(days, 7), 60)
    from_date = date.today() - timedelta(days=safe_days - 1)

    rows = crud.get_assessment_stats_rows(db, admin_user_id=admin.id, from_date=from_date)
    by_day = {row.assessed_on.isoformat(): int(row.count) for row in rows}

    items = []
    for i in range(safe_days):
        d = from_date + timedelta(days=i)
        iso = d.isoformat()
        items.append({"date": iso, "count": by_day.get(iso, 0)})
    return {"items": items}


def admin_dashboard(db: Session, admin_session: str | None) -> dict:
    tests = list_admin_custom_tests(db, admin_session)["items"]
    clients = list_admin_clients(db, admin_session)["items"]
    stats = admin_assessment_stats(db, admin_session, days=14)["items"]

    total_clients = len(clients)
    not_started = sum(1 for item in clients if item["status"] == "미실시")
    today_iso = date.today().isoformat()
    today_assessed_count = next((item["count"] for item in stats if item["date"] == today_iso), 0)

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
