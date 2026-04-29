from app.api.routes.users import router as users_router
from app.api.routes.content import router as content_router
from app.api.routes.interactions import router as interactions_router
from app.api.routes.recommendations import router as recommendations_router

__all__ = [
    "users_router",
    "content_router",
    "interactions_router",
    "recommendations_router",
]
