import json
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AdminClient, AdminCustomTest, AdminCustomTestSubmission, SubmissionScoringResult
from app.repositories.base_repository import commit
from app.repositories.custom_test_repository import (
    bulk_deactivate_access_links_by_test_ids,
    bulk_soft_delete_custom_tests_by_ids,
    deactivate_access_links_by_test,
    get_custom_test_by_id_and_admin,
    get_custom_test_ids_in,
    soft_delete_custom_test,
)
from app.repositories.parent_test_repository import (
    fetch_parent_catalog_rows,
    fetch_parent_scale_rows_by_test,
    fetch_parent_scale_struct,
)
from app.schemas.custom_tests import CreateCustomTestBatchIn, UpdateCustomTestSettingsIn
from app.services.admin.auth import get_current_admin
from app.services.admin.common import (
    _normalize_item_map,
    _parse_response_options,
    _sort_item_texts,
    build_custom_test_items,
    extract_sub_test_variant_configs,
    flatten_custom_test_variant_configs,
    load_custom_test_configs,
    load_custom_test_session_configs,
    normalize_client_intake_mode,
    normalize_additional_profile_fields,
    normalize_custom_test_session_configs,
    serialize_additional_profile_payload,
    summarize_custom_test_ids,
)

SCHOOL_AGE_LABELS = [
    "미취학",
    "초등 1학년",
    "초등 2학년",
    "초등 3학년",
    "초등 4학년",
    "초등 5학년",
    "초등 6학년",
    "초등학교 졸업생",
    "중등 1학년",
    "중등 2학년",
    "중등 3학년",
    "중학교 졸업생",
    "고등 1학년",
    "고등 2학년",
    "고등 3학년",
    "고등학교 졸업생",
    "대학생 신입생",
    "대학생 재학생",
    "대학생 졸업생",
    "대학원 신입생",
    "대학원 재학생",
    "대학원 졸업생",
]


def _school_age_label_from_index(index: int) -> str:
    if index < 0:
        return ""
    if index >= len(SCHOOL_AGE_LABELS):
        return ""
    return SCHOOL_AGE_LABELS[index]


def _format_school_age_range_label(school_age_range: dict) -> str:
    start = school_age_range.get("start_inclusive", [])
    end_exclusive = school_age_range.get("end_exclusive", [])
    if not (
        isinstance(start, list)
        and isinstance(end_exclusive, list)
        and start
        and end_exclusive
        and isinstance(start[0], int)
        and isinstance(end_exclusive[0], int)
    ):
        return ""

    start_index = start[0]
    end_exclusive_index = end_exclusive[0]
    start_label = _school_age_label_from_index(start_index)
    if not start_label:
        return ""
    if end_exclusive_index >= len(SCHOOL_AGE_LABELS):
        return f"학령 {start_label} 이상"

    end_index = max(start_index, end_exclusive_index - 1)
    end_label = _school_age_label_from_index(end_index) or start_label
    return f"학령 {start_label}~{end_label}"


