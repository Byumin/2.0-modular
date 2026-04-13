from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"
REACT_DIST_DIR = BASE_DIR / "frontend" / "dist"

router = APIRouter()


def _react_index() -> FileResponse:
    """React SPA index.html — serves for React-managed browser routes."""
    index_file = REACT_DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(
            status_code=503,
            detail="React frontend build is missing. Run `npm run build` in frontend/ first.",
        )
    return FileResponse(index_file)


@router.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@router.get("/assessment/custom/{access_token}")
def custom_assessment_page(access_token: str) -> FileResponse:
    return _react_index()


# Admin routes → React SPA (handles routing client-side via React Router)
@router.get("/admin")
def admin_login_page() -> FileResponse:
    return _react_index()


@router.get("/admin/{path:path}")
def admin_spa_page(path: str) -> FileResponse:
    return _react_index()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "router+service", "ui": "react", "db": "sqlite"}
