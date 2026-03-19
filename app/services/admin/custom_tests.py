import json
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.base_repository import commit, delete_row
from app.repositories.custom_test_repository import (
    bulk_delete_assignments_by_test_ids,
    bulk_delete_custom_tests_by_ids,
    create_custom_test,
    delete_assignments_by_test,
    get_custom_test_by_id_and_admin,
    get_custom_test_ids_in,
)
from app.repositories.parent_test_repository import (
    fetch_parent_catalog_rows,
    fetch_parent_scale_rows_by_test,
    fetch_parent_scale_struct,
)
from app.services.admin.auth import get_current_admin
from app.services.admin.common import (
    _normalize_item_map,
    _parse_response_options,
    _sort_item_texts,
    build_custom_test_items,
    extract_sub_test_variant_configs,
    extract_sub_test_variants,
    normalize_additional_profile_fields,
    serialize_additional_profile_payload,
)


def get_admin_test_catalog(db: Session, admin_session: str | None) -> dict:
    get_current_admin(db, admin_session)

    rows = fetch_parent_catalog_rows()

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
    try:
        parsed = json.loads(sub_test_json or "{}") # 딕셔너리로 변환
    except json.JSONDecodeError:
        return 9999

    age_range = parsed.get("age_range", {}) # age_range 키에 해당하는 값이 딕셔너리 형태로 존재하는지 확인, 없으면 빈 딕셔너리 반환
    start = age_range.get("start_inclusive") # 시작 정보인 start_inclusive 키에 해당하는 값 가져오기, 없으면 None 반환
    if isinstance(start, list) and start and isinstance(start[0], int): # start가 리스트 형태이고 비어있지 않으며 첫 번째 요소가 정수인지 확인
        return start[0] # 시작 연령/학령이 가장 어린 것을 우선으로 하기 위해 start_inclusive의 첫 번째 요소(연령/학령 정보)를 반환
    return 9999

def _resolve_sub_test_variant_configs(test_id: str, selected_scale_codes: list[str]) -> list[dict]:
    rows = fetch_parent_scale_rows_by_test(test_id) # 선택한 test_id에 해당하는 모든 sub_test_json과 scale_struct를 DB에서 가져옴
    if not rows:
        raise HTTPException(status_code=404, detail="선택한 검사 데이터가 존재하지 않습니다.")

    selected_codes = {str(code) for code in selected_scale_codes} # 선택한 척도 코드들을 문자열 형태로 집합에 저장 (DB에서 가져온 scale_struct의 키들도 문자열이므로 비교를 위해 변환) -> 예: {"활동성", "주의력", "충동성"}
    if not selected_codes:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 척도를 선택해주세요.")

    candidates: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        try:
            scale_struct = json.loads(row.scale_struct)
        except json.JSONDecodeError:
            continue
        if not isinstance(scale_struct, dict):
            continue

        candidate_json = str(row.sub_test_json)
        if candidate_json in seen:
            continue
        seen.add(candidate_json)

        available_codes = sorted({str(code) for code in scale_struct.keys()})
        selected_for_variant = sorted(selected_codes.intersection(available_codes))
        if not selected_for_variant:
            # 구간별 척도구조가 상이할 때 실시 가능성을 위해 해당 구간 척도 전체를 보존한다.
            selected_for_variant = available_codes.copy()

        candidates.append(
            {
                "sub_test_json": candidate_json,
                "available_scale_codes": available_codes,
                "selected_scale_codes": selected_for_variant,
            }
        )

    if not candidates:
        raise HTTPException(status_code=400, detail=f"{test_id}: 사용 가능한 문항 구간이 없습니다.")

    candidates.sort(key=lambda item: (_age_start_from_sub_test_json(item["sub_test_json"]), item["sub_test_json"]))
    return candidates


