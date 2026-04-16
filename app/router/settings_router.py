from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.settings import ConsentTextIn, ConsentTextOut
from app.services.admin.settings import get_consent_text, update_consent_text

router = APIRouter()


@router.get("/api/admin/settings/consent", response_model=ConsentTextOut)
def get_consent(
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return get_consent_text(db, admin_session)


@router.put("/api/admin/settings/consent")
def update_consent(
    payload: ConsentTextIn,
    db: Session = Depends(get_db),
    admin_session: str | None = Cookie(default=None),
) -> dict:
    return update_consent_text(db, admin_session, payload.consent_text)
