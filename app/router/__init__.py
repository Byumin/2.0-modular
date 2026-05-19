from app.router.assessment_link_router import router as assessment_link_router
from app.router.auth_router import router as auth_router
from app.router.client_router import router as client_router
from app.router.custom_test_router import router as custom_test_router
from app.router.dashboard_router import router as dashboard_router
from app.router.page_router import router as page_router

__all__ = [
    "assessment_link_router",
    "auth_router",
    "client_router",
    "custom_test_router",
    "dashboard_router",
    "page_router",
]
