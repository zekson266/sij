"""
Tests for admin API endpoints.
"""

import pytest


def test_list_all_users_as_superuser(client, superuser, superuser_token, regular_user):
    """Test that superuser can list all users."""
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # At least superuser and regular_user
    
    # Check that both users are in the list
    emails = [user["email"] for user in data]
    assert superuser.email in emails
    assert regular_user.email in emails


def test_list_all_users_as_regular_user(client, regular_user_token):
    """Test that regular user cannot access admin endpoints."""
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 403
    assert "Superuser access required" in response.json()["detail"]


def test_list_all_users_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/admin/users")
    
    assert response.status_code == 401


def test_list_all_users_with_filters(client, superuser_token, regular_user, superuser):
    """Test filtering users by is_active and is_superuser."""
    # Filter by superuser
    response = client.get(
        "/api/admin/users?is_superuser=true",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(user["is_superuser"] is True for user in data)
    
    # Filter by non-superuser
    response = client.get(
        "/api/admin/users?is_superuser=false",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(user["is_superuser"] is False for user in data)


def test_list_all_tenants_as_superuser(client, superuser_token, test_tenant):
    """Test that superuser can list all tenants."""
    response = client.get(
        "/api/admin/tenants",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Check that test tenant is in the list
    tenant_ids = [tenant["id"] for tenant in data]
    assert str(test_tenant.id) in tenant_ids


def test_list_all_tenants_as_regular_user(client, regular_user_token):
    """Test that regular user cannot list all tenants."""
    response = client.get(
        "/api/admin/tenants",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 403


def test_list_all_tenants_with_filters(client, superuser_token, test_tenant):
    """Test filtering tenants by is_active and is_verified."""
    # Filter by active
    response = client.get(
        "/api/admin/tenants?is_active=true",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(tenant["is_active"] is True for tenant in data)


def test_get_platform_stats_as_superuser(client, superuser_token, regular_user, superuser, test_tenant):
    """Test that superuser can get platform statistics."""
    response = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "users" in data
    assert "tenants" in data
    assert data["users"]["total"] >= 2
    assert data["users"]["superusers"] >= 1
    assert data["tenants"]["total"] >= 1


def test_get_platform_stats_as_regular_user(client, regular_user_token):
    """Test that regular user cannot get platform statistics."""
    response = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {regular_user_token}"}
    )
    
    assert response.status_code == 403


def test_get_platform_stats_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/admin/stats")
    
    assert response.status_code == 401