def get_admin_test_catalog(db: Session, admin_session: str | None) -> dict:
    get_current_admin(db, admin_session)

    rows = fetch_parent_catalog_rows(db=db)

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

        school_age_range = parsed.get("school_age_range")
        school_range_text = ""
        if isinstance(school_age_range, dict):
            school_range_text = _format_school_age_range_label(school_age_range)

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
        elif school_range_text:
            school_text = school_range_text

        if age_text and school_text:
            return f"{age_text} / {school_text}"
        if age_text:
            return age_text
        if school_text:
            return school_text
        return "연령/학령 정보 없음"

    def build_scale_tree(scale_struct: dict) -> list[dict]:
        def item_ids_from_scale(raw_scale: dict) -> list[str]:
            choice_score = raw_scale.get("choice_score", {})
            if not isinstance(choice_score, dict):
                return []
            return sorted(
                [str(item_id) for item_id in choice_score.keys()],
                key=lambda x: (0, int(x)) if x.isdigit() else (1, x),
            )

        def build_node(code: str, raw_scale: object, path: list[str]) -> dict:
            scale = raw_scale if isinstance(raw_scale, dict) else {}
            facet_scale = scale.get("facet_scale")
            children = []
            if isinstance(facet_scale, dict):
                children = [
                    build_node(str(child_code), child_value, [*path, str(child_code)])
                    for child_code, child_value in facet_scale.items()
                ]
            return {
                "code": code,
                "name": scale.get("name", code),
                "path": path,
                "item_ids": item_ids_from_scale(scale),
                "children": children,
            }

        return [
            build_node(str(code), value, [str(code)])
            for code, value in scale_struct.items()
        ]

    tests: dict[str, list[dict]] = {}
    for row in rows:
        try:
            item_json = json.loads(row.item_json)
            scale_struct = json.loads(row.scale_struct)
        except json.JSONDecodeError:
            # Skip broken parent rows instead of failing the entire catalog response.
            continue
        if not isinstance(scale_struct, dict):
            continue
        try:
            item_meta = json.loads(row.item_meta_json)
        except json.JSONDecodeError:
            item_meta = {}
        if not isinstance(item_meta, dict):
            item_meta = {}
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
            "scale_tree": build_scale_tree(scale_struct),
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


def list_admin_custom_test_results(
    db: Session,
    admin_session: str | None,
    q: str | None = None,
    limit: int = 100,
) -> dict:
    admin = get_current_admin(db, admin_session)
    search_query = str(q or "").strip().casefold()
    row_limit = max(1, min(int(limit or 100), 300))

    rows = (
        db.query(
            AdminCustomTestSubmission,
            AdminCustomTest.custom_test_name,
            AdminCustomTest.test_id.label("parent_test_id"),
            AdminClient.name.label("client_name"),
            SubmissionScoringResult.id.label("scoring_result_id"),
            SubmissionScoringResult.scoring_status,
            SubmissionScoringResult.created_at.label("scored_at"),
        )
        .outerjoin(AdminCustomTest, AdminCustomTest.id == AdminCustomTestSubmission.admin_custom_test_id)
        .outerjoin(AdminClient, AdminClient.id == AdminCustomTestSubmission.client_id)
        .outerjoin(SubmissionScoringResult, SubmissionScoringResult.submission_id == AdminCustomTestSubmission.id)
        .filter(AdminCustomTestSubmission.admin_user_id == admin.id)
        .order_by(AdminCustomTestSubmission.created_at.desc(), AdminCustomTestSubmission.id.desc())
        .limit(row_limit)
        .all()
    )

    items = []
    for row in rows:
        submission = row.AdminCustomTestSubmission
        custom_test_name = row.custom_test_name or "커스텀 검사"
        parent_test_name = summarize_custom_test_ids([], fallback=str(row.parent_test_id or ""))[1] if row.parent_test_id else None
        client_name = row.client_name or ""
        item = {
            "submission_id": submission.id,
            "scoring_result_id": row.scoring_result_id,
            "custom_test_id": submission.admin_custom_test_id,
            "custom_test_name": custom_test_name,
            "parent_test_name": parent_test_name,
            "client_id": submission.client_id,
            "client_name": client_name or None,
            "responder_name": submission.responder_name,
            "submitted_at": submission.created_at.isoformat(),
            "scored_at": row.scored_at.isoformat() if row.scored_at else None,
            "scoring_status": row.scoring_status or "not_scored",
        }
        if search_query:
            search_text = " ".join(
                str(value or "")
                for value in (
                    item["custom_test_name"],
                    item["parent_test_name"],
                    item["client_name"],
                    item["responder_name"],
                    item["scoring_status"],
                )
            ).casefold()
            if search_query not in search_text:
                continue
        items.append(item)

    return {"items": items}


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


