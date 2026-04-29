from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    JSON,
    func,
)
from app.database import Base


class Content(Base):
    __tablename__ = "content"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), index=True, nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(String(50), nullable=False)  # video, article, quiz, exercise, project
    difficulty = Column(String(50), nullable=False)  # beginner, intermediate, advanced
    topics = Column(JSON, server_default="[]", nullable=False)
    skills_taught = Column(JSON, server_default="[]", nullable=False)
    prerequisites = Column(JSON, server_default="[]", nullable=False)  # list of content IDs
    learning_objectives = Column(JSON, server_default="[]", nullable=False)  # list of objective strings
    duration_minutes = Column(Integer, nullable=True)
    author = Column(String(255), nullable=True)
    rating = Column(Float, server_default="0.0", nullable=False)
    is_published = Column(Boolean, server_default="true", nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Content(id={self.id}, title='{self.title}')>"
