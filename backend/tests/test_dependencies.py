"""
Tests for FastAPI dependencies, specifically require_superuser.

We test require_superuser indirectly through admin endpoints.
"""

import pytest


def test_require_superuser_with_superuser(client, superuser_token):
    """Test that require_superuser allows access for superuser via admin endpoint."""
    # Use actual admin endpoint that requires superuser
    response = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    assert "users" in response.json()
    assert "tenants" in response.json()


def test_require_superuser_with_regular_user(client, regular_user_token):
    """Test that require_superuser denies access for regular user."""
    # Use actual admin endpoint that requires superuser
    response = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 403
    assert "Superuser access required" in response.json()["detail"]


def test_require_superuser_without_auth(client):
    """Test that require_superuser requires authentication."""
    # Use actual admin endpoint that requires superuser
    response = client.get("/api/admin/stats")
    
    assert response.status_code == 401