def _describe_sub_test_variant(sub_test_json: str) -> str:
    try:
        parsed = json.loads(sub_test_json or "{}")
    except json.JSONDecodeError:
        return "알 수 없는 실시구간"
    if not isinstance(parsed, dict):
        return "알 수 없는 실시구간"

    age_range = parsed.get("age_range", {})
    start = age_range.get("start_inclusive", [])
    end_exclusive = age_range.get("end_exclusive", [])
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
            return f"만 {start_year}세 이상"
        return f"만 {start_year}~{max(start_year, end_year - 1)}세"

    school_age_range = parsed.get("school_age_range")
    if isinstance(school_age_range, dict):
        school_text = _format_school_age_range_label(school_age_range)
        if school_text:
            return school_text

    return "알 수 없는 실시구간"


def _canonicalize_sub_test_json(raw: str) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return text
    return json.dumps(parsed, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _collect_scale_codes(scale_struct: dict) -> list[str]:
    codes: set[str] = set()

    def visit(raw: object) -> None:
        if not isinstance(raw, dict):
            return
        facet_scale = raw.get("facet_scale")
        if isinstance(facet_scale, dict):
            for child_code, child_value in facet_scale.items():
                code_text = str(child_code).strip()
                if code_text:
                    codes.add(code_text)
                visit(child_value)

    for code, value in scale_struct.items():
        code_text = str(code).strip()
        if code_text:
            codes.add(code_text)
        visit(value)
    return sorted(codes)


def _resolve_sub_test_variant_configs(
    admin_selected_test_id: str,
    admin_selected_scale_codes: list[str],
    excluded_sub_test_jsons: list[str] | None = None,
    db: Session | None = None,
) -> list[dict]:
    # 관리자가 고른 test_id들과 척도코드들을 db의 정보와 비교하여 실시 가능한 정보 목록으로 정규화하는 함수
    #! 주의 : admin_selected_test_id는 test_id 1개만 받음 / 복수 검사 단위를 처리하는게 아님 -> create_admin_custom_test_batch에서 검사별로 반복되도록 설계되어 있음
    rows = fetch_parent_scale_rows_by_test(admin_selected_test_id, db=db) # 선택한 test_id에 해당하는 모든 sub_test_json과 scale_struct를 DB에서 가져옴
    # 예시 admin_selected_test_id : golden
    # 예시 admin_selected_scale_codes : ["G1", "G2", "G5"]
    # 예시 rows : 
    if not rows:
        raise HTTPException(status_code=404, detail="선택한 검사 데이터가 존재하지 않습니다.")

    selected_codes = {str(code) for code in admin_selected_scale_codes} # 선택한 척도 코드들을 문자열 형태로 집합에 저장 -> 만약 다른 검사의 척도 코드가 같은 경우면 구분이 안되네?
    excluded_variants = {
        _canonicalize_sub_test_json(item)
        for item in (excluded_sub_test_jsons or [])
        if _canonicalize_sub_test_json(item)
    }
    if not selected_codes:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 척도를 선택해주세요.")

    candidates: list[dict] = []
    seen: set[str] = set()
    invalid_exclusions: list[str] = []
    for row in rows: # rows : db에서 가져온 각 행에 대해 반복, 각 행은 특정 sub_test_json과 scale_struct를 포함
        try:
            scale_struct = json.loads(row.scale_struct) # scale_struct를 딕셔너리로 변환, 변환 실패 시 예외 처리하여 다음 행으로 넘어감
        except json.JSONDecodeError:
            continue
        if not isinstance(scale_struct, dict):
            continue

        candidate_json = str(row.sub_test_json) # sub_test_json을 문자열로 변환하여 중복 검사에 사용
        candidate_key = _canonicalize_sub_test_json(candidate_json)
        # seen 집합을 활용하여 중복된 sub_test_json이 이미 처리되었는지 확인, 중복된 경우 해당 행은 건너뛰고 다음 행으로 넘어감
        if candidate_key in seen:
            continue
        seen.add(candidate_key)

        available_codes = _collect_scale_codes(scale_struct)
        selected_for_variant = sorted(selected_codes.intersection(available_codes))  # intersection : 호출 주체와 인자간의 공통된 요소를 새로운 집합으로 반환
        if not selected_for_variant:
            if candidate_key in excluded_variants:
                continue
            continue
        if candidate_key in excluded_variants:
            invalid_exclusions.append(_describe_sub_test_variant(candidate_json))
            continue

        candidates.append(
            {
                "test_id": row.test_id, # test_id는 관리자가 선택한 test_id로 고정
                "sub_test_json": candidate_json, # sub 검사의 실시할 수 있는 구간 정보
                "available_scale_codes": available_codes, # 이건 관리자가 선택한 척도로 고정적으로 들어감 
                "selected_scale_codes": selected_for_variant, # 동일한 검사에서 특정 sub 구간에는 특정 척도코드가 없을 수 있기 때문에 intersection으로 산출
            }
        )

    if invalid_exclusions:
        raise HTTPException(
            status_code=400,
            detail=f"{admin_selected_test_id}: 선택 척도가 존재하는 실시구간은 제외할 수 없습니다. {', '.join(invalid_exclusions)}",
        )
    if not candidates:
        raise HTTPException(status_code=400, detail=f"{admin_selected_test_id}: 사용 가능한 문항 구간이 없습니다.")
    # 연령 시작값 기준 정렬
    candidates.sort(key=lambda item: (_age_start_from_sub_test_json(item["sub_test_json"]), item["sub_test_json"]))
    return candidates


def _build_structured_sub_test_json(resolved_test_configs: list[dict]) -> str:
    # sub_test_json은 인적사항 필드 감지용이므로 informant를 나이구간별로 재병합한다.
    # selected_scales_json은 informant별로 분리되지만, sub_test_json은 합쳐서 저장.
    result: dict[str, list] = {}
    for config in resolved_test_configs:
        test_id = str(config.get("test_id", "")).strip()
        if not test_id:
            continue
        grouped: dict[str, dict] = {}
        for variant in config.get("sub_test_variants", []):
            raw = variant.get("sub_test_json", "")
            try:
                parsed = json.loads(raw) if isinstance(raw, str) else raw
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(parsed, dict):
                continue
            range_key = json.dumps(
                {k: parsed[k] for k in ("age_range", "school_age_range") if k in parsed},
                ensure_ascii=False, sort_keys=True,
            )
            target = grouped.setdefault(range_key, {k: parsed[k] for k in ("age_range", "school_age_range") if k in parsed})
            for field, val in parsed.items():
                if field in ("age_range", "school_age_range"):
                    continue
                existing = set(target.get(field, [])) if isinstance(target.get(field), list) else set()
                new_vals = set(val) if isinstance(val, list) else {val}
                target[field] = sorted(existing | new_vals)
        if grouped:
            result[test_id] = list(grouped.values())
    return json.dumps(result, ensure_ascii=False)


def _build_session_configs_payload(payload: CreateCustomTestBatchIn, resolved_test_configs: list[dict]) -> list[dict]:
    raw_sessions = [
        {
            "session_id": session.session_id,
            "title": session.title,
            "description": session.description,
            "guide_items": session.guide_items,
            "test_ids": session.test_ids,
        }
        for session in payload.session_configs
    ]
    return normalize_custom_test_session_configs(raw_sessions, resolved_test_configs)

# 커스텀 검사 생성 배치 처리 함수 (여러 개의 검사 설정을 한 번에 생성)
def create_admin_custom_test_batch(
    db: Session,
    admin_session: str | None,
    payload: CreateCustomTestBatchIn,
) -> dict:
    admin = get_current_admin(db, admin_session) # 현재 로그인한 관리자 정보 인증
    trimmed_name = payload.custom_test_name.strip()
    client_intake_mode = normalize_client_intake_mode(payload.client_intake_mode)
    if not trimmed_name:
        raise HTTPException(status_code=400, detail="검사명은 공백만 입력할 수 없습니다.")

    # payload의 additional_profile_fields 필드에 대해 normalize_additional_profile_fields 함수를 적용하여,
    # 입력된 추가 프로필 필드 데이터를 최대한 유연하게 처리하여 정규화된 형태로 반환
    normalized_fields = normalize_additional_profile_fields(
        [field.model_dump() for field in payload.additional_profile_fields]
    )
    if len(normalized_fields) != len(payload.additional_profile_fields):
        raise HTTPException(status_code=400, detail="Invalid additional profile fields.")

    row: AdminCustomTest | None = None
    resolved_test_configs: list[dict] = []
    flattened_variants: list[dict] = []
    for config in payload.test_configs: # 검사별로 반복 (검사별 test_id와 선택한 척도코드-리스트)
        resolved_variant_configs = _resolve_sub_test_variant_configs(
            config.test_id,
            config.selected_scale_codes,
            excluded_sub_test_jsons=config.excluded_sub_test_jsons,
            db=db,
        ) # resolved_variant_configs : 정규화 처리된 test_id와 척도코드 - 리스트[딕셔너리]
        resolved_test_configs.append(
            {"test_id": config.test_id, "sub_test_variants": resolved_variant_configs}
        )
        flattened_variants.extend(resolved_variant_configs)

    sys_test_ids : set[str] = set() # 실시 가능한 모든 test_id를 집합에 저장하여 중복 제거

    for config in flattened_variants:
        # 실시 가능한 모든 test_id
        test_id = config["test_id"]
        sys_test_ids.add(test_id)

    # selected_scales_json 필드에 저장할 구조 생성
    selected_scales_struct_json = {
        str(config["test_id"]): [
            {
                "sub_test_json": json.loads(variant["sub_test_json"]),
                "variable": {
                    "available_scale_codes": variant["available_scale_codes"],
                    "selected_scale_codes": variant["selected_scale_codes"],
                },
            }
            for variant in config["sub_test_variants"]
        ]
        for config in resolved_test_configs
    }
    selected_scales_struct_json["__sessions"] = _build_session_configs_payload(payload, resolved_test_configs)
    row = AdminCustomTest( # AdminCustomTest 관리자가 만든 커스텀 검사 1건을 나타내는 sqlalchemy 모델, 각 검사별로 하나의 행이 생성됨
        admin_user_id=admin.id,
        test_id=json.dumps(sorted(sys_test_ids), ensure_ascii=False), # 실시 가능한 모든 test_id를 JSON 배열 형태로 저장
        sub_test_json=_build_structured_sub_test_json(resolved_test_configs),
        custom_test_name=trimmed_name,
        client_intake_mode=client_intake_mode,
        selected_scales_json=json.dumps(selected_scales_struct_json, ensure_ascii=False),
        additional_profile_fields_json=serialize_additional_profile_payload(
            normalized_fields,
        ),
        requires_consent=payload.requires_consent,
    )
    db.add(row)
    db.flush()
    commit(db)
    return {
        "message": "Custom tests created.",
        "created_count": 1,
        "ids": [row.id],
    }


def get_admin_custom_test(db: Session, admin_session: str | None, custom_test_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    test_configs = load_custom_test_configs(row)
    test_ids, test_id_text = summarize_custom_test_ids(test_configs, row.test_id)
    selected_scale_pairs = {
        (item["test_id"], code)
        for item in flatten_custom_test_variant_configs(test_configs)
        for code in item["selected_scale_codes"]
    }
    selected_scale_codes = sorted({code for _, code in selected_scale_pairs})
    raw_additional_payload = json.loads(getattr(row, "additional_profile_fields_json", "[]") or "[]")
    additional_profile_fields = normalize_additional_profile_fields(raw_additional_payload)
    variant_configs = flatten_custom_test_variant_configs(test_configs)
    if variant_configs:
        sub_test_variants = [item["sub_test_json"] for item in variant_configs]
    else:
        try:
            structured = json.loads(row.sub_test_json or "{}")
            if isinstance(structured, dict) and all(isinstance(v, list) for v in structured.values()):
                sub_test_variants = [
                    json.dumps(cond, ensure_ascii=False)
                    for conditions in structured.values()
                    for cond in conditions
                    if isinstance(cond, dict)
                ]
            else:
                sub_test_variants = [row.sub_test_json] if row.sub_test_json else []
        except (TypeError, json.JSONDecodeError):
            sub_test_variants = []
    return {
        "id": row.id,
        "custom_test_name": row.custom_test_name,
        "client_intake_mode": normalize_client_intake_mode(getattr(row, "client_intake_mode", "")),
        "test_id": test_id_text or row.test_id,
        "test_ids": test_ids,
        "sub_test_json": row.sub_test_json,
        "sub_test_variants": sub_test_variants,
        "sub_test_variant_configs": variant_configs,
        "test_configs": test_configs,
        "session_configs": load_custom_test_session_configs(row),
        "selected_scale_codes": selected_scale_codes,
        "additional_profile_fields": additional_profile_fields,
        "requires_consent": bool(getattr(row, "requires_consent", False)),
        "scale_count": len(selected_scale_pairs),
        "created_at": row.created_at.isoformat(),
    }


def update_admin_custom_test(
    db: Session,
    admin_session: str | None,
    custom_test_id: int,
    payload: UpdateCustomTestSettingsIn,
) -> dict:
    admin = get_current_admin(db, admin_session)
    row = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=custom_test_id,
        admin_user_id=admin.id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="검사를 찾을 수 없습니다.")

    trimmed_name = payload.custom_test_name.strip()
    client_intake_mode = normalize_client_intake_mode(payload.client_intake_mode)
    if not trimmed_name:
        raise HTTPException(status_code=400, detail="검사명은 공백만 입력할 수 없습니다.")

    row.custom_test_name = trimmed_name
    row.client_intake_mode = client_intake_mode
    row.requires_consent = payload.requires_consent
    if payload.session_configs is not None:
        selected_raw = {}
        try:
            parsed_selected = json.loads(row.selected_scales_json or "{}")
            if isinstance(parsed_selected, dict):
                selected_raw = parsed_selected
        except (TypeError, json.JSONDecodeError):
            selected_raw = {}

        test_configs = load_custom_test_configs(row)
        raw_sessions = [
            {
                "session_id": session.session_id,
                "title": session.title,
                "description": session.description,
                "guide_items": session.guide_items,
                "test_ids": session.test_ids,
            }
            for session in payload.session_configs
        ]
        selected_raw["__sessions"] = normalize_custom_test_session_configs(raw_sessions, test_configs)
        row.selected_scales_json = json.dumps(selected_raw, ensure_ascii=False)
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

    deactivate_access_links_by_test(db, admin_user_id=admin.id, custom_test_id=row.id)
    soft_delete_custom_test(db, admin_user_id=admin.id, custom_test_id=row.id)
    commit(db)
    return {"message": "검사가 목록에서 삭제되었습니다. 기존 실시 결과와 내담자 정보는 보존됩니다."}


def bulk_delete_admin_custom_tests(db: Session, admin_session: str | None, custom_test_ids: list[int]) -> dict:
    admin = get_current_admin(db, admin_session)
    target_ids = sorted({x for x in custom_test_ids if isinstance(x, int) and x > 0})
    if not target_ids:
        raise HTTPException(status_code=400, detail="삭제할 검사 ID가 없습니다.")

    found_ids = get_custom_test_ids_in(db, admin_user_id=admin.id, target_ids=target_ids)
    if not found_ids:
        return {"message": "삭제할 검사가 없습니다.", "deleted_count": 0}

    bulk_deactivate_access_links_by_test_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    bulk_soft_delete_custom_tests_by_ids(db, admin_user_id=admin.id, custom_test_ids=found_ids)
    commit(db)
    return {
        "message": "선택한 검사가 목록에서 삭제되었습니다. 기존 실시 결과와 내담자 정보는 보존됩니다.",
        "deleted_count": len(found_ids),
    }
