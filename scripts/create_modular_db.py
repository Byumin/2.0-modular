from __future__ import annotations

import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "docs" / "modular_schema.sql"
DB_PATH = ROOT / "docs" / "modular.db"


def main() -> None:
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

    print(DB_PATH)


if __name__ == "__main__":
    main()
