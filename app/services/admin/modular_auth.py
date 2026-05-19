import hashlib

from app.modular_auth_repository import (
    ModularAdminUser,
    create_modular_admin_user,
    get_modular_admin_by_id,
    get_modular_admin_by_username,
)


def make_modular_password_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def ensure_default_modular_admin(admin_id: str, admin_pw: str) -> ModularAdminUser:
    row = get_modular_admin_by_username(admin_id)
    if row is not None:
        return row
    from datetime import datetime

    return create_modular_admin_user(
        username=admin_id,
        password_hash=make_modular_password_hash(admin_pw),
        created_at=datetime.utcnow().isoformat(sep=" ", timespec="seconds"),
    )


def verify_modular_admin_login(admin_id: str, admin_pw: str) -> ModularAdminUser | None:
    row = get_modular_admin_by_username(admin_id)
    if row is None:
        return None
    if row.password_hash != make_modular_password_hash(admin_pw):
        return None
    return row


def get_modular_current_admin(admin_id: int) -> ModularAdminUser | None:
    return get_modular_admin_by_id(admin_id)
