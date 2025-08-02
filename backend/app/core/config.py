from pydantic_settings import BaseSettings, SettingsConfigDict # Buradan SettingsConfigDict import ettiğinizden emin olun
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Uygulama ayarları
    APP_NAME: str = "DMS API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Veritabanı ayarları
    DATABASE_URL: str = "postgresql://user:password@localhost/dms_db" # Testler için SQLite URL'ini unuttuğunuzu unutmayın
    
    # JWT ayarları
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS ayarları
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Gemini API ayarları
    GOOGLE_API_KEY: Optional[str] = None
    
    # Depolama ayarları
    STORAGE_TYPE: str = "disk"  
    STORAGE_PATH: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt", ".md", ".jpg", ".jpeg", ".png", ".gif"]

    
    # ChromaDB ayarları
    CHROMA_HOST: str
    CHROMA_PORT: int
    CHROMA_TENANT: str
    CHROMA_SERVER_CORS_ALLOW_ORIGINS: str
    CHROMA_SERVER_AUTH_PROVIDER: str
    # Dosya şifreleme
    ENCRYPTION_KEY: Optional[str] = None
    
    # Log ayarları
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # RAG ayarları
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    LLM_MODEL: str = "gemini-2.0-flash"
    
    # Pydantic V2 için yapılandırma
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive = True,
        extra="ignore" # Bu satırı ekliyoruz
    )

# Settings instance'ı oluştur
settings = Settings()

# Gerekli dizinleri oluştur
def create_directories():
    """Gerekli dizinleri oluştur"""
    directories = [
        settings.STORAGE_PATH,
        "logs",
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

# Uygulama başlatılırken dizinleri oluştur
create_directories()