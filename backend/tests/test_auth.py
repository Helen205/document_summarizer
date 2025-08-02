import pytest
from fastapi import status
from app.models.user import User

def test_register_user_success(client, db_session):
    """Yeni kullanıcı kaydını başarıyla test eder."""
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "newuser", "email": "newuser@example.com", "password": "securepassword", "full_name": "New User"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "newuser"
    assert "id" in data
    assert "hashed_password" not in data # Güvenlik kontrolü
    
    # Kullanıcının DB'ye eklendiğini doğrula
    user_in_db = db_session.query(User).filter(User.username == "newuser").first()
    assert user_in_db is not None
    assert user_in_db.email == "newuser@example.com"

def test_register_user_existing_username(client):
    """Mevcut kullanıcı adıyla kaydı test eder."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "existinguser", "email": "unique@example.com", "password": "password123", "full_name": "Existing User"}
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "existinguser", "email": "another@example.com", "password": "password456", "full_name": "Another User"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]

def test_login_invalid_credentials(client):
    """Geçersiz kimlik bilgileriyle giriş denemesini test eder."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect email or password" in response.json()["detail"]

def test_read_users_me(client, test_user, test_user_token):
    """Mevcut kullanıcının profilini almayı test eder."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username