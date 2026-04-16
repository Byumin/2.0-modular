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


def ensure_child_test_client_intake_mode_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "client_intake_mode" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN client_intake_mode VARCHAR(40) NOT NULL DEFAULT 'pre_registered_only'
                """
            )
        conn.exec_driver_sql(
            """
            UPDATE child_test
            SET client_intake_mode = 'pre_registered_only'
            WHERE client_intake_mode IS NULL OR TRIM(client_intake_mode) = ''
            """
        )


def ensure_admin_client_created_source_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_client")}
    with engine.begin() as conn:
        if "created_source" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_client
                ADD COLUMN created_source VARCHAR(40) NOT NULL DEFAULT 'admin_manual'
                """
            )
        conn.exec_driver_sql(
            """
            UPDATE admin_client
            SET created_source = 'admin_manual'
            WHERE created_source IS NULL OR TRIM(created_source) = ''
            """
        )


def ensure_admin_client_assignment_unique_index() -> None:
    with engine.begin() as conn:
        conn.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_client_assignment_triplet
            ON admin_client_assignment (admin_user_id, admin_client_id, admin_custom_test_id)
            """
        )


def ensure_admin_client_birth_day_not_null() -> None:
    """기존 NULL birth_day를 채우고 신규 DB에서는 NOT NULL로 생성되도록 보장한다."""
    with engine.begin() as conn:
        conn.exec_driver_sql(
            """
            UPDATE admin_client SET birth_day = '1900-01-01' WHERE birth_day IS NULL
            """
        )


def ensure_admin_client_extended_fields() -> None:
    """admin_client 테이블에 phone, address, is_closed, tags_json 컬럼 추가."""
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_client")}
    with engine.begin() as conn:
        if "phone" not in columns:
            conn.exec_driver_sql("ALTER TABLE admin_client ADD COLUMN phone VARCHAR(30)")
        if "address" not in columns:
            conn.exec_driver_sql("ALTER TABLE admin_client ADD COLUMN address VARCHAR(200)")
        if "is_closed" not in columns:
            conn.exec_driver_sql(
                "ALTER TABLE admin_client ADD COLUMN is_closed INTEGER NOT NULL DEFAULT 0"
            )
        if "tags_json" not in columns:
            conn.exec_driver_sql(
                "ALTER TABLE admin_client ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'"
            )


def ensure_admin_client_group_tables() -> None:
    """admin_client_group, admin_client_group_member 테이블 생성."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_client_group" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_client_group (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_client_group_admin_user_id
            ON admin_client_group (admin_user_id)
            """
        )
        if "admin_client_group_member" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_client_group_member (
                    id INTEGER PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    client_id INTEGER NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (group_id, client_id)
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_client_group_member_client_id
            ON admin_client_group_member (client_id)
            """
        )


def ensure_admin_client_report_table() -> None:
    """admin_client_report 테이블 생성."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_client_report" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_client_report (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    client_id INTEGER NOT NULL,
                    sections_json TEXT NOT NULL DEFAULT '[]',
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_client_report_client_id
            ON admin_client_report (client_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_client_report_client
            ON admin_client_report (admin_user_id, client_id)
            """
        )


def ensure_admin_client_identity_review_table() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_client_identity_review" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_client_identity_review (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    admin_custom_test_id INTEGER NOT NULL,
                    submission_id INTEGER,
                    access_token VARCHAR(120) NOT NULL DEFAULT '',
                    input_profile_json TEXT NOT NULL DEFAULT '{}',
                    candidate_client_ids_json TEXT NOT NULL DEFAULT '[]',
                    responder_choice VARCHAR(20) NOT NULL,
                    chosen_client_id INTEGER,
                    provisional_client_id INTEGER,
                    review_status VARCHAR(30) NOT NULL DEFAULT 'pending',
                    reviewed_by INTEGER,
                    reviewed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_client_identity_review_admin_user_id
            ON admin_client_identity_review (admin_user_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_client_identity_review_review_status
            ON admin_client_identity_review (review_status)
            """
        )


def ensure_child_test_requires_consent_column() -> None:
    """child_test 테이블에 requires_consent 컬럼 추가."""
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "requires_consent" not in columns:
            conn.exec_driver_sql(
                "ALTER TABLE child_test ADD COLUMN requires_consent INTEGER NOT NULL DEFAULT 0"
            )


def ensure_admin_settings_table() -> None:
    """admin_settings 테이블 생성."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_settings" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_settings (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL UNIQUE,
                    consent_text TEXT NOT NULL DEFAULT '',
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ix_admin_settings_admin_user_id
            ON admin_settings (admin_user_id)
            """
        )


def ensure_client_consent_record_table() -> None:
    """client_consent_record 테이블 생성."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "client_consent_record" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE client_consent_record (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    admin_client_id INTEGER NOT NULL,
                    admin_custom_test_id INTEGER NOT NULL,
                    consented INTEGER NOT NULL,
                    consented_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_client_consent_record_admin_user_id
            ON client_consent_record (admin_user_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_client_consent_record_admin_client_id
            ON client_consent_record (admin_client_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_client_consent_record_admin_custom_test_id
            ON client_consent_record (admin_custom_test_id)
            """
        )
