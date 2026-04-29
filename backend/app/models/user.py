from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    JSON,
    func,
)
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    skill_level = Column(String(50), server_default="beginner", nullable=False)
    preferred_topics = Column(JSON, server_default="[]", nullable=False)
    learning_goals = Column(JSON, server_default="[]", nullable=False)
    is_active = Column(Boolean, server_default="true", nullable=False)
    is_admin = Column(Boolean, server_default="false", nullable=False)
    is_verified = Column(Boolean, server_default="false", nullable=False)
    otp_code = Column(String(255), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_purpose = Column(String(50), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"
