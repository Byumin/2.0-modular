from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.custom_test_repository import (
    create_submission_scoring_result,
    get_custom_test_by_id_and_admin,
    get_submission_by_id_and_admin,
)
from app.repositories.parent_test_repository import fetch_parent_scale_struct
from app.services.admin.assessment_links import build_custom_assessment_question_payload
from app.services.admin.auth import get_current_admin
from app.services.admin.common import load_custom_test_configs, summarize_custom_test_ids
from app.services.scoring.base import ScoringContext, ScoringResult
from app.services.scoring.engine import ScoringEngine
from app.services.scoring.utils import split_answer_key


def _flatten_submission_answers(raw_answers: Any) -> dict[str, str]:
    # 제출된 응답 데이터를 평탄화
    flattened: dict[str, str] = {}

    if isinstance(raw_answers, dict):
        for answer_key, raw_value in raw_answers.items():
            key = str(answer_key).strip()
            if not key:
                continue
            flattened[key] = str(raw_value)
        return flattened

    if not isinstance(raw_answers, list):
        return flattened

    for group in raw_answers:
        if not isinstance(group, dict):
            continue
        test_id = str(group.get("test_id", "")).strip().upper()
        sub_test_json = str(group.get("sub_test_json", "")).strip()
        items = group.get("items", [])
        if not test_id or not sub_test_json or not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue
            parent_item_id = str(item.get("parent_item_id", "")).strip()
            if not parent_item_id:
                continue
            answer_key = f"{test_id}::{sub_test_json}::{parent_item_id}"
            flattened[answer_key] = str(item.get("answer_value", ""))
    # flattened 예시 형태
    # {
    #     "TESTID::SUBTESTJSON::PARENTITEMID": "ANSWER_VALUE",
    #     "TESTID::SUBTESTJSON::PARENTITEMID": "ANSWER_VALUE",
    #     ...
    return flattened


def _serialize_scoring_results(results: dict[str, ScoringResult]) -> dict[str, dict[str, Any]]:
    serialized: dict[str, dict[str, Any]] = {}
    for test_id, result in (results or {}).items():
        serialized[str(test_id)] = {
            "status": result.status,
            "test_id": result.test_id,
            "scales": result.scales,
            "meta": result.meta,
        }
    return serialized


def _build_answers_by_test_variant(flattened_answers: dict[str, str]) -> dict[str, dict[str, dict[str, str]]]:
    # 입력 형태: { "TESTID::SUBTESTJSON::PARENTITEMID": "ANSWER_VALUE", ... }
    # 출력 형태: { "TESTID": { "SUBTESTJSON": { "PARENTITEMID": "ANSWER_VALUE", ... }, ... }, ... }
    grouped: dict[str, dict[str, dict[str, str]]] = {}
    for answer_key, raw_value in (flattened_answers or {}).items():
        test_id, sub_test_json, item_id = split_answer_key(answer_key)
        if not test_id or not sub_test_json or not item_id:
            continue
        grouped.setdefault(test_id, {}).setdefault(sub_test_json, {})[item_id] = str(raw_value)
    return grouped


def _normalize_choice_score_map(raw_choice_score: Any) -> dict[str, dict[str, int | float]]:
    # db.parent_test.scale_struct 내 척도 구조에서 choice_score 맵을 선택번호:점수 형태를 정규화하여
    # item_id_text : dict[str, int | float] 형태로 변환
    normalized: dict[str, dict[str, int | float]] = {}
    if not isinstance(raw_choice_score, dict):
        return normalized
    for item_id, raw_score_map in raw_choice_score.items():
        item_id_text = str(item_id).strip()
        if not item_id_text or not isinstance(raw_score_map, dict):
            continue
        score_map: dict[str, int | float] = {}
        for answer_value, raw_score in raw_score_map.items():
            answer_text = str(answer_value).strip()
            score_text = str(raw_score).strip()
            if not answer_text or not score_text:
                continue
            try:
                number = float(score_text)
            except ValueError:
                continue
            score_map[answer_text] = int(number) if number.is_integer() else number
        if score_map:
            normalized[item_id_text] = score_map
    return normalized


