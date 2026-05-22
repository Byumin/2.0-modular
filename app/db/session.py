from collections.abc import Generator
import os
from pathlib import Path

from sqlalchemy import URL
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[2]

_APP_ENV = os.environ.get("APP_ENV", "local.dev")
_ENV_FILE_MAP = {
    "local.dev":  BASE_DIR / "env.local.dev",
    "local.prod": BASE_DIR / "env.local.prod",
    "ec2.prod":   BASE_DIR / "env.ec2.prod",
}
ENV_FILE = _ENV_FILE_MAP.get(_APP_ENV, BASE_DIR / "env.local.dev")


def _load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _build_database_url() -> URL | str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    required = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            "Missing RDS database environment variables: " + ", ".join(missing)
        )

    return URL.create(
        "postgresql+psycopg",
        username=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=int(os.environ["DB_PORT"]),
        database=os.environ["DB_NAME"],
        query={"sslmode": os.getenv("DB_SSLMODE", "require")},
    )


_load_env_file()
DATABASE_URL = _build_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
