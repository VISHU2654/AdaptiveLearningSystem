import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import create_access_token, get_password_hash, verify_password
from app.config import settings
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    OTPChallenge,
    OTPResend,
    OTPVerify,
    Token,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.utils.email import (
    generate_otp,
    get_email_config,
    send_login_notification,
    send_otp_email,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

OTP_EXPIRY_MINUTES = 10
OTP_PURPOSE_REGISTER = "register"
OTP_PURPOSE_LOGIN = "login"


def _otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _store_otp(user: User, purpose: str) -> str:
    otp = generate_otp()
    user.otp_code = get_password_hash(otp)
    user.otp_expires_at = _otp_expiry()
    user.otp_purpose = purpose
    return otp


def _require_email_delivery(sent: bool, email_config: dict) -> None:
    if sent or not email_config["email_delivery_required"]:
        return
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Email delivery is not configured. Ask an admin to set up the app email sender."
        ),
    )


def _issue_token(user: User) -> Token:
    token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_admin": user.is_admin,
        }
    )
    return Token(access_token=token)


def _demo_login_email_set() -> set[str]:
    return {
        email.strip().lower()
        for email in settings.DEMO_LOGIN_EMAILS.split(",")
        if email.strip()
    }


def _demo_bypass_enabled() -> bool:
    return bool(settings.DEMO_AUTH_BYPASS_ENABLED)


def _is_demo_login_user(user: User) -> bool:
    return _demo_bypass_enabled() and user.email.lower() in _demo_login_email_set()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new account and send an email verification OTP."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        skill_level=user_in.skill_level,
        preferred_topics=user_in.preferred_topics,
        learning_goals=user_in.learning_goals,
        is_verified=False,
    )
    otp = _store_otp(user, OTP_PURPOSE_REGISTER)

    db.add(user)
    await db.flush()
    await db.refresh(user)

    email_config = await get_email_config(db)
    email_sent = await send_otp_email(
        db,
        user.email,
        otp,
        user.full_name,
        OTP_PURPOSE_REGISTER,
    )
    _require_email_delivery(email_sent, email_config)

    return user


@router.post("/demo-register", response_model=Token)
async def demo_register(db: AsyncSession = Depends(get_db)):
    """Create a temporary verified learner for demos without using a real mailbox."""
    if not _demo_bypass_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo signup is disabled.",
        )

    demo_domain = settings.DEMO_SIGNUP_EMAIL_DOMAIN.strip().lower() or "demo.local"
    email = ""
    for _ in range(5):
        candidate = f"demo.{uuid4().hex[:12]}@{demo_domain}"
        result = await db.execute(select(User).where(User.email == candidate))
        if result.scalar_one_or_none() is None:
            email = candidate
            break

    if not email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create a unique demo account. Please try again.",
        )

    user = User(
        email=email,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        full_name="Demo Learner",
        skill_level="intermediate",
        preferred_topics=["javascript", "machine-learning"],
        learning_goals=[
            "Build a recommendation dashboard",
            "Strengthen React skills",
            "Understand ML ranking",
        ],
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return _issue_token(user)


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verify the current registration or login OTP and return a JWT."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email",
        )

    if user.otp_purpose == OTP_PURPOSE_REGISTER and user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )

    if not user.otp_code or not user.otp_expires_at or not user.otp_purpose:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP request was found. Please request a new one.",
        )

    if datetime.now(timezone.utc) > _as_aware_utc(user.otp_expires_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    if not verify_password(data.otp, user.otp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please check and try again.",
        )

    purpose = user.otp_purpose
    if purpose == OTP_PURPOSE_REGISTER:
        user.is_verified = True
    elif purpose == OTP_PURPOSE_LOGIN:
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email is not verified. Please verify registration first.",
            )
        user.last_login_at = datetime.now(timezone.utc)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP request was found. Please request a new one.",
        )

    user.otp_code = None
    user.otp_expires_at = None
    user.otp_purpose = None
    db.add(user)
    await db.flush()

    if purpose == OTP_PURPOSE_LOGIN:
        await send_login_notification(db, user.email, user.full_name)

    token = _issue_token(user)
    message = (
        "Email verified successfully"
        if purpose == OTP_PURPOSE_REGISTER
        else "Login verified successfully"
    )
    return {"message": message, **token.model_dump()}


@router.post("/resend-otp")
async def resend_otp(data: OTPResend, db: AsyncSession = Depends(get_db)):
    """Resend a registration OTP for accounts that are not verified yet."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )

    otp = _store_otp(user, OTP_PURPOSE_REGISTER)
    db.add(user)
    await db.flush()

    email_config = await get_email_config(db)
    email_sent = await send_otp_email(
        db, user.email, otp, user.full_name, OTP_PURPOSE_REGISTER
    )
    _require_email_delivery(email_sent, email_config)

    return {"message": "A new OTP has been sent to your email"}


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify the password and email a login OTP.
    The JWT is issued by POST /api/v1/auth/verify-otp after the OTP is entered.
    """
    email = form_data.username.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if _is_demo_login_user(user):
        user.is_verified = True
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        await db.flush()
        return _issue_token(user)

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Email not verified. Please verify your account with the OTP sent during registration."
            ),
        )

    email_config = await get_email_config(db)
    otp = _store_otp(user, OTP_PURPOSE_LOGIN)
    db.add(user)
    await db.flush()

    email_sent = await send_otp_email(
        db, user.email, otp, user.full_name, OTP_PURPOSE_LOGIN
    )
    _require_email_delivery(email_sent, email_config)

    return OTPChallenge(
        message="A login OTP has been sent to your email.",
        email=user.email,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's skill_level, preferred_topics, and learning_goals."""
    if update.skill_level is not None:
        current_user.skill_level = update.skill_level
    if update.preferred_topics is not None:
        current_user.preferred_topics = update.preferred_topics
    if update.learning_goals is not None:
        current_user.learning_goals = update.learning_goals
    db.add(current_user)
    await db.flush()
    await db.refresh(current_user)
    return current_user
