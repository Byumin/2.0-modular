from __future__ import annotations

from sqlalchemy import inspect

from app.db.session import engine


def ensure_submission_client_id_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_custom_test_submission")}
    with engine.begin() as conn:
        if "client_id" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_custom_test_submission
                ADD COLUMN client_id INTEGER
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_custom_test_submission_client_id
            ON admin_custom_test_submission (client_id)
            """
        )
