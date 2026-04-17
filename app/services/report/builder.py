from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

import sqlalchemy
from sqlalchemy.orm import Session

from app.db.models import AdminCustomTest, AdminCustomTestSubmission, SubmissionScoringResult


def _load_interpret_map(db: Session, test_id: str) -> dict[str, Any]:
    row = db.execute(
        sqlalchemy.text('SELECT map FROM interpret WHERE "test.id" = :tid LIMIT 1'),
        {"tid": test_id},
    ).fetchone()
    if row is None:
        return {}
    try:
        return json.loads(row[0])
    except (json.JSONDecodeError, TypeError):
        return {}


def _get_interpretation(
    interpret_map: dict[str, Any],
    code: str,
    category: str | None,
    raw_score: int | float | None = None,
) -> str:
    entry = interpret_map.get(code)
    if not entry or not isinstance(entry, dict):
        return ""

    score_basis = entry.get("score_basis")
    if score_basis:
        score_val = raw_score if score_basis == "raw_score" else None
        if score_val is None:
            return ""
        for key, text in entry.items():
            if key == "score_basis":
                continue
            if "-" in str(key):
                try:
                    lo, hi = str(key).split("-", 1)
                    if int(lo) <= score_val <= int(hi):
                        return text
                except (ValueError, TypeError):
                    continue
        return ""

    return entry.get(category or "", "")


