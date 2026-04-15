from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import AdminClientGroup, AdminClientGroupMember


def list_groups_by_admin(db: Session, *, admin_user_id: int) -> list[AdminClientGroup]:
    return (
        db.query(AdminClientGroup)
        .filter(AdminClientGroup.admin_user_id == admin_user_id)
        .order_by(AdminClientGroup.name)
        .all()
    )


def get_group_by_id(db: Session, *, group_id: int, admin_user_id: int) -> AdminClientGroup | None:
    return (
        db.query(AdminClientGroup)
        .filter(AdminClientGroup.id == group_id, AdminClientGroup.admin_user_id == admin_user_id)
        .first()
    )


def create_group(db: Session, *, admin_user_id: int, name: str, color: str) -> AdminClientGroup:
    row = AdminClientGroup(admin_user_id=admin_user_id, name=name, color=color)
    db.add(row)
    return row


def delete_group(db: Session, group: AdminClientGroup) -> None:
    db.query(AdminClientGroupMember).filter(AdminClientGroupMember.group_id == group.id).delete()
    db.delete(group)


def add_client_to_group(db: Session, *, group_id: int, client_id: int) -> AdminClientGroupMember:
    existing = (
        db.query(AdminClientGroupMember)
        .filter(AdminClientGroupMember.group_id == group_id, AdminClientGroupMember.client_id == client_id)
        .first()
    )
    if existing:
        return existing
    row = AdminClientGroupMember(group_id=group_id, client_id=client_id)
    db.add(row)
    return row


def remove_client_from_group(db: Session, *, group_id: int, client_id: int) -> bool:
    deleted = (
        db.query(AdminClientGroupMember)
        .filter(AdminClientGroupMember.group_id == group_id, AdminClientGroupMember.client_id == client_id)
        .delete()
    )
    return deleted > 0


def get_groups_for_client(db: Session, *, client_id: int) -> list[AdminClientGroup]:
    return (
        db.query(AdminClientGroup)
        .join(AdminClientGroupMember, AdminClientGroup.id == AdminClientGroupMember.group_id)
        .filter(AdminClientGroupMember.client_id == client_id)
        .order_by(AdminClientGroup.name)
        .all()
    )


def get_client_ids_in_group(db: Session, *, group_id: int) -> list[int]:
    rows = (
        db.query(AdminClientGroupMember.client_id)
        .filter(AdminClientGroupMember.group_id == group_id)
        .all()
    )
    return [r[0] for r in rows]
