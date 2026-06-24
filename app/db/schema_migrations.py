from __future__ import annotations

import json
import secrets

from sqlalchemy import inspect, text

from app.db.session import engine


def ensure_postgresql_boolean_columns() -> None:
    if engine.dialect.name != "postgresql":
        return

    def column_type(conn, table_name: str, column_name: str) -> str | None:
        return conn.execute(
            text(
                """
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                  AND column_name = :column_name
                """
            ),
            {"table_name": table_name, "column_name": column_name},
        ).scalar_one_or_none()

    with engine.begin() as conn:
        if column_type(conn, "admin_client", "is_closed") != "boolean":
            conn.exec_driver_sql("ALTER TABLE admin_client ALTER COLUMN is_closed DROP DEFAULT")
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_client
                ALTER COLUMN is_closed TYPE BOOLEAN
                USING CASE
                    WHEN is_closed IS NULL THEN FALSE
                    WHEN is_closed::text IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
                    ELSE FALSE
                END
                """
            )
        conn.exec_driver_sql("ALTER TABLE admin_client ALTER COLUMN is_closed SET DEFAULT FALSE")

        if column_type(conn, "child_test", "requires_consent") != "boolean":
            conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN requires_consent DROP DEFAULT")
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ALTER COLUMN requires_consent TYPE BOOLEAN
                USING CASE
                    WHEN requires_consent IS NULL THEN FALSE
                    WHEN requires_consent::text IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
                    ELSE FALSE
                END
                """
            )
        conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN requires_consent SET DEFAULT FALSE")

        show_research_notice_type = column_type(conn, "child_test", "show_research_notice")
        if show_research_notice_type is not None and show_research_notice_type != "boolean":
            conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN show_research_notice DROP DEFAULT")
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ALTER COLUMN show_research_notice TYPE BOOLEAN
                USING CASE
                    WHEN show_research_notice IS NULL THEN TRUE
                    WHEN show_research_notice::text IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
                    ELSE FALSE
                END
                """
            )
        if show_research_notice_type is not None:
            conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN show_research_notice SET DEFAULT TRUE")

        is_deleted_type = column_type(conn, "child_test", "is_deleted")
        if is_deleted_type is not None and is_deleted_type != "boolean":
            conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN is_deleted DROP DEFAULT")
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ALTER COLUMN is_deleted TYPE BOOLEAN
                USING CASE
                    WHEN is_deleted IS NULL THEN FALSE
                    WHEN is_deleted::text IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
                    ELSE FALSE
                END
                """
            )
        if is_deleted_type is not None:
            conn.exec_driver_sql("ALTER TABLE child_test ALTER COLUMN is_deleted SET DEFAULT FALSE")


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