def _calc_age_text(birth_day: str, ref_date: date | None = None) -> str:
    try:
        birth = datetime.strptime(birth_day, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return ""
    ref = ref_date or date.today()
    years = ref.year - birth.year - ((ref.month, ref.day) < (birth.month, birth.day))
    months_offset = (ref.month - birth.month - (ref.day < birth.day)) % 12
    return f"만 {years}세 {months_offset}개월" if months_offset else f"만 {years}세"


def _build_facet_rows(
    interpret_map: dict[str, Any],
    facets: dict[str, Any],
) -> list[dict[str, Any]]:
    rows = []
    for _key, facet in facets.items():
        if not isinstance(facet, dict):
            continue
        code = str(facet.get("code", _key)).strip()
        category = facet.get("category")
        raw_score = facet.get("total_score")
        rows.append({
            "code": code,
            "name": facet.get("name", code),
            "raw_score": raw_score,
            "t_score": facet.get("t_score"),
            "percentile": facet.get("percentile"),
            "category": category,
            "interpretation": _get_interpretation(interpret_map, code, category, raw_score),
        })
    return rows


def _build_scale_rows(
    interpret_map: dict[str, Any],
    scales: dict[str, Any],
) -> list[dict[str, Any]]:
    rows = []
    for _key, scale in scales.items():
        if not isinstance(scale, dict):
            continue
        code = str(scale.get("code", "")).strip()
        category = scale.get("category")
        raw_score = scale.get("total_score")
        facets_raw = scale.get("facets") or {}
        rows.append({
            "code": code,
            "name": scale.get("name", code),
            "raw_score": raw_score,
            "t_score": scale.get("t_score"),
            "percentile": scale.get("percentile"),
            "category": category,
            "interpretation": _get_interpretation(interpret_map, code, category, raw_score),
            "answered_item_count": scale.get("answered_item_count"),
            "expected_item_count": scale.get("expected_item_count"),
            "facets": _build_facet_rows(interpret_map, facets_raw) if isinstance(facets_raw, dict) else [],
        })
    return rows


def build_report_from_scoring(
    *,
    db: Session,
    submission: AdminCustomTestSubmission,
    custom_test: AdminCustomTest,
    scoring_result: SubmissionScoringResult,
) -> dict[str, Any]:
    try:
        result_json = json.loads(scoring_result.result_json or "{}")
    except json.JSONDecodeError:
        result_json = {}

    try:
        answers_payload = json.loads(submission.answers_json or "{}")
    except json.JSONDecodeError:
        answers_payload = {}

    profile = answers_payload.get("profile", {}) if isinstance(answers_payload, dict) else {}
    birth_day = profile.get("birth_day", "")
    test_date = submission.created_at.date() if submission.created_at else date.today()

    test_ids: list[str] = []
    try:
        raw_ids = json.loads(custom_test.test_id or "[]")
        test_ids = raw_ids if isinstance(raw_ids, list) else [str(raw_ids)]
    except (json.JSONDecodeError, TypeError):
        test_ids = [str(custom_test.test_id)]

    all_scales: list[dict[str, Any]] = []
    for tid in test_ids:
        tid_upper = str(tid).strip().upper()
        interpret_map = _load_interpret_map(db, tid_upper)
        test_result = result_json.get(tid_upper, {})
        if not isinstance(test_result, dict):
            continue
        scales = test_result.get("scales", {})
        all_scales.extend(_build_scale_rows(interpret_map, scales))

    gender_label = {"male": "남자", "female": "여자"}.get(profile.get("gender", ""), profile.get("gender", ""))

    return {
        "submission_id": submission.id,
        "test_name": custom_test.custom_test_name,
        "test_date": test_date.strftime("%Y. %m. %d"),
        "profile": {
            "name": profile.get("name", ""),
            "gender": gender_label,
            "birth_day": birth_day,
            "age_text": _calc_age_text(birth_day, test_date),
        },
        "scales": all_scales,
    }


def get_public_report_by_submission_id(
    db: Session,
    *,
    submission_id: int,
    access_token: str,
) -> dict[str, Any]:
    submission = (
        db.query(AdminCustomTestSubmission)
        .filter_by(id=submission_id, access_token=access_token)
        .first()
    )
    if submission is None:
        return {"error": "not_found"}

    custom_test = db.query(AdminCustomTest).filter_by(id=submission.admin_custom_test_id).first()
    if custom_test is None:
        return {"error": "not_found"}

    scoring_result = (
        db.query(SubmissionScoringResult)
        .filter_by(submission_id=submission.id)
        .order_by(SubmissionScoringResult.id.desc())
        .first()
    )

    if scoring_result is None:
        from app.services.scoring.submissions import score_submission_by_id
        try:
            score_submission_by_id(
                db,
                admin_user_id=submission.admin_user_id,
                submission_id=submission.id,
            )
            scoring_result = (
                db.query(SubmissionScoringResult)
                .filter_by(submission_id=submission.id)
                .order_by(SubmissionScoringResult.id.desc())
                .first()
            )
        except Exception:
            return {"error": "scoring_failed"}

    if scoring_result is None:
        return {"error": "scoring_failed"}

    return build_report_from_scoring(
        db=db,
        submission=submission,
        custom_test=custom_test,
        scoring_result=scoring_result,
    )


def get_report_by_submission_id(
    db: Session,
    *,
    admin_user_id: int,
    submission_id: int,
) -> dict[str, Any]:
    submission = (
        db.query(AdminCustomTestSubmission)
        .filter_by(id=submission_id, admin_user_id=admin_user_id)
        .first()
    )
    if submission is None:
        return {"error": "not_found"}

    custom_test = db.query(AdminCustomTest).filter_by(id=submission.admin_custom_test_id).first()
    if custom_test is None:
        return {"error": "not_found"}

    scoring_result = (
        db.query(SubmissionScoringResult)
        .filter_by(submission_id=submission.id)
        .order_by(SubmissionScoringResult.id.desc())
        .first()
    )
    if scoring_result is None:
        from app.services.scoring.submissions import score_submission_by_id
        try:
            score_submission_by_id(db, admin_user_id=admin_user_id, submission_id=submission.id)
            scoring_result = (
                db.query(SubmissionScoringResult)
                .filter_by(submission_id=submission.id)
                .order_by(SubmissionScoringResult.id.desc())
                .first()
            )
        except Exception:
            return {"error": "scoring_failed"}

    if scoring_result is None:
        return {"error": "scoring_failed"}

    return build_report_from_scoring(
        db=db,
        submission=submission,
        custom_test=custom_test,
        scoring_result=scoring_result,
    )
