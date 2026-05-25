import hashlib
import re

import bcrypt

from app.modular_auth_repository import (
    ModularAdminUser,
    create_modular_admin_user,
    get_modular_admin_by_id,
    get_modular_admin_by_username,
    update_modular_admin_password_hash,
)

_SHA256_HEX_RE = re.compile(r"^[0-9a-f]{64}$")
# bcrypt는 72바이트를 초과하는 비밀번호를 거부하므로 안전하게 자른다.
_BCRYPT_MAX_BYTES = 72


def _truncate(raw: str) -> bytes:
    return raw.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def make_modular_password_hash(raw: str) -> str:
    return bcrypt.hashpw(_truncate(raw), bcrypt.gensalt()).decode("utf-8")


def _verify_password(raw: str, stored: str) -> tuple[bool, bool]:
    # (ok, needs_rehash). needs_rehash가 True면 호출자가 새 해시로 갱신해야 한다.
    if stored.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(_truncate(raw), stored.encode("utf-8")), False
        except (ValueError, TypeError):
            return False, False
    if _SHA256_HEX_RE.match(stored):
        legacy = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return legacy == stored, True
    return False, False


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
    ok, needs_rehash = _verify_password(admin_pw, row.password_hash)
    if not ok:
        return None
    if needs_rehash:
        new_hash = make_modular_password_hash(admin_pw)
        update_modular_admin_password_hash(row.id, new_hash)
        row.password_hash = new_hash
    return row


def get_modular_current_admin(admin_id: int) -> ModularAdminUser | None:
    return get_modular_admin_by_id(admin_id)
