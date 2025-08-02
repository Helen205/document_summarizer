import google.generativeai as genai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
import json
from typing import List, Dict, Any, Optional
from loguru import logger
from app.core.client import ClientWrapper
from app.core.config import settings

# Gemini API yapılandırması
genai.configure(api_key=settings.GOOGLE_API_KEY)

class AIService:
    def __init__(self):
        try:
            self.embedding_function = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
                separators=["\n\n", "\n", " ", ""]
            )
            self.chroma_client = ClientWrapper()

            
            # Koleksiyon oluştur veya al
            self.collection = self.chroma_client.get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"}
            )
            
            # Gemini model
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            
            logger.info("AIService initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing AIService: {e}")
            raise

    def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """Dosyadan metin çıkar"""
        try:
            # Dosya türünü temizle (.docx -> docx)
            clean_file_type = file_type.lower().lstrip('.')
            
            if clean_file_type == "pdf":
                return self._extract_from_pdf(file_path)
            elif clean_file_type in ["docx", "doc"]:
                return self._extract_from_docx(file_path)
            elif clean_file_type in ["txt", "md"]:
                return self._extract_from_text(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            raise

    def _extract_from_pdf(self, file_path: str) -> str:
        """PDF'den metin çıkar"""
        try:
            import PyPDF2
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            logger.error(f"Error extracting from PDF: {e}")
            raise

    def _extract_from_docx(self, file_path: str) -> str:
        """DOCX'den metin çıkar"""
        try:
            from docx import Document
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except ImportError as e:
            logger.error(f"python-docx library not installed: {e}")
            raise ValueError("python-docx library is required for DOCX files. Please install it with: pip install python-docx")
        except Exception as e:
            logger.error(f"Error extracting from DOCX: {e}")
            raise

    def _extract_from_text(self, file_path: str) -> str:
        """TXT/MD'den metin çıkar"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Farklı kodlamaları dene
            encodings = ['latin-1', 'cp1252', 'iso-8859-1']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        return file.read()
                except UnicodeDecodeError:
                    continue
            raise ValueError("Could not decode file with any encoding")

    def chunk_text(self, text: str) -> List[str]:
        """Metni parçalara ayır"""
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for chunking")
                return []
            
            chunks = self.text_splitter.split_text(text)
            
            # Boş chunk'ları filtrele
            non_empty_chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
            
            if not non_empty_chunks:
                logger.warning("No non-empty chunks created from text")
                return []
            
            logger.info(f"Created {len(non_empty_chunks)} chunks from text")
            return non_empty_chunks
        except Exception as e:
            logger.error(f"Error chunking text: {e}")
            raise

    def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Metin parçalarından embedding oluştur"""
        try:
            # Boş metinleri filtrele
            non_empty_texts = [text.strip() for text in texts if text.strip()]
            
            if not non_empty_texts:
                logger.warning("No non-empty texts provided for embedding creation")
                return []
            
            logger.info(f"Creating embeddings for {len(non_empty_texts)} texts")
            
            embeddings = self.embedding_function(non_empty_texts)
            
            # Embeddings'in boş olup olmadığını kontrol et
            if not embeddings or len(embeddings) == 0:
                logger.error("Embedding function returned empty result")
                raise ValueError("Expected Embeddings to be non-empty list or numpy array, got []")
            
            logger.info(f"Successfully created {len(embeddings)} embeddings")
            return embeddings
        except Exception as e:
            logger.error(f"Error creating embeddings: {e}")
            raise

    def store_document_chunks(self, document_id: int, chunks: List[str], embeddings: List[List[float]]):
        """Doküman parçalarını ChromaDB'ye kaydet"""
        try:
            # Metadata hazırla
            metadatas = [
                {
                    "document_id": str(document_id),
                    "chunk_index": i,
                    "source": f"document_{document_id}"
                }
                for i in range(len(chunks))
            ]
            
            # IDs hazırla
            ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
            
            # ChromaDB'ye ekle
            self.collection.add(
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"Stored {len(chunks)} chunks for document {document_id}")
        except Exception as e:
            logger.error(f"Error storing document chunks: {e}")
            raise

    def search_similar_chunks(self, query: str, n_results: int = 5, document_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Benzer parçaları ara"""
        try:
            # Sorgu embedding'i oluştur
            query_embedding = self.embedding_function([query])
            
            # Filtre hazırla
            where_filter = None
            if document_id:
                where_filter = {"document_id": str(document_id)}
            
            # ChromaDB'de ara
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_results,
                where=where_filter
            )
            
            # Sonuçları formatla
            formatted_results = []
            if results['documents'] and len(results['documents']) > 0:
                for i in range(len(results['documents'][0])):
                    formatted_results.append({
                        'chunk_text': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'distance': results['distances'][0][i],
                        'id': results['ids'][0][i]
                    })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching similar chunks: {e}")
            raise

    def generate_summary(self, text: str) -> str:
        """Metin özeti oluştur"""
        try:
            prompt = f"""
            Aşağıdaki metnin kısa ve öz bir özetini yazın. 
            Özet, metnin ana fikirlerini ve önemli noktalarını içermelidir.
            
            Metin:
            {text}
            
            Özet:
            """
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            raise

    def extract_keywords(self, text: str) -> List[str]:
        """Anahtar kelimeleri çıkar"""
        try:
            prompt = f"""
            Aşağıdaki metinden en önemli 10 anahtar kelimeyi çıkarın.
            Anahtar kelimeleri JSON array formatında döndürün.
            
            Metin:
            {text}
            
            Anahtar kelimeler:
            """
            
            response = self.model.generate_content(prompt)
            
            # JSON formatında yanıt al
            try:
                keywords = json.loads(response.text)
                if isinstance(keywords, list):
                    return keywords[:10]  # En fazla 10 anahtar kelime
                else:
                    return []
            except json.JSONDecodeError:
                # JSON parse edilemezse, basit kelime çıkarma
                return self._simple_keyword_extraction(text)
                
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []

    def _simple_keyword_extraction(self, text: str) -> List[str]:
        """Basit anahtar kelime çıkarma"""
        import re
        from collections import Counter
        
        # Stop words (Türkçe)
        stop_words = {
            've', 'veya', 'ile', 'için', 'bu', 'bir', 'da', 'de', 'mi', 'mu',
            'the', 'and', 'or', 'for', 'this', 'that', 'with', 'in', 'on', 'at'
        }
        
        # Metni temizle ve kelimelere ayır
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Stop words'leri çıkar
        words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # En sık geçen kelimeleri al
        word_counts = Counter(words)
        return [word for word, count in word_counts.most_common(10)]

    def answer_question(self, question: str, context_chunks: List[str]) -> str:
        """Bağlam kullanarak soruya cevap ver"""
        try:
            context = "\n\n".join(context_chunks)
            
            prompt = f"""
            Aşağıdaki bağlamı kullanarak soruyu cevaplayın.
            Eğer bağlamda cevap yoksa, "Bu bilgi verilen bağlamda bulunmuyor" yazın.
            Bağlamı kullanırken düzgün bir cümle kurun.
            
            Bağlam:
            {context}
            
            Soru:
            {question}
            
            Cevap:
            """
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            raise

# Global AI servis instance'ı
ai_service = AIService() 