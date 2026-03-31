import os
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
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ENV_FILE = BASE_DIR / ".env"


def load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file()


class ArtifactsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200 and path.lower().endswith(".html"):
            # Legacy report HTML files are CP949 encoded.
            response.headers["content-type"] = "text/html; charset=cp949"
            # Avoid stale UTF-8 cached responses in browsers.
            response.headers["cache-control"] = "no-store, max-age=0"
        return response


app = FastAPI(title="Screening App", version="2.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/artifacts", ArtifactsStaticFiles(directory=ARTIFACTS_DIR), name="artifacts")
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
