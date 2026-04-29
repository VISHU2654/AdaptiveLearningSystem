from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InteractionCreate(BaseModel):
    content_id: int
    interaction_type: str = Field(..., pattern="^(view|click|complete|bookmark|rate)$")
    rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    time_spent_seconds: Optional[int] = Field(default=None, ge=0)


class InteractionOut(BaseModel):
    id: int
    user_id: int
    content_id: int
    interaction_type: str
    rating: Optional[float] = None
    time_spent_seconds: Optional[int] = None
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True
