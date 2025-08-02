from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    content = Column(Text, nullable=True)  # Çıkarılan metin içeriği
    summary = Column(Text, nullable=True)  # AI özeti
    keywords = Column(Text, nullable=True)  # JSON formatında anahtar kelimeler
    activity_logs = relationship("ActivityLog", back_populates="document")
    
    # İlişkiler
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="documents")
    
    # Meta veriler
    is_processed = Column(Boolean, default=False)  # RAG işlemi tamamlandı mı?
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Document(id={self.id}, title='{self.title}', filename='{self.filename}')>" 