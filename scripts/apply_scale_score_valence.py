#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import text


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
BACKUP_DIR = ROOT / "artifacts" / "db-backups"
ALLOWED_VALENCES = {"positive", "negative", "neutral"}


SCALE_VALENCE_BY_TEST: dict[str, dict[str, str]] = {
    "GOLDEN": {
        "E": "neutral",
        "E1": "neutral",
        "E2": "neutral",
        "E3": "neutral",
        "E4": "neutral",
        "I": "neutral",
        "I1": "neutral",
        "I2": "neutral",
        "I3": "neutral",
        "I4": "neutral",
        "S": "neutral",
        "S1": "neutral",
        "S2": "neutral",
        "S3": "neutral",
        "S4": "neutral",
        "N": "neutral",
        "N1": "neutral",
        "N2": "neutral",
        "N3": "neutral",
        "N4": "neutral",
        "T": "neutral",
        "T1": "neutral",
        "T2": "neutral",
        "T3": "neutral",
        "T4": "neutral",
        "F": "neutral",
        "F1": "neutral",
        "F2": "neutral",
        "F3": "neutral",
        "F4": "neutral",
        "Z": "neutral",
        "Z1": "neutral",
        "Z2": "neutral",
        "Z3": "neutral",
        "Z4": "neutral",
        "O1": "neutral",
        "O2": "neutral",
        "O3": "neutral",
        "O4": "neutral",
        "A": "neutral",
        "A1": "neutral",
        "A2": "neutral",
        "A3": "neutral",
        "A4": "neutral",
        "Tense": "negative",
        "Tense1": "negative",
        "Tense2": "negative",
        "Calm": "positive",
        "Calm1": "positive",
        "Calm2": "positive",
        "Non": "neutral",
    },
    "K-PSI-4-SF": {
        "B01": "negative",
        "DC": "negative",
        "PCDI": "negative",
        "PD": "negative",
    },
    "PAT-2": {
        "A01": "positive",
        "A02": "positive",
        "A03": "negative",
        "A04": "negative",
        "A05": "negative",
        "A06": "positive",
        "A07": "negative",
        "A08": "negative",
    },
    "PCT": {
        "B01": "positive",
        "A01": "positive",
        "A02": "negative",
        "B02": "positive",
        "A03": "positive",
        "A04": "positive",
        "B03": "positive",
        "A05": "positive",
        "A06": "positive",
        "A07": "positive",
    },
    "PET": {
        "B01": "positive",
        "A01": "positive",
        "A02": "positive",
        "B02": "positive",
        "A03": "positive",
        "A04": "positive",
    },
    "PSES": {
        "CC": "positive",
        "DC": "positive",
        "DP": "positive",
        "EC": "positive",
        "LG": "positive",
        "PB": "positive",
        "PL": "positive",
        "SD": "positive",
        "SM": "positive",
        "TC": "positive",
    },
    "STS": {
        "AC": "neutral",
        "CA": "neutral",
        "PE": "positive",
        "NE": "negative",
        "EC": "positive",
        "SE": "positive",
    },
}


def _load_engine():
    os.environ.setdefault("APP_ENV", "local.prod")
    from app.db.session import engine

    return engine


def _set_valence(node: dict[str, Any], valence: str) -> bool:
    if valence not in ALLOWED_VALENCES:
        raise ValueError(f"invalid score_valence: {valence}")
    if node.get("score_valence") == valence:
        return False
    node["score_valence"] = valence
    return True


def apply_valence_to_struct(test_id: str, scale_struct: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    mapping = SCALE_VALENCE_BY_TEST.get(test_id, {})
    updated = json.loads(json.dumps(scale_struct, ensure_ascii=False))
    changes: list[dict[str, str]] = []

    for code, node in updated.items():
        code_text = str(code).strip()
        if not isinstance(node, dict) or not code_text:
            continue
        valence = mapping.get(code_text)
        if valence and _set_valence(node, valence):
            changes.append({"level": "scale", "code": code_text, "valence": valence})

        facets = node.get("facet_scale")
        if not isinstance(facets, dict):
            continue
        for facet_code, facet_node in facets.items():
            facet_code_text = str(facet_code).strip()
            if not isinstance(facet_node, dict) or not facet_code_text:
                continue
            facet_valence = mapping.get(facet_code_text)
            if facet_valence and _set_valence(facet_node, facet_valence):
                changes.append({"level": "facet", "code": facet_code_text, "valence": facet_valence})

    return updated, changes


def main() -> None:
    parser = argparse.ArgumentParser(description="Add score_valence metadata to RDS scale.struct.")
    parser.add_argument("--apply", action="store_true", help="Write updated struct values to the database.")
    parser.add_argument("--backup-dir", type=Path, default=BACKUP_DIR)
    args = parser.parse_args()

    engine = _load_engine()
    backup_rows: list[dict[str, Any]] = []
    changed_rows: list[dict[str, Any]] = []
    actual_codes_by_test: dict[str, set[str]] = {}

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                'SELECT "test.id" AS test_id, "condition.id" AS condition_id, struct '
                'FROM scale ORDER BY "test.id", "condition.id"'
            )
        ).fetchall()
        for row in rows:
            test_id = str(row.test_id).strip().upper()
            condition_id = str(row.condition_id).strip()
            original_struct = str(row.struct or "{}")
            try:
                scale_struct = json.loads(original_struct)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"invalid JSON: {test_id}/{condition_id}") from exc
            if not isinstance(scale_struct, dict):
                continue

            updated_struct, changes = apply_valence_to_struct(test_id, scale_struct)
            actual_codes = set()
            for code, node in scale_struct.items():
                code_text = str(code).strip()
                if code_text:
                    actual_codes.add(code_text)
                if isinstance(node, dict) and isinstance(node.get("facet_scale"), dict):
                    actual_codes.update(str(facet_code).strip() for facet_code in node["facet_scale"])
            actual_codes_by_test.setdefault(test_id, set()).update(actual_codes)

            if not changes:
                continue

            backup_rows.append(
                {
                    "test_id": test_id,
                    "condition_id": condition_id,
                    "struct": scale_struct,
                }
            )
            changed_rows.append(
                {
                    "test_id": test_id,
                    "condition_id": condition_id,
                    "change_count": len(changes),
                    "changes": changes,
                }
            )

            if args.apply:
                conn.execute(
                    text(
                        'UPDATE scale SET struct = :struct '
                        'WHERE "test.id" = :test_id AND "condition.id" = :condition_id'
                    ),
                    {
                        "struct": json.dumps(updated_struct, ensure_ascii=False, separators=(",", ":")),
                        "test_id": test_id,
                        "condition_id": condition_id,
                    },
                )

    if args.apply and backup_rows:
        args.backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = args.backup_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-scale-struct-before-score-valence.json"
        backup_path.write_text(json.dumps(backup_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        backup_path = None

    missing_codes = {
        test_id: set(mapping) - actual_codes_by_test.get(test_id, set())
        for test_id, mapping in SCALE_VALENCE_BY_TEST.items()
    }
    missing_codes = {test_id: codes for test_id, codes in missing_codes.items() if codes}

    print(
        json.dumps(
            {
                "mode": "apply" if args.apply else "dry-run",
                "changed_row_count": len(changed_rows),
                "changed_node_count": sum(row["change_count"] for row in changed_rows),
                "changed_rows": changed_rows,
                "missing_configured_codes": {key: sorted(value) for key, value in missing_codes.items()},
                "backup_path": str(backup_path) if backup_path else None,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