def _build_variant_scoring_index(
    *,
    test_id: str,
    sub_test_json: str,
    selected_scale_codes: set[str],
) -> dict[str, Any]:
    row = fetch_parent_scale_struct(test_id, sub_test_json) # parent 검사 test_id, sub_test_json으로 척도 구조 조회
    if row is None:
        return {"selected_scale_codes": sorted(selected_scale_codes), "scales": {}}
    try:
        scale_struct = json.loads(row.scale_struct or "{}")
    except json.JSONDecodeError:
        return {"selected_scale_codes": sorted(selected_scale_codes), "scales": {}}
    if not isinstance(scale_struct, dict):
        return {"selected_scale_codes": sorted(selected_scale_codes), "scales": {}}

    scales: dict[str, Any] = {}
    for code, raw_scale in scale_struct.items():
        code_text = str(code).strip()
        if not code_text:
            continue
        if selected_scale_codes and code_text not in selected_scale_codes:
            continue
        if not isinstance(raw_scale, dict):
            continue

        choice_score = _normalize_choice_score_map(raw_scale.get("choice_score"))
        facet_scale = raw_scale.get("facet_scale") # 없으면 none 반환

        if choice_score:
            scales[code_text] = {
                "code": code_text,
                "name": str(raw_scale.get("name", code_text)),
                "items": choice_score,
            }
            continue

        facets: dict[str, Any] = {}
        if isinstance(facet_scale, dict): # facet_scale이 dict 형태인 경우에만 처리
            for facet_code, raw_facet in facet_scale.items():
                facet_code_text = str(facet_code).strip()
                if not facet_code_text or not isinstance(raw_facet, dict):
                    continue
                facet_choice_score = _normalize_choice_score_map(raw_facet.get("choice_score"))
                if not facet_choice_score:
                    continue
                facets[facet_code_text] = {
                    "code": facet_code_text,
                    "name": str(raw_facet.get("name", facet_code_text)),
                    "items": facet_choice_score,
                }
        if facets:
            scales[code_text] = {
                "code": code_text,
                "name": str(raw_scale.get("name", code_text)),
                "facets": facets,
            }

    return {
        "selected_scale_codes": sorted(selected_scale_codes),
        "scales": scales,
    }


def _build_scoring_index_by_test_variant(
    assessment_payload: dict[str, Any],
) -> dict[str, dict[str, dict[str, Any]]]:
    # 입력 assessment_payload 예시 형태
    # {
    #     "selected_scales": [
    #         {
    #             "test_id": "TESTID",
    #             "sub_test_json": "SUBTESTJSON",
    #             "code": "SCALECODE"
    #             "name": "척도명",
    #             "item_ids": [
    #                 "test_id::sub_test_json::item_id",
    #                 ...
    #             ]
    #         },
    #         ...
    #     ]
    # }
    selected_scales = assessment_payload.get("selected_scales", [])
    if not isinstance(selected_scales, list):
        return {}

    selected_codes_by_test_variant: dict[str, dict[str, set[str]]] = {}
    for raw_scale in selected_scales:
        if not isinstance(raw_scale, dict):
            continue
        test_id = str(raw_scale.get("test_id", "")).strip().upper()
        sub_test_json = str(raw_scale.get("sub_test_json", "")).strip()
        code = str(raw_scale.get("code", "")).strip()
        if not test_id or not sub_test_json or not code:
            continue
        selected_codes_by_test_variant.setdefault(test_id, {}).setdefault(sub_test_json, set()).add(code)

    scoring_index: dict[str, dict[str, dict[str, Any]]] = {}
    for test_id, variants in selected_codes_by_test_variant.items():
        scoring_index[test_id] = {}
        for sub_test_json, selected_scale_codes in variants.items():
            scoring_index[test_id][sub_test_json] = _build_variant_scoring_index(
                test_id=test_id,
                sub_test_json=sub_test_json,
                selected_scale_codes=selected_scale_codes,
            )
    return scoring_index


