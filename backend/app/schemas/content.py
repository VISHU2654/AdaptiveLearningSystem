from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ContentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    content_type: str = Field(..., pattern="^(video|article|quiz|exercise|project)$")
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    topics: List[str] = Field(default_factory=list)
    skills_taught: List[str] = Field(default_factory=list)
    prerequisites: List[int] = Field(default_factory=list)
    learning_objectives: List[str] = Field(default_factory=list)
    duration_minutes: Optional[int] = None
    author: Optional[str] = None


class ContentOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    content_type: str
    difficulty: str
    topics: List[str]
    skills_taught: List[str]
    prerequisites: List[int] = Field(default_factory=list)
    learning_objectives: List[str] = Field(default_factory=list)
    duration_minutes: Optional[int] = None
    author: Optional[str] = None
    rating: float
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ContentFilter(BaseModel):
    content_type: Optional[str] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None
