from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class PlatformConfig(Base):
    __tablename__ = "platform_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    def __repr__(self) -> str:
        return f"<PlatformConfig(key='{self.key}')>"
