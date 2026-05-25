from dataclasses import dataclass

from sqlalchemy import text

from app.db.session import engine


@dataclass(slots=True)
class ModularAdminUser:
    id: int
    username: str
    password_hash: str
    created_at: str


def _to_admin_user(row) -> ModularAdminUser | None:
    if row is None:
        return None
    mapping = row._mapping
    return ModularAdminUser(
        id=int(mapping["id"]),
        username=str(mapping["username"]),
        password_hash=str(mapping["password_hash"]),
        created_at=str(mapping["created_at"]),
    )


def get_modular_admin_by_username(username: str) -> ModularAdminUser | None:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
            SELECT id, username, password_hash, created_at
            FROM admin_user
            WHERE username = :username
            """
            ),
            {"username": username},
        ).fetchone()
    return _to_admin_user(row)


def get_modular_admin_by_id(admin_id: int) -> ModularAdminUser | None:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
            SELECT id, username, password_hash, created_at
            FROM admin_user
            WHERE id = :admin_id
            """
            ),
            {"admin_id": admin_id},
        ).fetchone()
    return _to_admin_user(row)


def modular_admin_exists() -> bool:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT 1 FROM admin_user LIMIT 1")).fetchone()
    return row is not None


def create_modular_admin_user(*, username: str, password_hash: str, created_at: str) -> ModularAdminUser:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT INTO admin_user (username, password_hash, created_at)
            VALUES (:username, :password_hash, :created_at)
            """
            ),
            {
                "username": username,
                "password_hash": password_hash,
                "created_at": created_at,
            },
        )
    row = get_modular_admin_by_username(username)
    if row is None:
        raise RuntimeError("failed to create modular admin user")
    return row


def update_modular_admin_password_hash(admin_id: int, password_hash: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE admin_user SET password_hash = :password_hash WHERE id = :admin_id"),
            {"password_hash": password_hash, "admin_id": admin_id},
        )
