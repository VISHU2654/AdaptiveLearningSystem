from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_admin
from app.models.content import Content
from app.models.user import User
from app.schemas.content import ContentCreate, ContentOut

router = APIRouter(prefix="/api/v1/content", tags=["Content"])


@router.get("/", response_model=List[ContentOut])
async def list_content(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    content_type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all published content with optional filters."""
    query = select(Content).where(Content.is_published == True)

    if content_type:
        query = query.where(Content.content_type == content_type)
    if difficulty:
        query = query.where(Content.difficulty == difficulty)
    if topic:
        # Filter by topic — JSON array contains
        query = query.where(Content.topics.contains([topic]))

    query = query.offset(skip).limit(limit).order_by(Content.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{content_id}", response_model=ContentOut)
async def get_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single content item by ID."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found"
        )
    return content


@router.post("/", response_model=ContentOut, status_code=status.HTTP_201_CREATED)
async def create_content(
    content_in: ContentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new content item (admin only)."""
    content = Content(
        title=content_in.title,
        description=content_in.description,
        content_type=content_in.content_type,
        difficulty=content_in.difficulty,
        topics=content_in.topics,
        skills_taught=content_in.skills_taught,
        duration_minutes=content_in.duration_minutes,
        author=content_in.author,
    )
    db.add(content)
    await db.flush()
    await db.refresh(content)
    return content


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a content item (admin only)."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found"
        )
    await db.delete(content)
    return None
