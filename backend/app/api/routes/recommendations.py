from typing import List, Set

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.api.deps import get_db, get_current_user, require_admin
from app.models.content import Content
from app.models.interaction import Interaction
from app.models.user import User
from app.schemas.content import ContentOut
from app.schemas.recommendation import RecommendationOut, TrainingStatusOut
from app.ml.engine import recommendation_engine
from app.tasks.training_tasks import train_model_task

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


async def _get_popularity_recommendations(
    db: AsyncSession, limit: int = 10
) -> List[Content]:
    """Fallback: return most popular content by interaction count."""
    stmt = (
        select(Content, func.count(Interaction.id).label("interaction_count"))
        .outerjoin(Interaction, Content.id == Interaction.content_id)
        .where(Content.is_published == True)
        .group_by(Content.id)
        .order_by(func.count(Interaction.id).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [row[0] for row in rows]


@router.get("/", response_model=RecommendationOut)
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get personalized recommendations for the current user using the HDLRS ensemble."""
    
    # 1. Fetch user profile data
    user_dict = {
        "skill_level": current_user.skill_level,
        "preferred_topics": current_user.preferred_topics,
        "learning_goals": current_user.learning_goals,
    }

    # 2. Fetch user interactions
    interaction_stmt = (
        select(Interaction)
        .where(Interaction.user_id == current_user.id)
    )
    res = await db.execute(interaction_stmt)
    user_inters_models = res.scalars().all()
    user_inters = [
        {
            "interaction_type": i.interaction_type,
            "content_id": i.content_id,
            "rating": i.rating,
            "completed": i.completed,
            "time_spent_seconds": i.time_spent_seconds
        }
        for i in user_inters_models
    ]

    # 3. Get completed IDs for filtering
    completed_ids = {i["content_id"] for i in user_inters if i["completed"]}

    # 4. Try HDLRS ensemble first
    if recommendation_engine.is_model_loaded():
        try:
            content_ids, weights = recommendation_engine.predict(
                current_user.id,
                num_items=10,
                user_data=user_dict,
                user_interactions=user_inters,
                completed_ids=completed_ids
            )
            
            if content_ids:
                result = await db.execute(
                    select(Content)
                    .where(Content.id.in_(content_ids))
                    .where(Content.is_published == True)
                )
                items = result.scalars().all()
                # Preserve predicted order
                id_to_item = {item.id: item for item in items}
                ordered = [id_to_item[cid] for cid in content_ids if cid in id_to_item]
                
                return RecommendationOut(
                    recommendations=ordered,
                    source="hybrid_ensemble",
                    count=len(ordered),
                    module_weights=weights
                )
        except Exception as e:
            logger.error(f"HDLRS prediction failed, falling back: {e}")

    # Fallback to popularity-based
    popular = await _get_popularity_recommendations(db, limit=10)
    return RecommendationOut(
        recommendations=popular,
        source="popularity",
        count=len(popular),
    )


@router.post("/train", response_model=TrainingStatusOut)
async def trigger_training(admin: User = Depends(require_admin)):
    """Trigger async model training via Celery (admin only)."""
    task = train_model_task.delay()
    return TrainingStatusOut(task_id=task.id, status="pending")


@router.get("/train/{task_id}/status", response_model=TrainingStatusOut)
async def get_training_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Check training task status."""
    from app.tasks.celery_app import celery_app

    result = celery_app.AsyncResult(task_id)
    status_map = {
        "PENDING": "pending",
        "STARTED": "running",
        "TRAINING": "running",
        "SUCCESS": "completed",
        "FAILURE": "failed",
    }
    task_status = status_map.get(result.status, result.status)
    task_result = None
    if result.ready():
        try:
            task_result = result.result
        except Exception:
            task_result = {"error": str(result.result)}
    return TrainingStatusOut(
        task_id=task_id, status=task_status, result=task_result
    )


@router.get("/trending", response_model=RecommendationOut)
async def get_trending(db: AsyncSession = Depends(get_db)):
    """Return top 10 most popular content (public, no auth)."""
    popular = await _get_popularity_recommendations(db, limit=10)
    return RecommendationOut(
        recommendations=popular,
        source="popularity",
        count=len(popular),
    )