def ensure_child_test_session_configs_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "session_configs_json" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN session_configs_json TEXT NOT NULL DEFAULT '[]'
                """
            )
        rows = conn.exec_driver_sql(
            """
            SELECT id, selected_scales_json, session_configs_json
            FROM child_test
            WHERE session_configs_json IS NULL
               OR TRIM(session_configs_json) = ''
               OR TRIM(session_configs_json) = '[]'
            """
        ).fetchall()
        for row_id, selected_scales_json, session_configs_json in rows:
            try:
                existing_sessions = json.loads(session_configs_json or "[]")
            except (TypeError, json.JSONDecodeError):
                existing_sessions = []
            if isinstance(existing_sessions, list) and existing_sessions:
                continue
            try:
                selected = json.loads(selected_scales_json or "{}")
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(selected, dict):
                continue
            sessions = selected.get("__sessions")
            if not isinstance(sessions, list) or not sessions:
                continue
            conn.execute(
                text(
                    """
                    UPDATE child_test
                    SET session_configs_json = :session_configs_json
                    WHERE id = :row_id
                    """
                ),
                {
                    "row_id": row_id,
                    "session_configs_json": json.dumps(sessions, ensure_ascii=False),
                },
            )
        rows = conn.execute(
            text(
                """
                SELECT id, selected_scales_json, session_configs_json
                FROM child_test
                WHERE selected_scales_json LIKE :pattern
                """
            ),
            {"pattern": "%__sessions%"},
        ).fetchall()
        for row_id, selected_scales_json, session_configs_json in rows:
            try:
                session_configs = json.loads(session_configs_json or "[]")
                selected = json.loads(selected_scales_json or "{}")
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(session_configs, list) or not session_configs:
                continue
            if not isinstance(selected, dict) or "__sessions" not in selected:
                continue
            selected.pop("__sessions", None)
            conn.execute(
                text(
                    """
                    UPDATE child_test
                    SET selected_scales_json = :selected_scales_json
                    WHERE id = :row_id
                    """
                ),
                {
                    "row_id": row_id,
                    "selected_scales_json": json.dumps(selected, ensure_ascii=False),
                },
            )


def ensure_child_test_soft_delete_columns() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "is_deleted" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        if "deleted_at" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN deleted_at TIMESTAMP
                """
            )
        conn.exec_driver_sql(
            """
            UPDATE child_test
            SET is_deleted = FALSE
            WHERE is_deleted IS NULL
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_child_test_is_deleted
            ON child_test (is_deleted)
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


def ensure_child_test_show_research_notice_column() -> None:
    """child_test 테이블에 show_research_notice 컬럼 추가."""
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "show_research_notice" not in columns:
            column_type = "BOOLEAN NOT NULL DEFAULT TRUE" if engine.dialect.name == "postgresql" else "INTEGER NOT NULL DEFAULT 1"
            conn.exec_driver_sql(f"ALTER TABLE child_test ADD COLUMN show_research_notice {column_type}")


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


def ensure_admin_assessment_draft_table() -> None:
    """수검자 검사 진행 중 서버 임시저장 테이블 생성."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_assessment_draft" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_assessment_draft (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    admin_custom_test_id INTEGER NOT NULL,
                    admin_client_id INTEGER NOT NULL,
                    access_token VARCHAR(120) NOT NULL,
                    profile_json TEXT NOT NULL DEFAULT '{}',
                    answers_json TEXT NOT NULL DEFAULT '{}',
                    current_part_index INTEGER NOT NULL DEFAULT 0,
                    current_page INTEGER NOT NULL DEFAULT 0,
                    is_ambiguous_match INTEGER NOT NULL DEFAULT 0,
                    responder_choice VARCHAR(20),
                    candidate_client_ids_json TEXT NOT NULL DEFAULT '[]',
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (admin_user_id, admin_custom_test_id, admin_client_id)
                )
                """
            )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_assessment_draft_admin_user_id
            ON admin_assessment_draft (admin_user_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_assessment_draft_admin_custom_test_id
            ON admin_assessment_draft (admin_custom_test_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_assessment_draft_admin_client_id
            ON admin_assessment_draft (admin_client_id)
            """
        )
        conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS ix_admin_assessment_draft_access_token
            ON admin_assessment_draft (access_token)
            """
        )


_REGIONS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시",
    "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원특별자치도", "충청북도", "충청남도",
    "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
]
_EDUCATION_OPTIONS = [
    "무학", "초등학교 졸업", "중학교 졸업", "고등학교 졸업",
    "전문대학 졸업", "4년제 대학 또는 그 이상 졸업", "해당 없음",
]

_CONDITION_PROFILE_MAP_SEED: dict[str, dict] = {
    "K-PSI-4-SF": {
        "age_range": {"type": "age_range", "profile_field": "parent_birth_day", "as_of_field": "exam_date"},
        "gender": {"type": "enum", "profile_field": "parent_gender"},
    },
    "PAT-2": {
        "age_range": {"type": "age_range", "profile_field": "child_birth_day", "as_of_field": "exam_date"},
        "gender": {"type": "enum", "profile_field": "child_gender"},
        "informant": {"type": "enum", "profile_field": "informant"},
    },
    "PCT": {
        "age_range": {"type": "age_range", "profile_field": "child_birth_day", "as_of_field": "exam_date"},
        "gender": {"type": "enum", "profile_field": "child_gender"},
    },
    "PSES": {
        "age_range": {"type": "age_range", "profile_field": "parent_birth_day", "as_of_field": "exam_date"},
        "gender": {"type": "enum", "profile_field": "parent_gender"},
    },
    "GOLDEN": {
        "age_range": {"type": "age_range", "profile_field": "birth_day", "as_of_field": "exam_date"},
        "school_age_range": {"type": "school_age_index_range", "profile_field": "school_age_range"},
        "gender": {"type": "enum", "profile_field": "gender"},
    },
}


def _profile_seed_payload(test_id: str, config: dict) -> dict:
    payload = dict(config)
    condition_profile_map = _CONDITION_PROFILE_MAP_SEED.get(test_id)
    if condition_profile_map:
        payload["condition_profile_map"] = condition_profile_map
    return payload


_ESSENTIAL_SEED: dict[str, dict] = {
    "PAT-2": {
        "sections": [
            {
                "subject_type": "parent",
                "section_hint": "부모/양육자 정보를 입력해주세요",
                "fields": {
                    "name":      {"label": "부모 이름",  "required": True},
                    "informant": {"label": "관계",       "required": True, "type": "radio", "options": ["mother", "father", "etc"]},
                },
            },
            {
                "subject_type": "child",
                "section_hint": "자녀 정보를 입력해주세요",
                "fields": {
                    "name":       {"label": "자녀 이름",    "required": True},
                    "birth_day":  {"label": "자녀 생년월일", "required": True, "type": "date"},
                    "gender":     {"label": "자녀 성별",    "required": True, "type": "radio"},
                    "region":     {"label": "자녀 거주지역", "required": True, "type": "select", "options": _REGIONS},
                    "school_age_range": {"label": "소속/학년",    "required": True, "type": "select"},
                },
            },
        ],
    },
    "PCT": {
        "subject_type": "child",
        "section_hint": "자녀에 대한 정보를 입력해주세요",
        "fields": {
            "name":      {"label": "자녀 이름",    "required": True},
            "gender":    {"label": "자녀 성별",    "required": True, "type": "radio"},
            "birth_day": {"label": "자녀 생년월일", "required": True, "type": "date"},
            "region":    {"label": "자녀 거주지역", "required": True, "type": "select", "options": _REGIONS},
        },
    },
    "K-PSI-4-SF": {
        "sections": [
            {
                "subject_type": "parent",
                "section_hint": "부모/양육자 정보를 입력해주세요",
                "fields": {
                    "name":           {"label": "부모 이름",     "required": True},
                    "gender":         {"label": "부모 성별",     "required": True, "type": "radio"},
                    "birth_day":      {"label": "부모 생년월일",  "required": True, "type": "date"},
                    "region":         {"label": "부모 거주 지역", "required": True, "type": "select", "options": _REGIONS},
                    "marital_status": {"label": "부모 결혼 상태", "required": True, "type": "radio", "options": ["기혼", "미혼", "이혼", "별거", "기타"]},
                    "informant":      {"label": "자녀와의 관계",  "required": True, "type": "radio", "options": ["부", "모", "기타"]},
                },
            },
            {
                "subject_type": "child",
                "section_hint": "자녀 정보를 입력해주세요",
                "fields": {
                    "name":      {"label": "자녀 이름",    "required": True},
                    "gender":    {"label": "자녀 성별",    "required": True, "type": "radio"},
                    "birth_day": {"label": "자녀 생년월일", "required": True, "type": "date"},
                },
            },
        ],
    },
    "PSES": {
        "subject_type": "parent",
        "section_hint": "부모/양육자 정보를 입력해주세요",
        "fields": {
            "name":      {"label": "부모 이름",    "required": True},
            "gender":    {"label": "부모 성별",    "required": True, "type": "radio"},
            "birth_day": {"label": "부모 생년월일", "required": True, "type": "date"},
        },
    },
    "PET":    {"subject_type": "self"},
    "GOLDEN": {"subject_type": "self"},
    "STS":    {"subject_type": "self"},
}


def ensure_test_profile_config_table() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "test_profile_config" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE test_profile_config (
                    test_id                TEXT PRIMARY KEY REFERENCES test(id),
                    essential_profile_json TEXT NOT NULL DEFAULT '{}',
                    optional_profile_json  TEXT NOT NULL DEFAULT '{}'
                )
                """
            )
            _optional_seed: dict[str, dict] = {
                "PAT-2": {
                    "fields": {
                        "caregiver_type": {"label": "양육 구분", "options": ["주 양육자", "기타 양육자"]},
                    }
                },
                "PCT": {
                    "fields": {
                        "developmental_issues": {"label": "아동의 발달문제",   "type": "long_text"},
                        "contact":              {"label": "연락처 및 이메일", "type": "text"},
                        "author_name":          {"label": "작성자 이름",       "type": "text"},
                        "child_relationship":   {"label": "아동과의 관계",     "type": "text"},
                        "father_age":           {"label": "부 연령",           "type": "number"},
                        "father_education":     {"label": "부 학력", "type": "text", "options": ["무학", "초등학교 졸업", "중학교 졸업", "고등학교 졸업", "전문대학 졸업", "4년제 대학 또는 그 이상 졸업", "해당 없음"]},
                        "father_occupation":    {"label": "부 직업",           "type": "text"},
                        "mother_age":           {"label": "모 연령",           "type": "number"},
                        "mother_education":     {"label": "모 학력", "type": "text", "options": ["무학", "초등학교 졸업", "중학교 졸업", "고등학교 졸업", "전문대학 졸업", "4년제 대학 또는 그 이상 졸업", "해당 없음"]},
                        "mother_occupation":    {"label": "모 직업",           "type": "text"},
                    }
                },
            }
            seed_rows = [
                (
                    tid,
                    json.dumps(_profile_seed_payload(tid, cfg), ensure_ascii=False),
                    json.dumps(_optional_seed.get(tid, {}), ensure_ascii=False),
                )
                for tid, cfg in _ESSENTIAL_SEED.items()
            ]
            conn.execute(
                text(
                    """
                    INSERT INTO test_profile_config
                        (test_id, essential_profile_json, optional_profile_json)
                    VALUES
                        (:test_id, :essential_profile_json, :optional_profile_json)
                    ON CONFLICT (test_id) DO NOTHING
                    """
                ),
                [
                    {
                        "test_id": test_id,
                        "essential_profile_json": essential_profile_json,
                        "optional_profile_json": optional_profile_json,
                    }
                    for test_id, essential_profile_json, optional_profile_json in seed_rows
                ],
            )