def create_admin_custom_test(
    db: Session,
    admin_session: str | None,
    payload,
) -> dict:
    admin = get_current_admin(db, admin_session) # 현재 로그인한 관리자 정보 인증
    resolved_variant_configs = _resolve_sub_test_variant_configs(payload.test_id, payload.selected_scale_codes)
    primary_sub_test_json = resolved_variant_configs[0]["sub_test_json"]

    normalized_fields = normalize_additional_profile_fields(
        [field.model_dump() for field in payload.additional_profile_fields]
    )
    if len(normalized_fields) != len(payload.additional_profile_fields):
        raise HTTPException(status_code=400, detail="추가 인적사항 항목 설정을 확인해주세요.")

    new_item = create_custom_test(
        db,
        admin_user_id=admin.id,
        test_id=payload.test_id,
        sub_test_json=primary_sub_test_json,
        custom_test_name=payload.custom_test_name,
        selected_scales_json=json.dumps(payload.selected_scale_codes, ensure_ascii=False),
        additional_profile_fields_json=serialize_additional_profile_payload(
            normalized_fields,
            resolved_variant_configs,
        ),
    )
    return {"message": "검사가 생성되었습니다.", "id": new_item.id}


def get_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    selected_scale_codes = json.loads(row.selected_scales_json)
    raw_additional_payload = json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
    additional_profile_fields = normalize_additional_profile_fields(raw_additional_payload)
    variant_configs = extract_sub_test_variant_configs(raw_additional_payload)
    sub_test_variants = (
        [item["sub_test_json"] for item in variant_configs]
        if variant_configs
        else (extract_sub_test_variants(raw_additional_payload) or [row.sub_test_json])
    )
    return {
        "id": row.id,
        "custom_test_name": row.custom_test_name,
        "test_id": row.test_id,
        "sub_test_json": row.sub_test_json,
        "sub_test_variants": sub_test_variants,
        "sub_test_variant_configs": variant_configs,
        "selected_scale_codes": selected_scale_codes,
        "additional_profile_fields": additional_profile_fields,
        "scale_count": len(selected_scale_codes),
        "created_at": row.created_at.isoformat(),
    }


def update_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int, payload) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    raw_additional_payload = json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
    variant_configs = extract_sub_test_variant_configs(raw_additional_payload)
    candidate_sub_tests = (
        [item["sub_test_json"] for item in variant_configs]
        if variant_configs
        else (extract_sub_test_variants(raw_additional_payload) or [row.sub_test_json])
    )

    available_scale_codes: set[str] = set()
    for sub_test_json in candidate_sub_tests:
        scale_row = fetch_parent_scale_struct(row.test_id, sub_test_json)
        if scale_row is None:
            continue
        try:
            scale_struct = json.loads(scale_row.scale_struct)
        except json.JSONDecodeError:
            continue
        if isinstance(scale_struct, dict):
            available_scale_codes.update(str(code) for code in scale_struct.keys())

    if not available_scale_codes:
        raise HTTPException(status_code=404, detail="원본 척도 데이터를 찾을 수 없습니다.")

    selected_codes = set(payload.selected_scale_codes)
    if not selected_codes.issubset(available_scale_codes):
        raise HTTPException(status_code=400, detail="유효하지 않은 척도 코드가 포함되어 있습니다.")

    row.custom_test_name = payload.custom_test_name.strip()
    row.selected_scales_json = json.dumps(payload.selected_scale_codes, ensure_ascii=False)
    commit(db)
    return {"message": "검사 설정이 수정되었습니다."}


def delete_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    delete_assignments_by_test(db, admin_user_id=admin.id, custom_test_id=row.id)
    delete_row(db, row)
    commit(db)
    return {"message": "검사가 삭제되었습니다."}


def bulk_delete_admin_custom_tests(db: Session, admin_session: str | None, custom_test_ids: list[int]) -> dict:
    admin = get_current_admin(db, admin_session)
    target_ids = sorted({x for x in custom_test_ids if isinstance(x, int) and x > 0})
    if not target_ids:
        raise HTTPException(status_code=400, detail="삭제할 검사 ID가 없습니다.")

    found_ids = get_custom_test_ids_in(db, admin_user_id=admin.id, target_ids=target_ids)
    if not found_ids:
        return {"message": "삭제할 검사가 없습니다.", "deleted_count": 0}

    bulk_delete_assignments_by_test_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    bulk_delete_custom_tests_by_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    commit(db)
    return {"message": "선택한 검사가 삭제되었습니다.", "deleted_count": len(found_ids)}
