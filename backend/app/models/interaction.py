from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from app.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    content_id = Column(
        Integer,
        ForeignKey("content.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    interaction_type = Column(
        String(50), nullable=False
    )  # view, click, complete, bookmark, rate
    rating = Column(Float, nullable=True)  # 1.0 - 5.0
    time_spent_seconds = Column(Integer, nullable=True)
    completed = Column(Boolean, server_default="false", nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "content_id", "interaction_type", name="uq_user_content_type"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Interaction(user_id={self.user_id}, content_id={self.content_id}, "
            f"type='{self.interaction_type}')>"
        )
