from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"

router = APIRouter()


@router.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@router.get("/assessment/custom/{access_token}")
def custom_assessment_page(access_token: str) -> FileResponse:
    return FileResponse(STATIC_DIR / "assessment-custom.html")


@router.get("/admin")
def admin_login_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-login.html")


@router.get("/admin/workspace")
def admin_workspace_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-workspace.html")


@router.get("/admin/clients")
def admin_clients_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-clients.html")


@router.get("/admin/client-detail")
def admin_client_detail_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-client-detail.html")


@router.get("/admin/client-result")
def admin_client_result_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-client-result.html")


@router.get("/admin/artifact-viewer")
def admin_artifact_viewer_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-artifact-viewer.html")


@router.get("/admin/create")
def admin_create_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-create.html")


@router.get("/admin/test-detail")
def admin_test_detail_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin-test-detail.html")


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "router+service", "ui": "enabled", "db": "sqlite"}
