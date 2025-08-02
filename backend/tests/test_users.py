import pytest
from fastapi import status
from app.models.user import User, UserRole
from app.core.security import get_password_hash, verify_password
from unittest.mock import MagicMock
import os

def test_get_profile(client, test_user, test_user_token):
    """Kullanıcının kendi profilini başarıyla almasını test eder."""
    response = client.get(
        "/api/v1/users/profile",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    assert data["username"] == test_user.username

def test_get_users_as_normal_user_forbidden(client, test_user_token):
    """Normal kullanıcının tüm kullanıcıları listelemesinin yasaklanmasını test eder."""
    response = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not enough permissions" in response.json()["detail"]

def test_update_user_profile_success(client, test_user, test_user_token, db_session):
    """Kullanıcının kendi profilini başarıyla güncellemesini test eder."""
    new_full_name = "Updated Test User"
    response = client.put(
        f"/api/v1/users/{test_user.id}",
        json={"full_name": new_full_name},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == new_full_name

    # DB'den doğrula
    updated_user = db_session.query(User).filter(User.id == test_user.id).first()
    assert updated_user.full_name == new_full_name

def test_update_user_password_missing_old_password(client, test_user, test_user_token):
    """Eski şifre olmadan şifre güncelleme denemesini test eder."""
    response = client.put(
        f"/api/v1/users/{test_user.id}",
        json={"password": "newsecurepassword"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Şifre değiştirmek için mevcut şifrenizi girmelisiniz." in response.json()["detail"]

def test_update_user_password_wrong_old_password(client, test_user, test_user_token):
    """Yanlış eski şifre ile şifre güncelleme denemesini test eder."""
    response = client.put(
        f"/api/v1/users/{test_user.id}",
        json={"old_password": "wrongpassword", "password": "newsecurepassword"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Mevcut şifreniz hatalı." in response.json()["detail"]