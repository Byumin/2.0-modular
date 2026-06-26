import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.models import AdminCustomTest, AdminCustomTestSubmission
from app.db.session import SessionLocal
from app.repositories.custom_test_restructure_repository import (
    backfill_custom_test_restructure_row,
    backfill_submission_snapshot_row,
)
from app.services.admin.assessment_links import build_custom_assessment_question_payload
from app.services.admin.common import (
    flatten_custom_test_variant_configs,
    load_custom_test_configs,
    load_custom_test_session_configs,
    normalize_additional_profile_fields,
    summarize_custom_test_ids,
)


def _json_loads(raw: Any, default: Any) -> Any:
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(str(raw or ""))
    except json.JSONDecodeError:
        return default


def _load_additional_profile_fields(custom_test: AdminCustomTest) -> list[dict[str, Any]]:
    raw = _json_loads(getattr(custom_test, "additional_profile_fields_json", "[]"), [])
    return normalize_additional_profile_fields(raw)


def _fallback_assessment_payload(custom_test: AdminCustomTest) -> dict[str, Any]:
    test_configs = load_custom_test_configs(custom_test)
    test_ids, _ = summarize_custom_test_ids(test_configs, custom_test.test_id)
    selected_scale_codes = sorted(
        {
            code
            for variant in flatten_custom_test_variant_configs(test_configs)
            for code in variant.get("selected_scale_codes", [])
        }
    )
    return {
        "test_ids": test_ids,
        "selected_sub_tests": flatten_custom_test_variant_configs(test_configs),
        "selected_scale_codes": selected_scale_codes,
        "selected_scales": [],
        "sessions": load_custom_test_session_configs(custom_test),
        "required_profile_fields": [],
        "profile_field_options": {},
        "additional_profile_fields": _load_additional_profile_fields(custom_test),
        "profile_config": {},
    }


def _submission_profile(submission: AdminCustomTestSubmission) -> dict[str, Any]:
    payload = _json_loads(submission.answers_json, {})
    if not isinstance(payload, dict):
        return {}
    profile = payload.get("profile", {})
    return profile if isinstance(profile, dict) else {}


def run_backfill(*, apply: bool, limit: int | None = None) -> dict[str, int]:
    db = SessionLocal()
    stats = {
        "custom_tests_seen": 0,
        "custom_tests_backfilled": 0,
        "submissions_seen": 0,
        "submission_snapshots_backfilled": 0,
        "submission_snapshot_fallbacks": 0,
        "errors": 0,
    }
    try:
        query = db.query(AdminCustomTest).order_by(AdminCustomTest.id)
        if limit:
            query = query.limit(limit)
        custom_tests = query.all()
        custom_test_by_id = {row.id: row for row in custom_tests}
        for custom_test in custom_tests:
            stats["custom_tests_seen"] += 1
            test_configs = load_custom_test_configs(custom_test)
            if not test_configs:
                continue
            try:
                if apply:
                    backfill_custom_test_restructure_row(
                        db,
                        custom_test=custom_test,
                        test_configs=test_configs,
                        session_configs=load_custom_test_session_configs(custom_test),
                        additional_profile_fields=_load_additional_profile_fields(custom_test),
                    )
                    db.commit()
                stats["custom_tests_backfilled"] += 1
            except Exception:
                stats["errors"] += 1
                db.rollback()
                continue

        submission_query = db.query(AdminCustomTestSubmission).order_by(AdminCustomTestSubmission.id)
        if limit:
            submission_query = submission_query.limit(limit)
        for submission in submission_query.all():
            stats["submissions_seen"] += 1
            custom_test = custom_test_by_id.get(submission.admin_custom_test_id)
            if custom_test is None:
                custom_test = db.query(AdminCustomTest).filter(AdminCustomTest.id == submission.admin_custom_test_id).first()
            if custom_test is None:
                continue
            fallback = False
            try:
                assessment_payload = build_custom_assessment_question_payload(
                    custom_test,
                    _submission_profile(submission),
                    db=db,
                )
            except Exception:
                fallback = True
                assessment_payload = _fallback_assessment_payload(custom_test)
            try:
                if apply:
                    backfill_submission_snapshot_row(
                        db,
                        submission=submission,
                        custom_test=custom_test,
                        source_test_ids=assessment_payload.get("test_ids") or [],
                        variant_projection_snapshot=assessment_payload.get("selected_sub_tests") or [],
                        selected_scales_snapshot={
                            "selected_scale_codes": assessment_payload.get("selected_scale_codes") or [],
                            "selected_scales": assessment_payload.get("selected_scales") or [],
                        },
                        session_configs_snapshot=assessment_payload.get("sessions") or [],
                        profile_fields_snapshot={
                            "required_profile_fields": assessment_payload.get("required_profile_fields") or [],
                            "profile_field_options": assessment_payload.get("profile_field_options") or {},
                            "additional_profile_fields": assessment_payload.get("additional_profile_fields") or [],
                            "profile_config": assessment_payload.get("profile_config") or {},
                        },
                    )
                    db.commit()
                stats["submission_snapshots_backfilled"] += 1
                if fallback:
                    stats["submission_snapshot_fallbacks"] += 1
            except Exception:
                stats["errors"] += 1
                db.rollback()
                continue

        if not apply:
            db.rollback()
        return stats
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write backfill rows")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    stats = run_backfill(apply=args.apply, limit=args.limit)
    print(json.dumps(stats, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
