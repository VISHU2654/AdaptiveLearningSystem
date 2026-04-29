import secrets
import smtplib
import string
from email.message import EmailMessage
from html import escape
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform_config import PlatformConfig

SMTP_KEYS = [
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from_email",
    "smtp_use_tls",
    "email_delivery_required",
]


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically safer numeric OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _as_bool(value: Any, default: bool = True) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


async def get_email_config(db: AsyncSession) -> dict:
    """Read email sender settings saved inside the app database."""
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.key.in_(SMTP_KEYS)))
    rows = result.scalars().all()
    config = {row.key: row.value for row in rows}

    return {
        "smtp_host": config.get("smtp_host", ""),
        "smtp_port": int(config.get("smtp_port") or 587),
        "smtp_user": config.get("smtp_user", ""),
        "smtp_password": config.get("smtp_password", ""),
        "smtp_from_email": config.get("smtp_from_email", "") or config.get("smtp_user", ""),
        "smtp_use_tls": _as_bool(config.get("smtp_use_tls"), True),
        "email_delivery_required": _as_bool(
            config.get("email_delivery_required"), True
        ),
    }


def is_email_configured(config: dict) -> bool:
    """Return whether SMTP credentials are present."""
    return bool(
        config.get("smtp_host")
        and config.get("smtp_user")
        and config.get("smtp_password")
    )


def send_raw_email(
    config: dict,
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str,
) -> bool:
    if not is_email_configured(config):
        logger.warning("SMTP is not configured; email to {} was not sent", to_email)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = config.get("smtp_from_email") or config["smtp_user"]
    msg["To"] = to_email
    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(config["smtp_host"], config["smtp_port"], timeout=15) as server:
            server.ehlo()
            if config.get("smtp_use_tls", True):
                server.starttls()
                server.ehlo()
            server.login(config["smtp_user"], config["smtp_password"])
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.error("Failed to send email to {}: {}", to_email, exc)
        return False


async def send_otp_email(
    db: AsyncSession,
    to_email: str,
    otp_code: str,
    user_name: str,
    purpose: str,
) -> bool:
    """Send an OTP email for registration or login."""
    config = await get_email_config(db)
    safe_name = escape(user_name or "learner")
    purpose_label = "complete your registration" if purpose == "register" else "sign in"
    subject = f"AdaptLearn verification code: {otp_code}"
    plain_body = (
        f"Hi {user_name or 'learner'},\n\n"
        f"Use this AdaptLearn verification code to {purpose_label}: {otp_code}\n\n"
        "This code expires in 10 minutes. If you did not request it, ignore this email."
    )
    html_body = f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0;">
        <div style="max-width:520px;margin:32px auto;background:#111827;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="padding:28px 24px;background:#0e7490;">
            <h1 style="margin:0;color:white;font-size:22px;">AdaptLearn</h1>
            <p style="margin:6px 0 0;color:#cffafe;font-size:14px;">Adaptive Learning Platform</p>
          </div>
          <div style="padding:28px 24px;">
            <p style="margin:0 0 14px;">Hi <strong>{safe_name}</strong>,</p>
            <p style="margin:0 0 22px;color:#cbd5e1;line-height:1.5;">
              Use the verification code below to {purpose_label}.
            </p>
            <div style="background:#020617;border:1px solid #0891b2;border-radius:10px;padding:22px;text-align:center;">
              <p style="margin:0 0 10px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Verification code</p>
              <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#67e8f9;font-family:'Courier New',monospace;">{otp_code}</div>
            </div>
            <p style="margin:22px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">
              This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>. If you did not request it, ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
    """
    return send_raw_email(config, to_email, subject, plain_body, html_body)


async def send_login_notification(
    db: AsyncSession,
    to_email: str,
    user_name: str,
) -> bool:
    """Notify a user after a successful login."""
    config = await get_email_config(db)
    safe_name = escape(user_name or "learner")
    subject = "New AdaptLearn login"
    plain_body = (
        f"Hi {user_name or 'learner'},\n\n"
        "Your AdaptLearn account was just signed in. If this was not you, change your password immediately."
    )
    html_body = f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0;">
        <div style="max-width:520px;margin:32px auto;background:#111827;border:1px solid #334155;border-radius:12px;overflow:hidden;">
          <div style="padding:24px;background:#065f46;">
            <h1 style="margin:0;color:white;font-size:20px;">New AdaptLearn login</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Hi <strong>{safe_name}</strong>,</p>
            <p style="margin:0;color:#cbd5e1;line-height:1.5;">
              Your AdaptLearn account was just signed in. If this was not you, change your password immediately.
            </p>
          </div>
        </div>
      </body>
    </html>
    """
    return send_raw_email(config, to_email, subject, plain_body, html_body)
