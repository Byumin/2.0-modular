from __future__ import annotations

import json
from typing import Any

from app.repositories.parent_test_repository import fetch_parent_scale_struct
from app.services.scoring.base import ScoringContext, ScoringResult


def split_answer_key(answer_key: str) -> tuple[str, str, str]:
    """
    answer_key format:
    {test_id}::{sub_test_json}::{item_id}
    """
    parts = str(answer_key).split("::")
    if len(parts) < 3:
        return "", "", ""
    test_id = parts[0].strip().upper()
    item_id = parts[-1].strip()
    sub_test_json = "::".join(parts[1:-1]).strip()
    return test_id, sub_test_json, item_id


def filter_answers_by_test(answers: dict[str, str], test_id: str) -> dict[str, str]:
    normalized = str(test_id).strip().upper()
    selected: dict[str, str] = {}
    for key, value in (answers or {}).items():
        key_test_id, _, item_id = split_answer_key(key)
        if key_test_id != normalized or not item_id:
            continue
        selected[item_id] = str(value)
    return selected


def group_answers_by_test_and_variant(
    answers: dict[str, str],
    test_id: str,
) -> dict[str, dict[str, str]]:
    # 평탄화 answers를 선택된 test_id 필터링해서 sub_test_json별 item 응답으로 재그룹화
    # 입력 : {"TESTID::SUBTESTJSON::ITEMID": "ANSWER_VALUE",...}
    # 출력 : {"SUBTESTJSON": {"ITEMID": "ANSWER_VALUE", ...},...}
    normalized = str(test_id).strip().upper()
    grouped: dict[str, dict[str, str]] = {} # 이중 딕셔너리 구조
    for key, value in (answers or {}).items(): # 평탄화된 :: 구조인데 어떻게 순환하려나?
        # 키 : test::subtestjson::itemid
        # 값 : 보기선택번호
        key_test_id, sub_test_json, item_id = split_answer_key(key)
        if key_test_id != normalized or not sub_test_json or not item_id:
            continue
        grouped.setdefault(sub_test_json, {})[item_id] = str(value)
    return grouped


def extract_selected_scale_codes_by_variant(
    assessment_payload: dict[str, Any],
    test_id: str,
) -> dict[str, set[str]]:
    # assessment_payload 대력적 형태
    # {
    #     "title": "봄학기용 내맘대로 검사",
    #     "sub_test_json": 커스텀 검사에 걸려있는 sub_test_json 모든 문자열,
    #     "selected_scale_codes": [선택한 검사 관련 없는 모든 척도 코드 나열]
    #     "selected_scales": [
    #         {
    #             "test_id": "TESTID",
    #             "sub_test_json": "SUBTESTJSON",
    #             "code": "SCALECODE",
    #             "name": "척도명",
    #             "item_ids: [
    #                 "test_id::sub_test_json::item_id",
    #                 "test_id::sub_test_json::item_id",
    #                 ...
    #         },
    #         ...
    #     ],
    #     ...
    # }
    normalized = str(test_id).strip().upper()
    grouped: dict[str, set[str]] = {}
    selected_scales = assessment_payload.get("selected_scales", [])
    if not isinstance(selected_scales, list):
        return grouped
    for raw_scale in selected_scales:
        if not isinstance(raw_scale, dict):
            continue
        scale_test_id = str(raw_scale.get("test_id", "")).strip().upper()
        sub_test_json = str(raw_scale.get("sub_test_json", "")).strip()
        code = str(raw_scale.get("code", "")).strip()
        if scale_test_id != normalized or not sub_test_json or not code: # test_id 필터링
            continue
        grouped.setdefault(sub_test_json, set()).add(code)
    return grouped


def _parse_numeric_score(raw_value: Any) -> int | float | None:
    text = str(raw_value).strip()
    if not text:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if number.is_integer():
        return int(number)
    return number


def _score_choice_score_map(
    *,
    answers_by_item: dict[str, str],
    choice_score: dict[str, Any],
) -> dict[str, Any]:
    # 내담자가 선택한 실제 보기번호를 점수로 환산하여 총점과 문항별 점수 계산
    total_score: int | float = 0
    answered_item_count = 0
    expected_item_count = 0
    item_scores: list[dict[str, Any]] = []

    for item_id, score_map in choice_score.items():
        item_id_text = str(item_id).strip()
        if not item_id_text or not isinstance(score_map, dict):
            continue
        expected_item_count += 1
        answer_value = str(answers_by_item.get(item_id_text, "")).strip()
        if not answer_value:
            continue
        raw_score_value = score_map.get(answer_value)
        parsed_score = _parse_numeric_score(raw_score_value)
        if parsed_score is None:
            continue
        answered_item_count += 1
        total_score += parsed_score
        item_scores.append(
            {
                "item_id": item_id_text,
                "answer_value": answer_value,
                "score": parsed_score,
            }
        )

    return {
        "total_score": total_score,
        "answered_item_count": answered_item_count,
        "expected_item_count": expected_item_count,
        "item_scores": item_scores,
    }

