import os

from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AdminLoginIn
from app.services.admin.auth import admin_login, admin_logout, get_current_admin

router = APIRouter()

# HTTPS가 적용된 환경(local.prod, ec2.prod)에서만 secure 쿠키를 전송한다.
_SECURE_COOKIE = os.environ.get("APP_ENV", "local.dev") != "local.dev"


@router.post("/api/admin/login")
def login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> JSONResponse:
    result = admin_login(db, payload.admin_id, payload.admin_pw)
    response = JSONResponse({"message": result["message"], "next_url": result["next_url"]})
    response.set_cookie(
        key="admin_session",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=_SECURE_COOKIE,
        max_age=60 * 60 * 8,
    )
    return response


@router.post("/api/admin/logout")
def logout(admin_session: str | None = Cookie(default=None)) -> Response:
    result = admin_logout(admin_session)
    response = JSONResponse(result)
    response.delete_cookie("admin_session")
    return response


@router.get("/api/admin/me")
def me(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    current_admin = get_current_admin(db, admin_session)
    return {"id": current_admin.id, "username": current_admin.username}
