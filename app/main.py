from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db.schema_migrations import (
    ensure_submission_client_id_column,
    ensure_submission_scoring_result_table,
)
from app.db.session import Base, engine
from app.router.assessment_link_router import router as assessment_link_router
from app.router.auth_router import router as auth_router
from app.router.client_router import router as client_router
from app.router.custom_test_router import router as custom_test_router
from app.router.dashboard_router import router as dashboard_router
from app.router.page_router import router as page_router
from app.router.scoring_router import router as scoring_router
from app.services.admin.auth import seed_default_admin

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Screening App", version="2.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(page_router)
app.include_router(auth_router)
app.include_router(custom_test_router)
app.include_router(client_router)
app.include_router(assessment_link_router)
app.include_router(dashboard_router)
app.include_router(scoring_router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_submission_client_id_column()
    ensure_submission_scoring_result_table()
    seed_default_admin()
