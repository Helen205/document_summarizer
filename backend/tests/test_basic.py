import pytest
import os
# from fastapi.testclient import TestClient # BU SATIRI KALDIRIN!
from app.main import app

# Test ortamı için environment variables ayarla (bu kısım burada kalabilir)
os.environ["CHROMA_HOST"] = "localhost"
os.environ["CHROMA_PORT"] = "8000"
os.environ["CHROMA_TENANT"] = "test"
os.environ["CHROMA_SERVER_CORS_ALLOW_ORIGINS"] = "*"
os.environ["CHROMA_SERVER_AUTH_PROVIDER"] = "none"

# client = TestClient(app) # BU SATIRI KALDIRIN VEYA YORUM SATIRI YAPIN!

def test_app_startup(client): # client'ı parametre olarak ekleyin
    """Uygulama başlatma testi"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data

def test_health_check(client): # client'ı parametre olarak ekleyin
    """Sağlık kontrolü testi"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_api_docs(client): # client'ı parametre olarak ekleyin
    """API dokümantasyonu testi"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_register_endpoint(client): # client'ı parametre olarak ekleyin
    """Kayıt endpoint'i testi"""
    user_data = {
        "username": "testuser4",
        "email": "test4@example.com",
        "password": "testpass123",
        "full_name": "Test User 4"
    }
    
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser4"
    assert data["email"] == "test4@example.com"