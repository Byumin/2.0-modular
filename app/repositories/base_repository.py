from typing import Any

from sqlalchemy.orm import Session


def delete_row(db: Session, row: Any) -> None:
    db.delete(row)


def commit(db: Session) -> None:
    db.commit()


def refresh(db: Session, row: Any) -> None:
    db.refresh(row)
