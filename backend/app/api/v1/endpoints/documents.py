import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import Document as DocumentSchema, DocumentCreate, DocumentUpdate
from app.services.storage_service import storage_service
from app.services.ai_service import ai_service
from app.core.config import settings

router = APIRouter()

@router.post("/upload", response_model=DocumentSchema)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Doküman yükleme"""
    try:
        # Dosya türü kontrolü
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed"
            )
        
        # Dosya boyutu kontrolü
        if file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum limit of {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Dosyayı kaydet
        file_path = storage_service.save_file(
            file.file,
            file.filename,
            file.content_type
        )
        
        # Dosya boyutunu al
        file_size = storage_service.get_file_size(file_path)
        
        # Doküman kaydını oluştur
        document = Document(
            title=title or file.filename,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_extension,
            user_id=current_user.id,
            is_encrypted=storage_service.cipher is not None
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Arka planda AI işleme ve ChromaDB'ye kaydetme
        background_tasks.add_task(process_document_ai, document.id, file_path, file_extension)
        
        return document
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading document"
        )

@router.post("/reprocess/{document_id}")
async def reprocess_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Dokümanı yeniden işle"""
    try:
        # Dokümanı kontrol et
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Dosya yolunu kontrol et
        if not document.file_path or not os.path.exists(document.file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document file not found"
            )
        
        # Arka planda yeniden işle
        background_tasks.add_task(process_document_ai, document.id, document.file_path, document.file_type)
        
        return {"message": f"Document {document_id} queued for reprocessing"}
        
    except Exception as e:
        logger.error(f"Error reprocessing document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reprocessing document"
        )

@router.get("/", response_model=List[DocumentSchema])
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcının dokümanlarını listele"""
    documents = db.query(Document).filter(
        Document.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return documents

@router.get("/{document_id}", response_model=DocumentSchema)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Belirli bir dokümanı getir"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return document

@router.put("update/{document_id}", response_model=DocumentSchema)
async def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Doküman güncelle"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Güncelleme alanları
    update_data = document_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    
    return document

@router.delete("/delete/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        doc_exists_overall = db.query(Document).filter(Document.id == document_id).first()
        if doc_exists_overall:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu belgeyi silme yetkiniz yok."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Belge bulunamadı"
            )

    try:
        db.delete(document)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Belge veritabanından silinirken bir hata oluştu."
        )

    return {"message": "Document deleted successfully"}


async def process_document_ai(document_id: int, file_path: str, file_type: str):
    """Dokümanı AI ile işle ve ChromaDB'ye kaydet (arka plan görevi)"""
    try:
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        
        # Dokümanı al
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        
        # Metin çıkar
        text_content = ai_service.extract_text_from_file(file_path, file_type)
        
        # Metni parçalara ayır
        chunks = ai_service.chunk_text(text_content)
        
        # Chunks boşsa işlemi durdur
        if not chunks:
            logger.warning(f"No chunks created for document {document_id}, skipping embedding creation")
            # Dokümanı işlenmiş olarak işaretle ama ChromaDB'ye kaydetme
            document.content = text_content
            document.summary = ai_service.generate_summary(text_content) if text_content.strip() else ""
            document.keywords = ",".join(ai_service.extract_keywords(text_content)) if text_content.strip() else ""
            document.is_processed = True
            db.commit()
            return
        
        # Embedding'ler oluştur
        embeddings = ai_service.create_embeddings(chunks)
        
        # Embeddings boşsa işlemi durdur
        if not embeddings:
            logger.warning(f"No embeddings created for document {document_id}, skipping ChromaDB storage")
        else:
            # ChromaDB'ye kaydet
            ai_service.store_document_chunks(document_id, chunks, embeddings)
        
        # Gemini ile özet oluştur
        summary = ai_service.generate_summary(text_content)
        
        # Anahtar kelimeleri çıkar
        keywords = ai_service.extract_keywords(text_content)
        
        # Dokümanı güncelle
        document.content = text_content
        document.summary = summary
        document.keywords = ",".join(keywords) if keywords else ""
        document.is_processed = True
        db.commit()
        
        logger.info(f"Document {document_id} processed and stored in ChromaDB successfully")
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
    finally:
        db.close() 