def ensure_test_profile_condition_profile_maps() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "test_profile_config" not in tables:
        return
    columns = {col["name"] for col in inspector.get_columns("test_profile_config")}
    if "essential_profile_json" not in columns:
        return

    test_ids = list(_CONDITION_PROFILE_MAP_SEED.keys())
    placeholders = ",".join(f":id{i}" for i in range(len(test_ids)))
    params = {f"id{i}": test_id for i, test_id in enumerate(test_ids)}
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                f"""
                SELECT test_id, essential_profile_json
                FROM test_profile_config
                WHERE test_id IN ({placeholders})
                """
            ),
            params,
        ).fetchall()
        for test_id, raw_config in rows:
            try:
                config = json.loads(raw_config or "{}")
            except json.JSONDecodeError:
                config = {}
            if not isinstance(config, dict):
                config = {}
            desired = _CONDITION_PROFILE_MAP_SEED.get(str(test_id), {})
            if not desired or config.get("condition_profile_map") == desired:
                continue
            config["condition_profile_map"] = desired
            conn.execute(
                text(
                    """
                    UPDATE test_profile_config
                    SET essential_profile_json = :essential_profile_json
                    WHERE test_id = :test_id
                    """
                ),
                {
                    "test_id": test_id,
                    "essential_profile_json": json.dumps(config, ensure_ascii=False),
                },
            )


