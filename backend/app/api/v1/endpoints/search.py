from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.ActivityLog import ActivityLog 
from app.models.document import Document
from app.schemas.document import DocumentSearchResult
from app.services.ai_service import ai_service

router = APIRouter()

from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str
    document_id: Optional[int] = None
    limit: int = 5

@router.get("/debug/chromadb")
async def debug_chromadb(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """ChromaDB durumunu kontrol et"""
    try:
        # ChromaDB koleksiyon bilgilerini al
        collection_info = {
            "name": ai_service.collection.name,
            "count": ai_service.collection.count(),
            "metadata": ai_service.collection.metadata
        }
        
        # Kullanıcının işlenmiş dokümanlarını kontrol et
        processed_docs = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.is_processed == True
        ).all()
        
        doc_info = []
        for doc in processed_docs:
            # ChromaDB'de bu dokümanın chunk'larını ara
            try:
                chunks = ai_service.collection.query(
                    query_embeddings=[[0.0] * 384],  # Dummy embedding
                    n_results=1,
                    where={"document_id": str(doc.id)}
                )
                chunk_count = len(chunks['ids'][0]) if chunks['ids'] else 0
            except Exception as e:
                chunk_count = f"Error: {e}"
            
            doc_info.append({
                "id": doc.id,
                "title": doc.title,
                "filename": doc.filename,
                "is_processed": doc.is_processed,
                "has_content": bool(doc.content),
                "has_summary": bool(doc.summary),
                "has_keywords": bool(doc.keywords),
                "chroma_chunks": chunk_count
            })
        
        return {
            "chromadb_info": collection_info,
            "processed_documents": doc_info,
            "total_processed": len(processed_docs)
        }
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        return {"error": str(e)}

class QuestionRequest(BaseModel):
    question: str
    document_id: int

@router.post("/question")
async def ask_question(
    request: QuestionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    question = request.question
    document_id = request.document_id
    """Belirli dokümana soru sor ve cevabı döndür"""
    
    # Aktivite Loglamasını en başta yapıyoruz, hata olsa bile sorunun sorulduğunu bilelim
    # Ancak gerçek bir hata oluşursa işlemi geri almak isteyebiliriz.
    # Bu örnekte, başarılı veya başarısız olmasına bakılmaksızın logluyoruz.
    # Eğer sadece başarılı işlemleri loglamak isterseniz, bu kısmı try bloğunun sonuna taşıyabilirsiniz.
    activity_log_entry = ActivityLog(
        user_id=current_user.id,
        activity_type="question_ask", # Aktivite tipi: soru sorma
        description=f"'{question}' sorusu soruldu.", # Soruyu açıklamaya ekle
        document_id=document_id # Hangi dokümana sorulduğu
    )
    
    try:
        db.add(activity_log_entry)
        db.commit() # Aktivite kaydını hemen veritabanına kaydet
        db.refresh(activity_log_entry) # ID ve timestamp gibi alanları güncelle
        logger.info(f"Activity logged for user {current_user.id}: '{question}' on document {document_id}")
    except Exception as e:
        logger.warning(f"Failed to log question activity: {e}")
        # Loglama hatası ana API işlemini etkilememeli

    try:
        # Doküman kontrolü
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or you don't have access to it."
            )
        
        # İlgili parçaları ara
        try:
            search_results = ai_service.search_similar_chunks(
                query=question,
                n_results=5, # 5 alakalı parça alıyoruz
                document_id=document_id
            )
            logger.info(f"Found {len(search_results)} relevant chunks for question: {question}")
        except Exception as e:
            logger.error(f"Error searching for question chunks: {e}")
            search_results = [] # Hata durumunda boş liste
        
        if not search_results:
            # Eğer ilgili parça bulunamazsa, özel bir cevap döndür
            return {
                "question": question,
                "answer": "Bu soru için uygun bilgi bulunamadı. Lütfen başka bir soru deneyin veya dokümanı kontrol edin.",
                "document_id": document_id,
                "document_title": document.title,
                "sources": [] # Kaynak yoksa boş liste döndür
            }
        
        # Parça metinlerini al
        context_chunks = [result['chunk_text'] for result in search_results]
        
        # Soruyu cevapla (AI servisi ile)
        answer = ai_service.answer_question(question, context_chunks)
        
        return {
            "question": question,
            "answer": answer,
            "document_id": document_id,
            "document_title": document.title,
            "sources": [
                {
                    "chunk_index": result['metadata'].get('chunk_index'), # .get() kullanarak None hatasını engelleriz
                    "similarity": 1 - result['distance'],
                    "chunk_text": result['chunk_text'] 
                    # Frontend'de slice ettiğimiz için burada tam metni gönderiyoruz.
                    # Eğer backend'de kesmek istiyorsanız: result['chunk_text'][:500] + "..."
                }
                for result in search_results
            ]
        }
        
    except HTTPException as http_exc:
        # FastAPI'nin kendi HTTP hatalarını yakala
        # Loglama başarılı olsa bile, bir HTTP hatası fırlatıyoruz
        raise http_exc
    except Exception as e:
        logger.error(f"Error processing question request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Soru cevaplama sırasında beklenmeyen bir hata oluştu."
        )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., description="Partial search query"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Arama önerileri"""
    try:
        # Kullanıcının dokümanlarından anahtar kelimeleri topla
        documents = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.keywords.isnot(None)
        ).all()
        
        suggestions = []
        for doc in documents:
            if doc.keywords:
                keywords = doc.keywords.split(",")
                for keyword in keywords:
                    keyword = keyword.strip()
                    if keyword.lower().startswith(query.lower()) and keyword not in suggestions:
                        suggestions.append(keyword)
        
        return {"suggestions": suggestions[:10]}  # En fazla 10 öneri
        
    except Exception as e:
        logger.error(f"Error getting search suggestions: {e}")
        return {"suggestions": []} 