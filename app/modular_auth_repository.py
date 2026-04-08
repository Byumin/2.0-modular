import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULAR_DB_PATH = ROOT / "modular.db"


@dataclass(slots=True)
class ModularAdminUser:
    id: int
    username: str
    password_hash: str
    created_at: str


def connect_modular_db() -> sqlite3.Connection:
    conn = sqlite3.connect(MODULAR_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _to_admin_user(row: sqlite3.Row | None) -> ModularAdminUser | None:
    if row is None:
        return None
    return ModularAdminUser(
        id=int(row["id"]),
        username=str(row["username"]),
        password_hash=str(row["password_hash"]),
        created_at=str(row["created_at"]),
    )


def get_modular_admin_by_username(username: str) -> ModularAdminUser | None:
    with connect_modular_db() as conn:
        row = conn.execute(
            """
            SELECT id, username, password_hash, created_at
            FROM admin_user
            WHERE username = ?
            """,
            (username,),
        ).fetchone()
    return _to_admin_user(row)


def get_modular_admin_by_id(admin_id: int) -> ModularAdminUser | None:
    with connect_modular_db() as conn:
        row = conn.execute(
            """
            SELECT id, username, password_hash, created_at
            FROM admin_user
            WHERE id = ?
            """,
            (admin_id,),
        ).fetchone()
    return _to_admin_user(row)


def create_modular_admin_user(*, username: str, password_hash: str, created_at: str) -> ModularAdminUser:
    with connect_modular_db() as conn:
        conn.execute(
            """
            INSERT INTO admin_user (username, password_hash, created_at)
            VALUES (?, ?, ?)
            """,
            (username, password_hash, created_at),
        )
        conn.commit()
    row = get_modular_admin_by_username(username)
    if row is None:
        raise RuntimeError("failed to create modular admin user")
    return row
