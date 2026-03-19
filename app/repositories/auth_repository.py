from sqlalchemy.orm import Session

from app.db.models import AdminUser


def get_admin_by_username(db: Session, username: str) -> AdminUser | None:
    return db.query(AdminUser).filter(AdminUser.username == username).first()


def get_admin_by_id(db: Session, admin_id: int) -> AdminUser | None:
    return db.query(AdminUser).filter(AdminUser.id == admin_id).first()


def create_admin_user(db: Session, username: str, password_hash: str) -> AdminUser:
    row = AdminUser(username=username, password_hash=password_hash)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