def _load_submission_scoring_bundle(
    db: Session,
    *,
    admin_user_id: int,
    submission_id: int,
) -> tuple[ScoringContext, list[str], str, dict[str, Any]]:
    submission = get_submission_by_id_and_admin(
        db,
        submission_id=submission_id,
        admin_user_id=admin_user_id,
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="제출 데이터를 찾을 수 없습니다.")

    custom_test = get_custom_test_by_id_and_admin(
        db,
        custom_test_id=submission.admin_custom_test_id,
        admin_user_id=admin_user_id,
    )
    if custom_test is None:
        raise HTTPException(status_code=404, detail="커스텀 검사를 찾을 수 없습니다.")

    try:
        answers_payload = json.loads(submission.answers_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="제출 응답 데이터 형식이 올바르지 않습니다.") from exc
    if not isinstance(answers_payload, dict):
        raise HTTPException(status_code=500, detail="제출 응답 데이터 형식이 올바르지 않습니다.")

    profile = answers_payload.get("profile", {})
    if not isinstance(profile, dict):
        profile = {}

    flattened_answers = _flatten_submission_answers(answers_payload.get("answers", {}))
    test_configs = load_custom_test_configs(custom_test)
    test_ids, test_id_text = summarize_custom_test_ids(test_configs, custom_test.test_id)
    assessment_payload = build_custom_assessment_question_payload(custom_test, profile)
    answers_by_test_variant = _build_answers_by_test_variant(flattened_answers)
    scoring_index_by_test_variant = _build_scoring_index_by_test_variant(assessment_payload)

    context = ScoringContext(
        custom_test_id=custom_test.id,
        custom_test_name=custom_test.custom_test_name,
        profile=profile,
        answers=flattened_answers,
        answers_by_test_variant=answers_by_test_variant,
        scoring_index_by_test_variant=scoring_index_by_test_variant,
        assessment_payload=assessment_payload,
    )
    return context, test_ids, test_id_text, {
        "submission": submission,
        "custom_test": custom_test,
        "answers_payload": answers_payload,
    }


def build_scoring_context_from_submission(
    # 제출 데이터와 커스텀 검사 데이터를 조회하여 ScoringContext 조립하는 함수
    db: Session,
    admin_session: str | None,
    submission_id: int,
) -> tuple[ScoringContext, list[str], str, dict[str, Any]]:
    admin = get_current_admin(db, admin_session) # 관리자 인증 및 조회 (admin_session -> admin_user_id -> AdminUser 모델 반환)
    return _load_submission_scoring_bundle(
        db,
        admin_user_id=admin.id,
        submission_id=submission_id,
    )


def score_submission_by_id(
    db: Session,
    *,
    admin_user_id: int,
    submission_id: int,
) -> dict:
    context, test_ids, test_id_text, loaded = _load_submission_scoring_bundle(
        db,
        admin_user_id=admin_user_id,
        submission_id=submission_id,
    )
    submission = loaded["submission"]
    answers_payload = loaded["answers_payload"]
    engine = ScoringEngine()
    scoring_results = engine.score_tests(
        test_ids=test_ids,
        context=context,
    )
    serialized_results = _serialize_scoring_results(scoring_results)
    statuses = sorted({result["status"] for result in serialized_results.values()})
    persisted_result = create_submission_scoring_result(
        db,
        admin_user_id=submission.admin_user_id,
        admin_custom_test_id=submission.admin_custom_test_id,
        client_id=submission.client_id,
        submission_id=submission.id,
        scoring_status=",".join(statuses) if statuses else "scored",
        result_json=json.dumps(serialized_results, ensure_ascii=False),
    )

    return {
        "message": "채점 엔진 호출이 완료되었습니다.",
        "trigger": "submission_saved",
        "submission_id": submission.id,
        "client_id": submission.client_id,
        "admin_custom_test_id": submission.admin_custom_test_id,
        "custom_test_name": context.custom_test_name,
        "test_ids": test_ids,
        "test_id_text": test_id_text,
        "answer_group_count": len(answers_payload.get("answers", [])),
        "flattened_answer_count": len(context.answers),
        "assessment_item_count": len(context.assessment_payload.get("items", [])),
        "engine_result_count": len(serialized_results),
        "engine_statuses": statuses,
        "scoring_result_id": persisted_result.id,
        "status": "scoring_completed",
        "results": serialized_results,
    }


def trigger_submission_scoring(db: Session, admin_session: str | None, submission_id: int) -> dict:
    admin = get_current_admin(db, admin_session)
    return score_submission_by_id(
        db,
        admin_user_id=admin.id,
        submission_id=submission_id,
    )
