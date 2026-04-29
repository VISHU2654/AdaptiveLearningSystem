import json
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


def _normalize_string_list(value: Any) -> List[str]:
    """Accept either a string or an array and return a clean list of strings."""
    if value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        if text.startswith("[") and text.endswith("]"):
            value = json.loads(text)
        else:
            value = text.split(",")
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item).strip()]
    raise ValueError("Expected a list of strings or a comma-separated string")


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)
    full_name: str = Field(..., min_length=1, max_length=255)
    skill_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    preferred_topics: List[str] = Field(default_factory=list)
    learning_goals: List[str] = Field(default_factory=list)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        full_name = value.strip()
        if not full_name:
            raise ValueError("Full name is required")
        return full_name

    @field_validator("preferred_topics", "learning_goals", mode="before")
    @classmethod
    def normalize_lists(cls, value: Any) -> List[str]:
        return _normalize_string_list(value)


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class OTPVerify(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    otp: str = Field(..., min_length=4, max_length=12)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email

    @field_validator("otp")
    @classmethod
    def normalize_otp(cls, value: str) -> str:
        otp = value.strip()
        if not otp.isdigit():
            raise ValueError("OTP must contain digits only")
        return otp


class OTPResend(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email


class OTPChallenge(BaseModel):
    message: str
    email: str
    requires_otp: bool = True


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    skill_level: str
    preferred_topics: List[str]
    learning_goals: List[str]
    is_active: bool
    is_admin: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("preferred_topics", "learning_goals", mode="before")
    @classmethod
    def normalize_lists(cls, value: Any) -> List[str]:
        return _normalize_string_list(value)

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    skill_level: Optional[str] = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
    preferred_topics: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None

    @field_validator("preferred_topics", "learning_goals", mode="before")
    @classmethod
    def normalize_optional_lists(cls, value: Any) -> Optional[List[str]]:
        if value is None:
            return None
        return _normalize_string_list(value)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