def ensure_test_profile_config_restructure() -> None:
    """config_json 단일 컬럼 → essential_profile_json / optional_profile_json 두 컬럼으로 마이그레이션."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "test_profile_config" not in tables:
        return
    columns = {col["name"] for col in inspector.get_columns("test_profile_config")}
    if "essential_profile_json" in columns:
        return  # 이미 마이그레이션 완료

    with engine.begin() as conn:
        existing = conn.exec_driver_sql(
            "SELECT test_id, config_json FROM test_profile_config"
        ).fetchall()
        conn.exec_driver_sql("DROP TABLE test_profile_config")
        conn.exec_driver_sql(
            """
            CREATE TABLE test_profile_config (
                test_id                TEXT PRIMARY KEY REFERENCES test(id),
                essential_profile_json TEXT NOT NULL DEFAULT '{}',
                optional_profile_json  TEXT NOT NULL DEFAULT '{}'
            )
            """
        )
        migrated = [(row[0], row[1] or "{}", "{}") for row in existing]
        if migrated:
            conn.execute(
                text(
                    """
                    INSERT INTO test_profile_config
                        (test_id, essential_profile_json, optional_profile_json)
                    VALUES
                        (:test_id, :essential_profile_json, :optional_profile_json)
                    """
                ),
                [
                    {
                        "test_id": test_id,
                        "essential_profile_json": essential_profile_json,
                        "optional_profile_json": optional_profile_json,
                    }
                    for test_id, essential_profile_json, optional_profile_json in migrated
                ],
            )


def rotate_shared_submission_access_tokens() -> None:
    """기존 검사 링크 토큰을 공유하던 제출 결과 토큰을 제출별 토큰으로 회전한다."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "admin_custom_test_submission" not in tables or "admin_custom_test_access_link" not in tables:
        return

    with engine.begin() as conn:
        link_tokens = {
            row[0]
            for row in conn.exec_driver_sql(
                "SELECT access_token FROM admin_custom_test_access_link WHERE access_token IS NOT NULL"
            )
            if row[0]
        }
        if not link_tokens:
            return

        existing_tokens = {
            row[0]
            for row in conn.exec_driver_sql(
                "SELECT access_token FROM admin_custom_test_submission WHERE access_token IS NOT NULL"
            )
            if row[0]
        }
        rows = conn.exec_driver_sql(
            "SELECT id, access_token FROM admin_custom_test_submission"
        ).fetchall()
        for submission_id, token in rows:
            if token not in link_tokens:
                continue
            new_token = secrets.token_urlsafe(32)
            while new_token in existing_tokens:
                new_token = secrets.token_urlsafe(32)
            existing_tokens.add(new_token)
            conn.execute(
                text(
                    """
                    UPDATE admin_custom_test_submission
                    SET access_token = :new_token
                    WHERE id = :submission_id
                    """
                ),
                {"new_token": new_token, "submission_id": submission_id},
            )


