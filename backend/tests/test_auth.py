import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_register_user():
    """Test user registration endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "testuser@example.com",
                "password": "testpassword123",
                "full_name": "Test User",
                "skill_level": "beginner",
                "preferred_topics": ["python"],
                "learning_goals": ["build adaptive learning projects"],
            },
        )
        # May succeed (201) or fail (400 if already registered)
        assert response.status_code in (201, 400)
        if response.status_code == 201:
            data = response.json()
            assert data["email"] == "testuser@example.com"
            assert data["full_name"] == "Test User"
            assert data["learning_goals"] == ["build adaptive learning projects"]
            assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_login_user():
    """Test user login endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register first
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "logintest@example.com",
                "password": "loginpassword123",
                "full_name": "Login Test",
                "skill_level": "beginner",
                "preferred_topics": [],
                "learning_goals": ["finish onboarding"],
            },
        )

        # Login uses the OAuth2 password flow: form fields named username/password.
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "logintest@example.com",
                "password": "loginpassword123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


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
