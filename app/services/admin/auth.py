import hashlib
import os
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import AdminUser
from app.db.session import SessionLocal
from app.repositories.auth_repository import create_admin_user, get_admin_by_id, get_admin_by_username

ADMIN_SESSIONS: dict[str, int] = {}


def make_password_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def seed_default_admin() -> None:
    default_id = os.getenv("DEFAULT_ADMIN_ID", "admin")
    default_pw = os.getenv("DEFAULT_ADMIN_PW", "admin1234")
    with SessionLocal() as db:
        exists = get_admin_by_username(db, default_id)
        if exists is not None:
            return
        create_admin_user(db, username=default_id, password_hash=make_password_hash(default_pw))


def get_current_admin(db: Session, admin_session: str | None) -> AdminUser:
    if not admin_session or admin_session not in ADMIN_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 로그인이 필요합니다.",
        )

    admin_id = ADMIN_SESSIONS[admin_session]
    admin = get_admin_by_id(db, admin_id)
    if admin is None:
        ADMIN_SESSIONS.pop(admin_session, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 관리자 세션입니다.",
        )
    return admin


def admin_login(db: Session, admin_id: str, admin_pw: str) -> dict[str, str]:
    admin = get_admin_by_username(db, admin_id)
    if admin is None or admin.password_hash != make_password_hash(admin_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 ID 또는 비밀번호가 올바르지 않습니다.",
        )

    token = secrets.token_urlsafe(32)
    ADMIN_SESSIONS[token] = admin.id
    return {"token": token, "message": "로그인되었습니다.", "next_url": "/admin/workspace"}


def admin_logout(admin_session: str | None) -> dict[str, str]:
    if admin_session:
        ADMIN_SESSIONS.pop(admin_session, None)
    return {"message": "로그아웃되었습니다."}