def migrate_child_test_sub_test_json_to_structured() -> None:
    """child_test.sub_test_json을 {test_id: [condition, ...]} 구조로 마이그레이션."""
    from app.repositories.parent_test_repository import fetch_parent_scale_rows_by_test

    def collect_scale_codes(scale_struct: object) -> set[str]:
        if isinstance(scale_struct, str):
            try:
                scale_struct = json.loads(scale_struct)
            except (TypeError, json.JSONDecodeError):
                return set()
        if not isinstance(scale_struct, dict):
            return set()

        codes: set[str] = set()

        def visit(raw: object) -> None:
            if not isinstance(raw, dict):
                return
            facet_scale = raw.get("facet_scale")
            if isinstance(facet_scale, dict):
                for child_code, child_value in facet_scale.items():
                    code_text = str(child_code).strip()
                    if code_text:
                        codes.add(code_text)
                    visit(child_value)

        for code, value in scale_struct.items():
            code_text = str(code).strip()
            if code_text:
                codes.add(code_text)
            visit(value)
        return codes

    def selected_codes_from_variants(variants: object) -> set[str]:
        codes: set[str] = set()
        if not isinstance(variants, list):
            return codes
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            variable = variant.get("variable")
            if isinstance(variable, dict):
                raw_codes = variable.get("selected_scale_codes")
            else:
                raw_codes = variant.get("selected_scale_codes")
            if not isinstance(raw_codes, list):
                continue
            codes.update(str(code).strip() for code in raw_codes if str(code).strip())
        return codes

    with engine.begin() as conn:
        rows = conn.exec_driver_sql(
            "SELECT id, selected_scales_json FROM child_test"
        ).fetchall()
        for row_id, selected_scales_json in rows:
            try:
                selected = json.loads(selected_scales_json or "{}")
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(selected, dict):
                continue
            structured: dict[str, list] = {}
            selected_structured: dict[str, object] = {
                key: value
                for key, value in selected.items()
                if str(key or "").startswith("__")
            }
            for test_id, variants in selected.items():
                test_id_text = str(test_id or "").strip()
                if not test_id_text or test_id_text.startswith("__"):
                    continue
                seen: list[dict] = []
                selected_variants: list[dict] = []
                selected_codes = selected_codes_from_variants(variants)
                for row in fetch_parent_scale_rows_by_test(test_id_text):
                    available_codes = collect_scale_codes(getattr(row, "scale_struct", ""))
                    selected_for_variant = sorted(selected_codes.intersection(available_codes))
                    if selected_codes and not selected_for_variant:
                        continue
                    raw = getattr(row, "sub_test_json", "")
                    try:
                        cond = json.loads(raw)
                    except (TypeError, json.JSONDecodeError):
                        continue
                    if isinstance(cond, dict) and cond not in seen:
                        seen.append(cond)
                        selected_variants.append(
                            {
                                "sub_test_json": cond,
                                "variable": {
                                    "available_scale_codes": sorted(available_codes),
                                    "selected_scale_codes": selected_for_variant,
                                },
                            }
                        )
                if seen:
                    structured[test_id_text] = seen
                    selected_structured[test_id_text] = selected_variants
            if not structured:
                continue
            conn.execute(
                text(
                    """
                    UPDATE child_test
                    SET sub_test_json = :sub_test_json,
                        selected_scales_json = :selected_scales_json
                    WHERE id = :row_id
                    """
                ),
                {
                    "sub_test_json": json.dumps(structured, ensure_ascii=False),
                    "selected_scales_json": json.dumps(selected_structured, ensure_ascii=False),
                    "row_id": row_id,
                },
            )


