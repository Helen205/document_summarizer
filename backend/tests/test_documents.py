import pytest
from fastapi import status
from app.models.document import Document
from app.services.ai_service import AIService
from unittest.mock import MagicMock, patch


def test_upload_document_unsupported_file_type(client, test_user_token, mock_storage_service):
    """Desteklenmeyen dosya türü ile belge yükleme denemesini test eder."""
    test_file_content = b"This is a test document."
    test_file_name = "image.jpg"
    test_file_type = ".jpg"

    with patch('app.core.config.settings.ALLOWED_EXTENSIONS', [".txt"]): # Sadece txt'ye izin ver
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": (test_file_name, test_file_content, "image/jpeg")},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "File type .jpg not allowed" in response.json()["detail"]

def test_get_documents_success(client, test_user, test_user_token, db_session):
    """Kullanıcının dokümanlarını başarıyla listelemesini test eder."""
    doc1 = Document(title="Doc 1", filename="doc1.txt", file_path="/path/doc1.txt", user_id=test_user.id, file_size=1024, file_type=".txt")
    doc2 = Document(title="Doc 2", filename="doc2.pdf", file_path="/path/doc2.pdf", user_id=test_user.id, file_size=2048, file_type=".pdf")
    db_session.add_all([doc1, doc2])
    db_session.commit()

    response = client.get(
        "/api/v1/documents/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert any(d["title"] == "Doc 1" for d in data)
    assert any(d["title"] == "Doc 2" for d in data)

def test_get_specific_document_success(client, test_user, test_user_token, db_session):
    """Belirli bir dokümanı başarıyla almayı test eder."""
    doc = Document(title="Single Doc", filename="single.txt", file_path="/path/single.txt", user_id=test_user.id, file_size=1024, file_type=".txt")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    response = client.get(
        f"/api/v1/documents/{doc.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == doc.id
    assert data["title"] == "Single Doc"

def test_update_document_success(client, test_user, test_user_token, db_session):
    """Doküman güncelleme işlemini başarıyla test eder."""
    doc = Document(title="Old Title", filename="old.txt", file_path="/path/old.txt", user_id=test_user.id, file_size=1024, file_type=".txt")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    new_title = "New Updated Title"
    response = client.put(
        f"/api/v1/documents/update/{doc.id}",
        json={"title": new_title},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == new_title
    
    updated_doc = db_session.query(Document).filter(Document.id == doc.id).first()
    assert updated_doc.title == new_title

def test_delete_document_success(client, test_user, test_user_token, db_session):
    """Doküman silme işlemini başarıyla test eder."""
    doc = Document(title="Doc to Delete", filename="delete.txt", file_path="/path/delete.txt", user_id=test_user.id, file_size=1024, file_type=".txt")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    response = client.delete(
        f"/api/v1/documents/delete/{doc.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "Document deleted successfully" in response.json()["message"]
    
    deleted_doc = db_session.query(Document).filter(Document.id == doc.id).first()
    assert deleted_doc is None

def test_delete_document_forbidden(client, test_user, test_user_token, db_session):
    """Başka bir kullanıcının dokümanını silme denemesinin yasaklanmasını test eder."""
    # Başka bir kullanıcı tarafından oluşturulan doküman
    other_user_doc = Document(title="Other User Doc", filename="other.txt", file_path="/path/other.txt", user_id=999, file_size=1024, file_type=".txt") # Farklı bir user_id
    db_session.add(other_user_doc)
    db_session.commit()
    db_session.refresh(other_user_doc)

    response = client.delete(
        f"/api/v1/documents/delete/{other_user_doc.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Bu belgeyi silme yetkiniz yok." in response.json()["detail"]

def test_reprocess_document_success(client, test_user, test_user_token, db_session, monkeypatch):
    """Dokümanı yeniden işleme talebini test eder."""
    doc = Document(title="Reprocess Doc", filename="reprocess.txt", file_path="/fake/path/reprocess.txt", user_id=test_user.id, file_size=1024, file_type="text/plain",)
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    # os.path.exists'i mock'la
    monkeypatch.setattr("os.path.exists", lambda x: True)

    response = client.post(
        f"/api/v1/documents/reprocess/{doc.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert f"Document {doc.id} queued for reprocessing" in response.json()["message"]