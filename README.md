# RAG Destekli Doküman Yönetim Sistemi

Modern yapay zeka teknolojileri ile güçlendirilmiş, React tabanlı ön uç ve Python FastAPI arka uç ile geliştirilmiş kapsamlı bir doküman yönetim sistemi.

## 🚀 Özellikler

- **Doğal Dil Arama**: Gemini API ile semantik arama
- **Akıllı Özetleme**: Yapay zeka destekli doküman özetleme
- **Anahtar Kelime Çıkarımı**: Otomatik anahtar kelime tespiti
- **Güvenli Depolama**: Şifrelenmiş dosya depolama
- **Kullanıcı Yönetimi**: JWT tabanlı kimlik doğrulama ve RBAC
- **Vektör Veritabanı**: ChromaDB ile semantik arama
- **Modern UI**: Material UI ile responsive tasarım

## 🏗️ Mimari

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  FastAPI Backend│    │   Data Layer    │
│                 │    │                 │    │                 │
│ • Material UI   │◄──►│ • REST API      │◄──►│ • PostgreSQL    │
│ • Axios         │    │ • JWT Auth      │    │ • ChromaDB      │
│ • File Upload   │    │ • File Processing│
└─────────────────┘    └─────────────────┘    └────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Gemini API    │
                       │                 │
                       │ • Embeddings    │
                       │ • Text Generation│
                       │ • Summarization │
                       └─────────────────┘
```

## 🛠️ Teknolojiler

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Hızlı build tool
- **Material UI** - UI component library
- **Axios** - HTTP client
- **React Router** - Client-side routing

### Backend
- **FastAPI** - High-performance API framework
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Uvicorn** - ASGI server

### AI & ML
- **Google Gemini API** - LLM for embeddings and text generation
- **ChromaDB** - Vector database
- **LangChain** - RAG framework

### Database & Storage
- **PostgreSQL** - Relational database
- **ChromaDB** - Vector database

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD

## 📦 Kurulum

### Gereksinimler
- Python 3.9+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+

### Hızlı Başlangıç

1. **Repository'yi klonlayın**
```bash
git clone <repository-url>
cd dms-project
```

2. **Backend'i başlatın**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **Frontend'i başlatın**
```bash
cd frontend
npm install
npm run dev
```

4. **Docker ile tüm servisleri başlatın**
```bash
docker-compose up -d
```

## 🔧 Yapılandırma

### Ortam Değişkenleri

Backend için `.env` dosyası oluşturun:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/dms_db

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gemini API
GOOGLE_API_KEY=your-gemini-api-key

# Storage Configuration
STORAGE_TYPE=disk  # disk, s3, minio
STORAGE_PATH=./uploads
MAX_FILE_SIZE=104857600  # 100MB


e

# ChromaDB Configuration
CHROMA_HOST= 
CHROMA_PORT=8001
CHROMA_PERSIST_DIRECTORY=./chroma_db
CHROMA_SERVER_CORS_ALLOW_ORIGINS=["*"]
CHROMA_SERVER_AUTH_PROVIDER=none
CHROMA_TENANT=default_tenant

# File Encryption (optional)
ENCRYPTION_KEY=



# Log Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# RAG Configuration
CHUNK_SIZE=512
CHUNK_OVERLAP=50
EMBEDDING_MODEL=gemini-embedding-001
LLM_MODEL=gemini-2.0-flash 

## 📚 API Dokümantasyonu

FastAPI otomatik dokümantasyonu şu adreslerde mevcuttur:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Test

```bash
# Backend testleri
cd backend
pytest

# Frontend testleri
cd frontend
npm test
```