def ensure_admin_client_relation_table() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "admin_client_relation" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE admin_client_relation (
                    id INTEGER PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL,
                    client_id_a INTEGER NOT NULL,
                    role_a VARCHAR(50) NOT NULL,
                    client_id_b INTEGER NOT NULL,
                    role_b VARCHAR(50) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_admin_client_relation_admin_user_id ON admin_client_relation (admin_user_id)"
        )
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_admin_client_relation_client_id_a ON admin_client_relation (client_id_a)"
        )
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_admin_client_relation_client_id_b ON admin_client_relation (client_id_b)"
        )


def ensure_access_link_match_field_keys_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_custom_test_access_link")}
    with engine.begin() as conn:
        if "match_field_keys_json" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_custom_test_access_link
                ADD COLUMN match_field_keys_json TEXT NOT NULL DEFAULT '["name"]'
                """
            )


def ensure_access_link_allow_unanswered_submission_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_custom_test_access_link")}
    with engine.begin() as conn:
        if "allow_unanswered_submission" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_custom_test_access_link
                ADD COLUMN allow_unanswered_submission BOOLEAN NOT NULL DEFAULT FALSE
                """
            )


def ensure_child_test_allow_unanswered_submission_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "allow_unanswered_submission" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN allow_unanswered_submission BOOLEAN NOT NULL DEFAULT FALSE
                """
            )


def ensure_access_link_show_report_result_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("admin_custom_test_access_link")}
    with engine.begin() as conn:
        if "show_report_result" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE admin_custom_test_access_link
                ADD COLUMN show_report_result BOOLEAN NOT NULL DEFAULT TRUE
                """
            )


def ensure_child_test_show_report_result_column() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("child_test")}
    with engine.begin() as conn:
        if "show_report_result" not in columns:
            conn.exec_driver_sql(
                """
                ALTER TABLE child_test
                ADD COLUMN show_report_result BOOLEAN NOT NULL DEFAULT TRUE
                """
            )


def ensure_assessment_link_pre_registered_client_table() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "assessment_link_pre_registered_client" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE assessment_link_pre_registered_client (
                    id SERIAL PRIMARY KEY,
                    access_link_id INTEGER NOT NULL REFERENCES admin_custom_test_access_link(id),
                    admin_user_id INTEGER NOT NULL REFERENCES admin_user(id),
                    profile_data_json TEXT NOT NULL DEFAULT '{}',
                    provisional_client_id INTEGER REFERENCES admin_client(id),
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_alpr_access_link_id ON assessment_link_pre_registered_client (access_link_id)"
        )
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_alpr_admin_user_id ON assessment_link_pre_registered_client (admin_user_id)"
        )
