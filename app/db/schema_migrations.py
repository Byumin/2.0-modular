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


def ensure_submission_scoring_result_table() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "submission_scoring_result" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE submission_scoring_result (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    admin_custom_test_id INTEGER NOT NULL,
                    client_id INTEGER,
                    submission_id INTEGER NOT NULL,
                    scoring_status VARCHAR(40) NOT NULL DEFAULT 'scored',
                    result_json TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_submission_scoring_result_admin_user_id
            ON submission_scoring_result (admin_user_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_submission_scoring_result_admin_custom_test_id
            ON submission_scoring_result (admin_custom_test_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_submission_scoring_result_client_id
            ON submission_scoring_result (client_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_submission_scoring_result_submission_id
            ON submission_scoring_result (submission_id)
            """
        )
