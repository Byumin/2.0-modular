from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT / "modular.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a SQLite DB using SQLAlchemy models (local.dev용).",
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

    import os
    os.environ.setdefault("APP_ENV", "local.dev")
    # DATABASE_URL을 직접 지정해 session.py의 env 파일 로드보다 우선 적용
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    from sqlalchemy import create_engine
    from app.db.models import Base  # noqa: F401 — 모든 모델 임포트

    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)

    print(db_path)


if __name__ == "__main__":
    main()
