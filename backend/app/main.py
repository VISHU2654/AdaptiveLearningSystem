import subprocess
import sys
from contextlib import asynccontextmanager

import redis as redis_sync
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory, engine
from app.ml.engine import recommendation_engine
from app.seed import seed_database

from app.api.routes.users import router as users_router
from app.api.routes.content import router as content_router
from app.api.routes.interactions import router as interactions_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting Adaptive Learning System API...")

    # 1. Run Alembic migrations
    try:
        logger.info("Running database migrations...")
        subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Migrations completed successfully")
    except subprocess.CalledProcessError as e:
        logger.warning(f"Migration output: {e.stdout}")
        logger.warning(f"Migration error: {e.stderr}")
        logger.warning("Migrations may have already been applied")

    # 2. Seed database if empty
    try:
        async with async_session_factory() as session:
            await seed_database(session)
    except Exception as e:
        logger.error(f"Seeding failed: {e}")

    # 3. Load ML model
    loaded = recommendation_engine.load_model()
    if not loaded:
        logger.warning(
            "No trained ML model found. Recommendations will use popularity fallback. "
            "Trigger training via POST /api/v1/recommendations/train"
        )

    logger.info("API startup complete!")
    yield

    # Shutdown
    logger.info("Shutting down API...")
    await engine.dispose()


app = FastAPI(
    title="Adaptive Learning Recommendation System",
    description=(
        "Personalized educational content recommendations powered by "
        "LightFM hybrid recommendation engine."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users_router)
app.include_router(content_router)
app.include_router(interactions_router)
app.include_router(recommendations_router)
app.include_router(settings_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Check the health of the API, database, and Redis."""
    db_status = "disconnected"
    redis_status = "disconnected"

    # Check database
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")

    # Check Redis
    try:
        r = redis_sync.from_url(settings.REDIS_URL)
        r.ping()
        redis_status = "connected"
        r.close()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")

    return {
        "status": "healthy" if db_status == "connected" and redis_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
    }
