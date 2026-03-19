from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AdminLoginIn
from app.services.admin.auth import admin_login, admin_logout, get_current_admin

router = APIRouter()


@router.post("/api/admin/login")
def login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> JSONResponse:
    result = admin_login(db, payload.admin_id, payload.admin_pw)
    response = JSONResponse({"message": result["message"], "next_url": result["next_url"]})
    response.set_cookie(
        key="admin_session",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=False,
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
