from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.platform_config import PlatformConfig
from app.models.user import User
from app.utils.email import get_email_config, is_email_configured, send_raw_email

router = APIRouter(prefix="/api/v1/settings", tags=["Platform Settings"])


class SMTPConfig(BaseModel):
    smtp_host: str = Field(default="smtp.gmail.com", min_length=1, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_user: str = Field(..., min_length=1, max_length=255)
    smtp_password: Optional[str] = Field(default="", max_length=255)
    smtp_from_email: Optional[str] = Field(default="", max_length=255)
    smtp_use_tls: bool = True
    email_delivery_required: bool = True
    test_recipient: Optional[str] = Field(default="", max_length=255)

    @field_validator("test_recipient")
    @classmethod
    def validate_test_recipient(cls, value: Optional[str]) -> str:
        email = (value or "").strip()
        if email and "@" not in email:
            raise ValueError("Enter a valid test recipient email")
        return email


class SMTPConfigOut(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password_set: bool
    smtp_from_email: str
    smtp_use_tls: bool
    email_delivery_required: bool
    is_configured: bool


async def _save_config_value(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.key == key))
    existing = result.scalar_one_or_none()
    if existing:
        existing.value = value
        db.add(existing)
    else:
        db.add(PlatformConfig(key=key, value=value))


def _clean_password(password: Optional[str], host: str) -> str:
    value = (password or "").strip()
    if "gmail" in host.lower():
        return value.replace(" ", "")
    return value


@router.get("/smtp", response_model=SMTPConfigOut)
async def get_smtp_settings(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return the email sender configuration without exposing the password."""
    config = await get_email_config(db)
    return SMTPConfigOut(
        smtp_host=config["smtp_host"],
        smtp_port=config["smtp_port"],
        smtp_user=config["smtp_user"],
        smtp_password_set=bool(config["smtp_password"]),
        smtp_from_email=config["smtp_from_email"],
        smtp_use_tls=config["smtp_use_tls"],
        email_delivery_required=config["email_delivery_required"],
        is_configured=is_email_configured(config),
    )


@router.post("/smtp")
async def save_smtp_settings(
    data: SMTPConfig,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save and verify the app email sender used for OTP messages."""
    existing_config = await get_email_config(db)
    smtp_user = data.smtp_user.strip().lower()
    smtp_from_email = (data.smtp_from_email or data.smtp_user).strip().lower()
    provided_password = _clean_password(data.smtp_password, data.smtp_host)
    sender_changed = smtp_user != str(existing_config["smtp_user"]).strip().lower()
    from_changed = (
        smtp_from_email
        != str(existing_config["smtp_from_email"] or existing_config["smtp_user"])
        .strip()
        .lower()
    )

    if (sender_changed or from_changed) and not provided_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Enter a fresh app password when changing the sender email. "
                "Leaving it blank keeps the password saved for the previous sender."
            ),
        )

    password = provided_password or existing_config["smtp_password"]
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter the Gmail app password for this sender account.",
        )

    config = {
        "smtp_host": data.smtp_host.strip(),
        "smtp_port": data.smtp_port,
        "smtp_user": smtp_user,
        "smtp_password": password,
        "smtp_from_email": smtp_from_email,
        "smtp_use_tls": data.smtp_use_tls,
        "email_delivery_required": data.email_delivery_required,
    }
    test_recipient = str(data.test_recipient or smtp_from_email or smtp_user).strip()
    test_sent = send_raw_email(
        config,
        test_recipient,
        "AdaptLearn email sender test",
        "Your AdaptLearn email sender is configured successfully.",
        """
        <!doctype html>
        <html>
          <body style="font-family:Arial,sans-serif;">
            <h2>AdaptLearn email sender is ready</h2>
            <p>OTP and login notification emails can now be sent from this app.</p>
          </body>
        </html>
        """,
    )

    if not test_sent and data.email_delivery_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The test email could not be sent. Use a 16-character Google App Password "
                "generated from the same Gmail account as Sender email, then try again."
            ),
        )

    values = {
        "smtp_host": config["smtp_host"],
        "smtp_port": str(data.smtp_port),
        "smtp_user": smtp_user,
        "smtp_password": password,
        "smtp_from_email": smtp_from_email,
        "smtp_use_tls": str(data.smtp_use_tls).lower(),
        "email_delivery_required": str(data.email_delivery_required).lower(),
    }

    for key, value in values.items():
        await _save_config_value(db, key, value)
    await db.flush()

    return {
        "message": (
            "Email sender saved and test email sent."
            if test_sent
            else "Email sender saved, but the test email could not be sent. Check the credentials."
        ),
        "success": test_sent,
    }
