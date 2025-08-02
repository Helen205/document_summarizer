import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool 
from app.core.database import Base, get_db 
from app.main import create_app 
from fastapi.testclient import TestClient
from _pytest.monkeypatch import MonkeyPatch
from unittest.mock import MagicMock
from app.core.config import settings
from app.models.document import Document 
from app.core.security import get_current_active_user
from app.models.user import User

# Test veritabanı URL'i
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Test engine'i oluştur
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db_session", scope="function")
def db_session_fixture():
    """Test veritabanı oturumu oluşturur ve yönetir."""
    Base.metadata.create_all(bind=engine)
    
    connection = engine.connect()
    transaction = connection.begin()
    db = TestingSessionLocal(bind=connection)


    try:
        yield db 
    finally:
        db.close()
        transaction.rollback() 
        connection.close()
        Base.metadata.drop_all(bind=engine)
    
@pytest.fixture(name="client", scope="function")
def client_fixture(db_session, mock_ai_service, monkeypatch, test_user, admin_user):
    """Test istemcisi oluşturur."""
    
    import app.services.ai_service
    monkeypatch.setattr(app.services.ai_service, "ai_service", mock_ai_service)

    app_instance = create_app() 

    app_instance.dependency_overrides[get_db] = lambda: db_session 
    app_instance.dependency_overrides[get_current_active_user] = lambda: test_user

    with TestClient(app_instance) as c:
        yield c
    
    if get_db in app_instance.dependency_overrides:
        del app_instance.dependency_overrides[get_db]

    if get_current_active_user in app_instance.dependency_overrides:
        del app_instance.dependency_overrides[get_current_active_user]

@pytest.fixture
def mock_ai_service():
    """AI servisini mock eder."""
    from unittest.mock import MagicMock
    mock_service = MagicMock()
    
    # Mock metodları ve dönüş değerleri
    mock_service.extract_text_from_file.return_value = "Bu bir test dokümanıdır. Özetlenecek ve aranacak içerik."
    mock_service.chunk_text.return_value = ["chunk1", "chunk2"]
    mock_service.create_embeddings.return_value = [[0.1, 0.2], [0.3, 0.4]]
    mock_service.store_document_chunks.return_value = None
    mock_service.generate_summary.return_value = "Bu dokümanın kısa bir özetidir."
    mock_service.extract_keywords.return_value = ["test", "doküman", "anahtar"]
    return mock_service

@pytest.fixture
def test_user(db_session):
    """Normal test kullanıcısı oluşturur."""
    from app.models.user import User 
    from app.core.security import get_password_hash
    
    test_user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_admin=False 
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)
    return test_user

@pytest.fixture
def test_user_token(test_user):
    """Test kullanıcısı için JWT token oluşturur."""
    from app.core.security import create_access_token
    
    token = create_access_token(data={"sub": test_user.email}) 
    return token



@pytest.fixture
def admin_user(db_session):
    """Admin test kullanıcısı oluşturur."""
    from app.models.user import User 
    from app.core.security import get_password_hash
    
    admin_user = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        is_active=True,
        is_admin=True 
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)
    return admin_user



@pytest.fixture
def mock_storage_service():
    """Storage servisini mock eder."""
    from unittest.mock import MagicMock
    mock_service = MagicMock()
    mock_service.save_file.return_value = "/fake/path/test_document.txt"
    mock_service.get_file_size.return_value = 100
    mock_service.delete_file.return_value = True
    return mock_service
