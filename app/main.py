import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db.schema_migrations import (
    ensure_access_link_allow_unanswered_submission_column,
    ensure_access_link_show_report_result_column,
    ensure_access_link_match_field_keys_column,
    ensure_admin_client_assignment_unique_index,
    ensure_admin_client_birth_day_not_null,
    ensure_admin_client_created_source_column,
    ensure_admin_client_extended_fields,
    ensure_admin_client_group_tables,
    ensure_admin_client_identity_review_table,
    ensure_admin_client_relation_table,
    ensure_admin_client_report_table,
    ensure_admin_settings_table,
    ensure_admin_assessment_draft_table,
    ensure_assessment_link_pre_registered_client_table,
    ensure_child_test_allow_unanswered_submission_column,
    ensure_child_test_client_intake_mode_column,
    ensure_child_test_consent_text_column,
    ensure_child_test_requires_consent_column,
    ensure_child_test_requires_security_notice_column,
    ensure_child_test_session_configs_column,
    ensure_child_test_show_research_notice_column,
    ensure_child_test_show_report_result_column,
    ensure_child_test_soft_delete_columns,
    ensure_client_consent_record_table,
    ensure_postgresql_boolean_columns,
    migrate_child_test_sub_test_json_to_structured,
    rotate_shared_submission_access_tokens,
    ensure_submission_client_id_column,
    ensure_submission_scoring_result_table,
    ensure_test_profile_config_table,
    ensure_test_profile_condition_profile_maps,
    ensure_test_profile_config_restructure,
)
from app.db.session import Base, engine
from app.router.assessment_link_router import router as assessment_link_router
from app.router.auth_router import router as auth_router
from app.router.client_router import router as client_router
from app.router.custom_test_router import router as custom_test_router
from app.router.dashboard_router import router as dashboard_router
from app.router.identity_review_router import router as identity_review_router
from app.router.page_router import router as page_router
from app.router.report_router import router as report_router
from app.router.scoring_router import router as scoring_router
from app.router.settings_router import router as settings_router
from app.services.admin.auth import seed_default_admin

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"


class ArtifactsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200 and path.lower().endswith(".html"):
            # Legacy report HTML files are CP949 encoded.
            response.headers["content-type"] = "text/html; charset=cp949"
            # Avoid stale UTF-8 cached responses in browsers.
            response.headers["cache-control"] = "no-store, max-age=0"
        return response


class FrontendAssetsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["cache-control"] = "no-store, max-age=0"
        return response


app = FastAPI(title="Screening App", version="2.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/artifacts", ArtifactsStaticFiles(directory=ARTIFACTS_DIR), name="artifacts")
# React SPA 빌드 결과물 (frontend/dist/assets/)
if FRONTEND_DIST_DIR.exists():
    app.mount("/assets", FrontendAssetsStaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend_assets")
app.include_router(page_router)
app.include_router(auth_router)
app.include_router(custom_test_router)
app.include_router(client_router)
app.include_router(assessment_link_router)
app.include_router(dashboard_router)
app.include_router(identity_review_router)
app.include_router(scoring_router)
app.include_router(report_router)
app.include_router(settings_router)


@app.on_event("startup")
def on_startup() -> None:
    run_data_migrations = os.getenv("RUN_STARTUP_DATA_MIGRATIONS") == "1"

    Base.metadata.create_all(bind=engine)
    ensure_postgresql_boolean_columns()
    ensure_child_test_client_intake_mode_column()
    ensure_child_test_session_configs_column()
    ensure_child_test_soft_delete_columns()
    ensure_admin_client_created_source_column()
    ensure_admin_client_assignment_unique_index()
    ensure_submission_client_id_column()
    ensure_submission_scoring_result_table()
    ensure_admin_client_birth_day_not_null()
    ensure_admin_client_extended_fields()
    ensure_admin_client_group_tables()
    ensure_admin_client_report_table()
    ensure_admin_client_identity_review_table()
    ensure_child_test_requires_consent_column()
    ensure_child_test_consent_text_column()
    ensure_child_test_requires_security_notice_column()
    ensure_child_test_show_research_notice_column()
    ensure_child_test_allow_unanswered_submission_column()
    ensure_child_test_show_report_result_column()
    ensure_admin_settings_table()
    ensure_client_consent_record_table()
    ensure_admin_assessment_draft_table()
    if run_data_migrations:
        migrate_child_test_sub_test_json_to_structured()
        rotate_shared_submission_access_tokens()
    ensure_test_profile_config_table()
    if run_data_migrations:
        ensure_test_profile_config_restructure()
        ensure_test_profile_condition_profile_maps()
    ensure_admin_client_relation_table()
    ensure_access_link_match_field_keys_column()
    ensure_access_link_allow_unanswered_submission_column()
    ensure_access_link_show_report_result_column()
    ensure_assessment_link_pre_registered_client_table()
    seed_default_admin()
