from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.api.deps import get_db, get_current_user
from app.models.interaction import Interaction
from app.models.content import Content
from app.models.user import User
from app.schemas.interaction import InteractionCreate, InteractionOut

router = APIRouter(prefix="/api/v1/interactions", tags=["Interactions"])


@router.post("/", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def log_interaction(
    interaction_in: InteractionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a user interaction (view, click, complete, bookmark, rate)."""
    # Verify content exists
    result = await db.execute(
        select(Content).where(Content.id == interaction_in.content_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found"
        )

    # Upsert: update if same (user, content, type) already exists
    stmt = pg_insert(Interaction).values(
        user_id=current_user.id,
        content_id=interaction_in.content_id,
        interaction_type=interaction_in.interaction_type,
        rating=interaction_in.rating,
        time_spent_seconds=interaction_in.time_spent_seconds,
        completed=(interaction_in.interaction_type == "complete"),
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_user_content_type",
        set_={
            "rating": stmt.excluded.rating,
            "time_spent_seconds": stmt.excluded.time_spent_seconds,
            "completed": stmt.excluded.completed,
        },
    )
    await db.execute(stmt)
    await db.flush()

    # Fetch the upserted row
    result = await db.execute(
        select(Interaction).where(
            Interaction.user_id == current_user.id,
            Interaction.content_id == interaction_in.content_id,
            Interaction.interaction_type == interaction_in.interaction_type,
        )
    )
    interaction = result.scalar_one()
    return interaction


@router.get("/history", response_model=List[InteractionOut])
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    interaction_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's interaction history."""
    query = select(Interaction).where(Interaction.user_id == current_user.id)

    if interaction_type:
        query = query.where(Interaction.interaction_type == interaction_type)

    query = query.order_by(Interaction.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
