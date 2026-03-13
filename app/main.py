from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db.session import Base, engine
from app.router.admin_router import router as admin_router
from app.services.admin_service import seed_default_admin

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Screening App", version="2.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(admin_router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_admin()
