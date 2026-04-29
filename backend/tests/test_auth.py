from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import engine
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def dispose_engine_between_tests():
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
def mock_email_delivery(monkeypatch):
    """Keep auth tests deterministic and avoid sending real email."""
    from app.api.routes import users as users_route

    async def fake_send_email(*args, **kwargs):
        return True

    async def fake_email_config(*args, **kwargs):
        return {
            "smtp_host": "smtp.test",
            "smtp_port": 587,
            "smtp_user": "sender@example.com",
            "smtp_password": "secret",
            "smtp_from_email": "sender@example.com",
            "smtp_use_tls": True,
            "email_delivery_required": True,
        }

    monkeypatch.setattr(users_route, "generate_otp", lambda length=6: "123456")
    monkeypatch.setattr(users_route, "get_email_config", fake_email_config)
    monkeypatch.setattr(users_route, "send_otp_email", fake_send_email)
    monkeypatch.setattr(users_route, "send_login_notification", fake_send_email)


def unique_email(prefix: str) -> str:
    return f"{prefix}.{uuid4().hex}@example.com"


@pytest.mark.asyncio
async def test_register_user():
    """Test user registration endpoint."""
    email = unique_email("testuser")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "testpassword123",
                "full_name": "Test User",
                "skill_level": "beginner",
                "preferred_topics": ["python"],
                "learning_goals": ["build adaptive learning projects"],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == email
        assert data["full_name"] == "Test User"
        assert data["learning_goals"] == ["build adaptive learning projects"]
        assert data["is_verified"] is False
        assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_verify_otp():
    """Test registration OTP verification returns a token."""
    email = unique_email("verifytest")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "testpassword123",
                "full_name": "Verify Test",
                "skill_level": "beginner",
                "preferred_topics": [],
                "learning_goals": ["finish onboarding"],
            },
        )

        response = await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_user_requires_and_verifies_otp():
    """Test password login sends an OTP and OTP verification returns a token."""
    email = unique_email("logintest")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "loginpassword123",
                "full_name": "Login Test",
                "skill_level": "beginner",
                "preferred_topics": [],
                "learning_goals": ["finish onboarding"],
            },
        )
        await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": "123456"},
        )

        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": email,
                "password": "loginpassword123",
            },
        )
        assert response.status_code == 200
        challenge = response.json()
        assert challenge["requires_otp"] is True
        assert challenge["email"] == email

        response = await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_demo_login_bypasses_otp(monkeypatch):
    """Demo login allowlisted emails get a token after password verification."""
    from app.api.routes import users as users_route

    email = unique_email("demologin")
    monkeypatch.setattr(users_route.settings, "DEMO_AUTH_BYPASS_ENABLED", True)
    monkeypatch.setattr(users_route.settings, "DEMO_LOGIN_EMAILS", email)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "loginpassword123",
                "full_name": "Demo Login",
                "skill_level": "beginner",
                "preferred_topics": [],
                "learning_goals": ["demo the app"],
            },
        )
        await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": "123456"},
        )

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": "loginpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "requires_otp" not in data


@pytest.mark.asyncio
async def test_demo_register_returns_token_without_otp(monkeypatch):
    """Demo signup creates a verified temporary account without email delivery."""
    from app.api.routes import users as users_route

    monkeypatch.setattr(users_route.settings, "DEMO_AUTH_BYPASS_ENABLED", True)
    monkeypatch.setattr(users_route.settings, "DEMO_SIGNUP_EMAIL_DOMAIN", "demo.local")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/auth/demo-register")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

        profile = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {data['access_token']}"},
        )
        assert profile.status_code == 200
        user = profile.json()
        assert user["is_verified"] is True
        assert user["email"].endswith("@demo.local")


@pytest.mark.asyncio
async def test_login_invalid_credentials():
    """Test login with wrong credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_unauthorized():
    """Test accessing /me without token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test the health check endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data
        assert "redis" in data
