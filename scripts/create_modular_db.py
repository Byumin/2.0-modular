from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "docs" / "modular_schema.sql"
DEFAULT_DB_PATH = ROOT / "modular.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a SQLite DB from docs/modular_schema.sql.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="output SQLite file path (default: ./modular.db)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite the target file if it already exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    db_path = args.output.resolve()
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    if db_path.exists():
        if not args.force:
            print(
                f"Refusing to overwrite existing DB: {db_path}. "
                "Use --force only when you intentionally want to recreate it.",
                file=sys.stderr,
            )
            raise SystemExit(1)
        db_path.unlink()

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

    print(db_path)


if __name__ == "__main__":
    main()