# 특정 test_id에 대해 제출된 응답 데이터를 검사하여 점수 계산하는 함수
def build_choice_score_result(test_id: str, context: ScoringContext) -> ScoringResult:
    normalized = str(test_id).strip().upper()
    grouped_answers = context.answers_by_test_variant.get(normalized, {})
    if not grouped_answers:
        grouped_answers = group_answers_by_test_and_variant(context.answers, normalized)
    if not grouped_answers:
        return ScoringResult(
            status="skipped",
            test_id=normalized,
            scales={},
            meta={"reason": "no_answers_for_test"},
        )
    indexed_variants = context.scoring_index_by_test_variant.get(normalized, {})
    selected_codes_by_variant = extract_selected_scale_codes_by_variant(
        context.assessment_payload,
        normalized,
    )

    scales: dict[str, Any] = {}
    variant_count = 0
    scored_scale_count = 0

    for sub_test_json, answers_by_item in grouped_answers.items():
        variant_index = indexed_variants.get(sub_test_json)
        if variant_index is None:
            row = fetch_parent_scale_struct(normalized, sub_test_json)
            if row is None:
                continue
            try:
                scale_struct = json.loads(row.scale_struct or "{}")
            except json.JSONDecodeError:
                continue
            if not isinstance(scale_struct, dict):
                continue
            variant_index = {"selected_scale_codes": sorted(selected_codes_by_variant.get(sub_test_json, set())), "scales": scale_struct}

        variant_count += 1
        selected_codes = set(variant_index.get("selected_scale_codes", [])) or selected_codes_by_variant.get(sub_test_json, set())
        indexed_scales = variant_index.get("scales", {})
        if not isinstance(indexed_scales, dict):
            continue

        for code, raw_scale in indexed_scales.items():
            code_text = str(code).strip()
            if not code_text:
                continue
            if selected_codes and code_text not in selected_codes:
                continue
            if not isinstance(raw_scale, dict):
                continue

            indexed_items = raw_scale.get("items")
            if isinstance(indexed_items, dict):
                scored = _score_choice_score_map(
                    answers_by_item=answers_by_item,
                    choice_score=indexed_items,
                )
                scales[f"{sub_test_json}::{code_text}"] = {
                    "code": code_text,
                    "name": str(raw_scale.get("name", code_text)),
                    "sub_test_json": sub_test_json,
                    **scored,
                }
                scored_scale_count += 1
                continue

            indexed_facets = raw_scale.get("facets")
            if not isinstance(indexed_facets, dict):
                continue

            facet_results: dict[str, Any] = {}
            total_score: int | float = 0
            answered_item_count = 0
            expected_item_count = 0
            combined_item_scores: list[dict[str, Any]] = []

            for facet_code, raw_facet in indexed_facets.items():
                facet_code_text = str(facet_code).strip()
                if not facet_code_text or not isinstance(raw_facet, dict):
                    continue
                facet_items = raw_facet.get("items")
                if not isinstance(facet_items, dict):
                    continue

                scored_facet = _score_choice_score_map(
                    answers_by_item=answers_by_item,
                    choice_score=facet_items,
                )
                facet_results[facet_code_text] = {
                    "code": facet_code_text,
                    "name": str(raw_facet.get("name", facet_code_text)),
                    **scored_facet,
                }
                total_score += scored_facet["total_score"]
                answered_item_count += scored_facet["answered_item_count"]
                expected_item_count += scored_facet["expected_item_count"]
                for item_score in scored_facet["item_scores"]:
                    combined_item_scores.append(
                        {
                            **item_score,
                            "facet_code": facet_code_text,
                        }
                    )

            scales[f"{sub_test_json}::{code_text}"] = {
                "code": code_text,
                "name": str(raw_scale.get("name", code_text)),
                "sub_test_json": sub_test_json,
                "total_score": total_score,
                "answered_item_count": answered_item_count,
                "expected_item_count": expected_item_count,
                "item_scores": combined_item_scores,
                "facets": facet_results,
            }
            scored_scale_count += 1

    if not scales:
        return ScoringResult(
            status="skipped",
            test_id=normalized,
            scales={},
            meta={"reason": "no_scorable_scales"},
        )

    return ScoringResult(
        status="scored",
        test_id=normalized,
        scales=scales,
        meta={
            "variant_count": variant_count,
            "scale_count": scored_scale_count,
            "scoring_rule": "choice_score_sum",
        },
    )
