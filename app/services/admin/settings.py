from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import AdminSettings
from app.services.admin.auth import get_current_admin


def get_consent_text(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    row = db.query(AdminSettings).filter(AdminSettings.admin_user_id == admin.id).first()
    return {"consent_text": row.consent_text if row else ""}


def update_consent_text(db: Session, admin_session: str | None, consent_text: str) -> dict:
    admin = get_current_admin(db, admin_session)
    row = db.query(AdminSettings).filter(AdminSettings.admin_user_id == admin.id).first()
    if row is None:
        row = AdminSettings(admin_user_id=admin.id, consent_text=consent_text, updated_at=datetime.utcnow())
        db.add(row)
    else:
        row.consent_text = consent_text
        row.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "동의서 내용이 저장되었습니다."}


def get_security_notice_text(db: Session, admin_session: str | None) -> dict:
    admin = get_current_admin(db, admin_session)
    row = db.query(AdminSettings).filter(AdminSettings.admin_user_id == admin.id).first()
    return {"security_notice_text": row.security_notice_text if row else ""}


def update_security_notice_text(db: Session, admin_session: str | None, security_notice_text: str) -> dict:
    admin = get_current_admin(db, admin_session)
    row = db.query(AdminSettings).filter(AdminSettings.admin_user_id == admin.id).first()
    if row is None:
        row = AdminSettings(
            admin_user_id=admin.id,
            consent_text="",
            security_notice_text=security_notice_text,
            updated_at=datetime.utcnow(),
        )
        db.add(row)
    else:
        row.security_notice_text = security_notice_text
        row.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "보안관리 안내 문구가 저장되었습니다."}
