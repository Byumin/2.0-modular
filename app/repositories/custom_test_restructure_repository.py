import json
import hashlib
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import (
    AdminCustomTest,
    AdminCustomTestProfileField,
    AdminCustomTestScaleSelection,
    AdminCustomTestSession,
    AdminCustomTestSessionSource,
    AdminCustomTestSource,
    AdminCustomTestSourceDependency,
    AdminCustomTestSubmission,
    AdminCustomTestVariantProjection,
    AdminCustomTestVariantScaleProjection,
    SubmissionCustomTestSnapshot,
)
from app.repositories.parent_test_repository import fetch_parent_scale_rows_by_test


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _canonical_json_text(value: Any) -> str:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return value.strip()
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _hash_value(value: Any) -> str:
    return _hash_text(_canonical_json_text(value))


def _normalize_codes(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    result: list[str] = []
    seen: set[str] = set()
    for item in raw:
        code = str(item or "").strip()
        if not code or code in seen:
            continue
        seen.add(code)
        result.append(code)
    return result


def _collect_scale_codes(scale_struct: Any) -> list[str]:
    if isinstance(scale_struct, str):
        try:
            scale_struct = json.loads(scale_struct)
        except json.JSONDecodeError:
            return []
    if not isinstance(scale_struct, dict):
        return []

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


def _field_key(field: dict[str, Any], index: int) -> str:
    explicit = str(field.get("key") or field.get("field_key") or "").strip()
    if explicit:
        return explicit[:80]
    label = str(field.get("label") or "").strip()
    if label:
        return label[:80]
    return f"field_{index + 1}"


def _load_parent_dependency_payloads(db: Session, test_id: str) -> list[dict[str, Any]]:
    normalized_test_id = str(test_id or "").strip().upper()
    if not normalized_test_id:
        return []
    queries = [
        (
            "itemcondition",
            """
            SELECT CAST(id AS TEXT) AS dependency_id, name, condition
            FROM itemcondition
            WHERE "test.id" = :test_id
            ORDER BY id
            """,
        ),
        (
            "scalecondition",
            """
            SELECT CAST(id AS TEXT) AS dependency_id, name, condition
            FROM scalecondition
            WHERE "test.id" = :test_id
            ORDER BY id
            """,
        ),
        (
            "normcondition",
            """
            SELECT CAST(id AS TEXT) AS dependency_id, name, condition
            FROM normcondition
            WHERE "test.id" = :test_id
            ORDER BY id
            """,
        ),
        (
            "scale",
            """
            SELECT CAST("condition.id" AS TEXT) AS dependency_id, struct
            FROM scale
            WHERE "test.id" = :test_id
            ORDER BY "condition.id"
            """,
        ),
        (
            "item",
            """
            SELECT CAST(id AS TEXT) AS dependency_id, no, text, meta_json, CAST("condition.id" AS TEXT) AS condition_id
            FROM item
            WHERE "test.id" = :test_id
            ORDER BY "condition.id", no, id
            """,
        ),
    ]
    payloads: list[dict[str, Any]] = []
    seen_dependency_ids: dict[tuple[str, str], int] = {}
    for dependency_type, query in queries:
        rows = db.execute(text(query), {"test_id": normalized_test_id}).fetchall()
        for row in rows:
            mapping = dict(row._mapping)
            dependency_id = str(mapping.pop("dependency_id", "") or "").strip()
            if not dependency_id:
                continue
            dependency_key = (dependency_type, dependency_id)
            seen_count = seen_dependency_ids.get(dependency_key, 0)
            seen_dependency_ids[dependency_key] = seen_count + 1
            if seen_count:
                dependency_id = f"{dependency_id}#{seen_count + 1}"
            payloads.append(
                {
                    "dependency_type": dependency_type,
                    "dependency_id": f"{normalized_test_id}:{dependency_id}",
                    "payload": mapping,
                }
            )
    return payloads


def _replace_source_dependencies(
    db: Session,
    *,
    source: AdminCustomTestSource,
    dependency_payloads: list[dict[str, Any]],
) -> str:
    db.query(AdminCustomTestSourceDependency).filter(
        AdminCustomTestSourceDependency.custom_test_source_id == source.id
    ).delete(synchronize_session=False)

    canonical_payloads: list[dict[str, str]] = []
    for item in dependency_payloads:
        dependency_type = str(item.get("dependency_type") or "").strip()
        dependency_id = str(item.get("dependency_id") or "").strip()
        if not dependency_type or not dependency_id:
            continue
        dependency_hash = _hash_value(item.get("payload") or {})
        canonical_payloads.append(
            {
                "dependency_type": dependency_type,
                "dependency_id": dependency_id,
                "dependency_hash": dependency_hash,
            }
        )
        db.add(
            AdminCustomTestSourceDependency(
                custom_test_source_id=source.id,
                dependency_type=dependency_type,
                dependency_id=dependency_id,
                dependency_hash=dependency_hash,
            )
        )
    return _hash_value(canonical_payloads)


def refresh_custom_test_source_projection(
    db: Session,
    *,
    source: AdminCustomTestSource,
) -> None:
    selected_codes = _normalize_codes(
        [
            row.scale_code
            for row in db.query(AdminCustomTestScaleSelection)
            .filter(AdminCustomTestScaleSelection.custom_test_source_id == source.id)
            .order_by(AdminCustomTestScaleSelection.selected_order, AdminCustomTestScaleSelection.id)
            .all()
        ]
    )
    selected_set = set(selected_codes)
    dependency_payloads = _load_parent_dependency_payloads(db, source.source_test_id)
    generated_from_hash = _replace_source_dependencies(
        db,
        source=source,
        dependency_payloads=dependency_payloads,
    )

    projection_ids = [
        row.id
        for row in db.query(AdminCustomTestVariantProjection.id)
        .filter(AdminCustomTestVariantProjection.custom_test_source_id == source.id)
        .all()
    ]
    if projection_ids:
        db.query(AdminCustomTestVariantScaleProjection).filter(
            AdminCustomTestVariantScaleProjection.variant_projection_id.in_(projection_ids)
        ).delete(synchronize_session=False)
        db.query(AdminCustomTestVariantProjection).filter(
            AdminCustomTestVariantProjection.id.in_(projection_ids)
        ).delete(synchronize_session=False)
    db.flush()

    unavailable_selected = set(selected_set)
    seen_projection_keys: set[tuple[str, str]] = set()
    for row in fetch_parent_scale_rows_by_test(source.source_test_id, db=db):
        condition_json = str(row.sub_test_json or "").strip()
        if not condition_json:
            continue
        available_codes = _collect_scale_codes(row.scale_struct)
        selected_for_variant = sorted(selected_set.intersection(available_codes))
        if not selected_for_variant:
            continue
        unavailable_selected.difference_update(selected_for_variant)
        condition_hash = _hash_value(condition_json)
        projection_key = (condition_hash, generated_from_hash)
        if projection_key in seen_projection_keys:
            continue
        seen_projection_keys.add(projection_key)

        projection = AdminCustomTestVariantProjection(
            custom_test_source_id=source.id,
            condition_hash=condition_hash,
            eligibility_condition_json=_canonical_json_text(condition_json),
            generated_from_hash=generated_from_hash,
            is_current=True,
            status="current",
        )
        db.add(projection)
        db.flush()

        for code in available_codes:
            status = "selected" if code in selected_set else "available"
            db.add(
                AdminCustomTestVariantScaleProjection(
                    variant_projection_id=projection.id,
                    scale_code=code,
                    availability_status=status,
                )
            )

    if unavailable_selected:
        projection = AdminCustomTestVariantProjection(
            custom_test_source_id=source.id,
            condition_hash=_hash_value({"unavailable_selected_scale_codes": sorted(unavailable_selected)}),
            eligibility_condition_json=_json_dumps({"unavailable_selected_scale_codes": sorted(unavailable_selected)}),
            generated_from_hash=generated_from_hash,
            is_current=True,
            status="unavailable_after_source_change",
        )
        db.add(projection)
        db.flush()
        for code in sorted(unavailable_selected):
            db.add(
                AdminCustomTestVariantScaleProjection(
                    variant_projection_id=projection.id,
                    scale_code=code,
                    availability_status="unavailable_after_source_change",
                )
            )


def replace_custom_test_restructure_sources(
    db: Session,
    *,
    custom_test_id: int,
    resolved_test_configs: list[dict[str, Any]],
    selected_scale_codes_by_test_id: dict[str, list[str]],
    session_configs: list[dict[str, Any]],
    additional_profile_fields: list[dict[str, Any]],
) -> None:
    """Replace source-of-truth rows derived from one child_test row.

    Reads still use child_test JSON. These rows are the normalized write-side
    mirror used for backfill validation and the later read-path cutover.
    """
    existing_source_ids = [
        row.id
        for row in db.query(AdminCustomTestSource.id)
        .filter(AdminCustomTestSource.custom_test_id == custom_test_id)
        .all()
    ]
    if existing_source_ids:
        projection_ids = [
            row.id
            for row in db.query(AdminCustomTestVariantProjection.id)
            .filter(AdminCustomTestVariantProjection.custom_test_source_id.in_(existing_source_ids))
            .all()
        ]
        if projection_ids:
            db.query(AdminCustomTestVariantScaleProjection).filter(
                AdminCustomTestVariantScaleProjection.variant_projection_id.in_(projection_ids)
            ).delete(synchronize_session=False)
            db.query(AdminCustomTestVariantProjection).filter(
                AdminCustomTestVariantProjection.id.in_(projection_ids)
            ).delete(synchronize_session=False)
        db.query(AdminCustomTestSourceDependency).filter(
            AdminCustomTestSourceDependency.custom_test_source_id.in_(existing_source_ids)
        ).delete(synchronize_session=False)
        db.query(AdminCustomTestScaleSelection).filter(
            AdminCustomTestScaleSelection.custom_test_source_id.in_(existing_source_ids)
        ).delete(synchronize_session=False)
        db.query(AdminCustomTestSessionSource).filter(
            AdminCustomTestSessionSource.custom_test_source_id.in_(existing_source_ids)
        ).delete(synchronize_session=False)

    existing_session_ids = [
        row.id
        for row in db.query(AdminCustomTestSession.id)
        .filter(AdminCustomTestSession.custom_test_id == custom_test_id)
        .all()
    ]
    if existing_session_ids:
        db.query(AdminCustomTestSessionSource).filter(
            AdminCustomTestSessionSource.session_id.in_(existing_session_ids)
        ).delete(synchronize_session=False)
        db.query(AdminCustomTestSession).filter(
            AdminCustomTestSession.id.in_(existing_session_ids)
        ).delete(synchronize_session=False)

    db.query(AdminCustomTestProfileField).filter(
        AdminCustomTestProfileField.custom_test_id == custom_test_id
    ).delete(synchronize_session=False)
    db.query(AdminCustomTestSource).filter(
        AdminCustomTestSource.custom_test_id == custom_test_id
    ).delete(synchronize_session=False)
    db.flush()

    source_by_test_id: dict[str, AdminCustomTestSource] = {}
    for index, config in enumerate(resolved_test_configs):
        test_id = str(config.get("test_id") or "").strip()
        if not test_id or test_id in source_by_test_id:
            continue
        source = AdminCustomTestSource(
            custom_test_id=custom_test_id,
            source_test_id=test_id,
            source_order=index,
            is_enabled=True,
        )
        db.add(source)
        db.flush()
        source_by_test_id[test_id] = source

        for selected_order, code in enumerate(_normalize_codes(selected_scale_codes_by_test_id.get(test_id, []))):
            db.add(
                AdminCustomTestScaleSelection(
                    custom_test_source_id=source.id,
                    scale_code=code,
                    selected_order=selected_order,
                )
            )
        db.flush()
        refresh_custom_test_source_projection(db, source=source)

    for session_index, session_config in enumerate(session_configs):
        session = AdminCustomTestSession(
            custom_test_id=custom_test_id,
            session_index=int(session_config.get("session_index", session_index) or 0),
            title=str(session_config.get("title") or ""),
            description=str(session_config.get("description") or ""),
            guide_items_json=_json_dumps(session_config.get("guide_items") or []),
        )
        db.add(session)
        db.flush()
        for display_order, raw_test_id in enumerate(session_config.get("test_ids") or []):
            source = source_by_test_id.get(str(raw_test_id or "").strip())
            if source is None:
                continue
            db.add(
                AdminCustomTestSessionSource(
                    session_id=session.id,
                    custom_test_source_id=source.id,
                    display_order=display_order,
                )
            )

    for index, field in enumerate(additional_profile_fields):
        if not isinstance(field, dict):
            continue
        key = _field_key(field, index)
        label = str(field.get("label") or "").strip()
        if not key or not label:
            continue
        db.add(
            AdminCustomTestProfileField(
                custom_test_id=custom_test_id,
                field_key=key,
                label=label,
                input_type=str(field.get("type") or field.get("input_type") or "short_text"),
                required=bool(field.get("required", False)),
                options_json=_json_dumps(field.get("options") or []),
                display_order=index,
            )
        )


def replace_custom_test_restructure_sessions(
    db: Session,
    *,
    custom_test_id: int,
    session_configs: list[dict[str, Any]],
) -> None:
    sources = (
        db.query(AdminCustomTestSource)
        .filter(AdminCustomTestSource.custom_test_id == custom_test_id)
        .all()
    )
    source_by_test_id = {source.source_test_id: source for source in sources}

    existing_session_ids = [
        row.id
        for row in db.query(AdminCustomTestSession.id)
        .filter(AdminCustomTestSession.custom_test_id == custom_test_id)
        .all()
    ]
    if existing_session_ids:
        db.query(AdminCustomTestSessionSource).filter(
            AdminCustomTestSessionSource.session_id.in_(existing_session_ids)
        ).delete(synchronize_session=False)
        db.query(AdminCustomTestSession).filter(
            AdminCustomTestSession.id.in_(existing_session_ids)
        ).delete(synchronize_session=False)
    db.flush()

    for session_index, session_config in enumerate(session_configs):
        session = AdminCustomTestSession(
            custom_test_id=custom_test_id,
            session_index=int(session_config.get("session_index", session_index) or 0),
            title=str(session_config.get("title") or ""),
            description=str(session_config.get("description") or ""),
            guide_items_json=_json_dumps(session_config.get("guide_items") or []),
        )
        db.add(session)
        db.flush()
        for display_order, raw_test_id in enumerate(session_config.get("test_ids") or []):
            source = source_by_test_id.get(str(raw_test_id or "").strip())
            if source is None:
                continue
            db.add(
                AdminCustomTestSessionSource(
                    session_id=session.id,
                    custom_test_source_id=source.id,
                    display_order=display_order,
                )
            )


def load_custom_test_configs_from_restructure(
    db: Session,
    *,
    custom_test_id: int,
) -> list[dict[str, Any]]:
    sources = (
        db.query(AdminCustomTestSource)
        .filter(
            AdminCustomTestSource.custom_test_id == custom_test_id,
            AdminCustomTestSource.is_enabled.is_(True),
        )
        .order_by(AdminCustomTestSource.source_order, AdminCustomTestSource.id)
        .all()
    )
    if not sources:
        return []

    configs: list[dict[str, Any]] = []
    for source in sources:
        projections = (
            db.query(AdminCustomTestVariantProjection)
            .filter(
                AdminCustomTestVariantProjection.custom_test_source_id == source.id,
                AdminCustomTestVariantProjection.is_current.is_(True),
                AdminCustomTestVariantProjection.status == "current",
            )
            .order_by(AdminCustomTestVariantProjection.id)
            .all()
        )
        variants: list[dict[str, Any]] = []
        for projection in projections:
            scale_rows = (
                db.query(AdminCustomTestVariantScaleProjection)
                .filter(AdminCustomTestVariantScaleProjection.variant_projection_id == projection.id)
                .order_by(AdminCustomTestVariantScaleProjection.scale_code)
                .all()
            )
            available_codes = [
                row.scale_code
                for row in scale_rows
                if row.availability_status in {"available", "selected"}
            ]
            selected_codes = [
                row.scale_code
                for row in scale_rows
                if row.availability_status == "selected"
            ]
            if not selected_codes:
                continue
            variants.append(
                {
                    "sub_test_json": projection.eligibility_condition_json,
                    "available_scale_codes": sorted(set(available_codes)),
                    "selected_scale_codes": sorted(set(selected_codes)),
                }
            )
        if variants:
            configs.append(
                {
                    "test_id": source.source_test_id,
                    "sub_test_variants": variants,
                }
            )
    return configs


def load_custom_test_sessions_from_restructure(
    db: Session,
    *,
    custom_test_id: int,
) -> list[dict[str, Any]]:
    sessions = (
        db.query(AdminCustomTestSession)
        .filter(AdminCustomTestSession.custom_test_id == custom_test_id)
        .order_by(AdminCustomTestSession.session_index, AdminCustomTestSession.id)
        .all()
    )
    if not sessions:
        return []

    result: list[dict[str, Any]] = []
    for session in sessions:
        source_rows = (
            db.query(AdminCustomTestSessionSource, AdminCustomTestSource)
            .join(AdminCustomTestSource, AdminCustomTestSessionSource.custom_test_source_id == AdminCustomTestSource.id)
            .filter(AdminCustomTestSessionSource.session_id == session.id)
            .order_by(AdminCustomTestSessionSource.display_order, AdminCustomTestSessionSource.id)
            .all()
        )
        try:
            guide_items = json.loads(session.guide_items_json or "[]")
        except json.JSONDecodeError:
            guide_items = []
        result.append(
            {
                "session_id": f"session_{int(session.session_index) + 1}",
                "session_index": int(session.session_index),
                "title": session.title,
                "description": session.description,
                "guide_items": guide_items if isinstance(guide_items, list) else [],
                "test_ids": [source.source_test_id for _, source in source_rows],
            }
        )
    return result


def load_custom_test_profile_fields_from_restructure(
    db: Session,
    *,
    custom_test_id: int,
) -> list[dict[str, Any]]:
    rows = (
        db.query(AdminCustomTestProfileField)
        .filter(AdminCustomTestProfileField.custom_test_id == custom_test_id)
        .order_by(AdminCustomTestProfileField.display_order, AdminCustomTestProfileField.id)
        .all()
    )
    fields: list[dict[str, Any]] = []
    for row in rows:
        try:
            options = json.loads(row.options_json or "[]")
        except json.JSONDecodeError:
            options = []
        fields.append(
            {
                "label": row.label,
                "type": row.input_type,
                "required": bool(row.required),
                "placeholder": "",
                "options": options if isinstance(options, list) else [],
            }
        )
    return fields


def backfill_custom_test_restructure_row(
    db: Session,
    *,
    custom_test: AdminCustomTest,
    test_configs: list[dict[str, Any]],
    session_configs: list[dict[str, Any]],
    additional_profile_fields: list[dict[str, Any]],
) -> None:
    selected_scale_codes_by_test_id: dict[str, list[str]] = {}
    for config in test_configs:
        test_id = str(config.get("test_id") or "").strip()
        if not test_id:
            continue
        selected_codes: list[str] = []
        for variant in config.get("sub_test_variants") or []:
            selected_codes.extend(_normalize_codes(variant.get("selected_scale_codes") or []))
        selected_scale_codes_by_test_id[test_id] = _normalize_codes(selected_codes)
    replace_custom_test_restructure_sources(
        db,
        custom_test_id=custom_test.id,
        resolved_test_configs=test_configs,
        selected_scale_codes_by_test_id=selected_scale_codes_by_test_id,
        session_configs=session_configs,
        additional_profile_fields=additional_profile_fields,
    )


def backfill_submission_snapshot_row(
    db: Session,
    *,
    submission: AdminCustomTestSubmission,
    custom_test: AdminCustomTest,
    source_test_ids: list[str],
    variant_projection_snapshot: Any,
    selected_scales_snapshot: Any,
    session_configs_snapshot: Any,
    profile_fields_snapshot: Any,
) -> SubmissionCustomTestSnapshot:
    existing = (
        db.query(SubmissionCustomTestSnapshot)
        .filter(SubmissionCustomTestSnapshot.submission_id == submission.id)
        .first()
    )
    if existing is not None:
        return existing
    snapshot = SubmissionCustomTestSnapshot(
        submission_id=submission.id,
        custom_test_id=custom_test.id,
        source_test_ids_snapshot_json=_json_dumps(source_test_ids),
        variant_projection_snapshot_json=_json_dumps(variant_projection_snapshot),
        selected_scales_snapshot_json=_json_dumps(selected_scales_snapshot),
        session_configs_snapshot_json=_json_dumps(session_configs_snapshot),
        profile_fields_snapshot_json=_json_dumps(profile_fields_snapshot),
        source_dependency_hash_snapshot="",
        snapshot_source="legacy_json_backfill",
    )
    db.add(snapshot)
    db.flush()
    return snapshot


def create_submission_custom_test_snapshot(
    db: Session,
    *,
    submission: AdminCustomTestSubmission,
    custom_test: AdminCustomTest,
    assessment_payload: dict[str, Any],
) -> SubmissionCustomTestSnapshot:
    existing = (
        db.query(SubmissionCustomTestSnapshot)
        .filter(SubmissionCustomTestSnapshot.submission_id == submission.id)
        .first()
    )
    if existing is not None:
        return existing

    profile_fields_snapshot = {
        "required_profile_fields": assessment_payload.get("required_profile_fields") or [],
        "profile_field_options": assessment_payload.get("profile_field_options") or {},
        "additional_profile_fields": assessment_payload.get("additional_profile_fields") or [],
        "profile_config": assessment_payload.get("profile_config") or {},
    }
    selected_scales_snapshot = {
        "selected_scale_codes": assessment_payload.get("selected_scale_codes") or [],
        "selected_scales": assessment_payload.get("selected_scales") or [],
    }
    snapshot = SubmissionCustomTestSnapshot(
        submission_id=submission.id,
        custom_test_id=custom_test.id,
        source_test_ids_snapshot_json=_json_dumps(assessment_payload.get("test_ids") or []),
        variant_projection_snapshot_json=_json_dumps(assessment_payload.get("selected_sub_tests") or []),
        selected_scales_snapshot_json=_json_dumps(selected_scales_snapshot),
        session_configs_snapshot_json=_json_dumps(assessment_payload.get("sessions") or []),
        profile_fields_snapshot_json=_json_dumps(profile_fields_snapshot),
        source_dependency_hash_snapshot="",
        snapshot_source="legacy_json_submission_time",
    )
    db.add(snapshot)
    db.flush()
    return snapshot
