import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _get_auth_token(client: AsyncClient, email: str, password: str) -> str:
    """Helper to get a JWT token."""
    # Try to register first (ignore if exists)
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Rec Test User",
            "skill_level": "beginner",
            "preferred_topics": ["python"],
        },
    )
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_get_recommendations_authenticated():
    """Test getting recommendations as an authenticated user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _get_auth_token(client, "rectest@example.com", "rectest123")
        response = await client.get(
            "/api/v1/recommendations/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert "source" in data
        assert data["source"] in ("model", "popularity")
        assert "count" in data


@pytest.mark.asyncio
async def test_get_recommendations_unauthenticated():
    """Test getting recommendations without auth returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/recommendations/")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_trending_no_auth():
    """Test trending endpoint works without authentication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/recommendations/trending")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert data["source"] == "popularity"


@pytest.mark.asyncio
async def test_train_requires_admin():
    """Test that training endpoint requires admin privileges."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _get_auth_token(client, "nonadmin@example.com", "nonadmin123")
        response = await client.post(
            "/api/v1/recommendations/train",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
