from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DocumentBase(BaseModel):
    title: str

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[str] = None

class DocumentInDBBase(DocumentBase):
    id: int
    filename: str
    file_path: str
    file_size: int
    file_type: str
    content: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[str] = None
    user_id: int
    is_processed: bool
    is_encrypted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Document(DocumentInDBBase):
    pass

class DocumentSearchResult(BaseModel):
    id: int
    title: str
    filename: str
    content: Optional[str] = None
    summary: Optional[str] = None
    similarity_score: float
    chunk_text: str
    chunk_index: int

class DocumentSummary(BaseModel):
    id: int
    title: str
    summary: str
    keywords: List[str]
    created_at: datetime 