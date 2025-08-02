# Proje Mimarisi ve API Dokümantasyonu

## 1. Genel Mimari

### 1.1 Sistem Genel Bakış

Bu proje, doküman yönetimi ve AI destekli analiz platformudur. Modern web teknolojileri kullanılarak geliştirilmiş olup, aşağıdaki bileşenlerden oluşmaktadır:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services   │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│   (Gemini)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (PostgreSQL)  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   ChromaDB      │
                       │   (Vector DB)   │
                       └─────────────────┘
```

### 1.2 Teknoloji Stack

**Frontend:**
- React 18
- TypeScript
- Modern CSS
- Axios (HTTP client)

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- Alembic (Database migrations)
- Pydantic (Data validation)

**AI/ML:**
- Google Gemini 2.0 Flash
- Sentence Transformers (Embeddings)
- ChromaDB (Vector database)
- LangChain (Text processing)

**Database:**
- PostgreSQL (Primary database)
- ChromaDB (Vector storage)

**Security:**
- JWT (JSON Web Tokens)
- bcrypt (Password hashing)
- CORS protection

## 2. Backend Mimari

### 2.1 Klasör Yapısı

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Kimlik doğrulama
│   │       │   ├── documents.py     # Doküman yönetimi
│   │       │   ├── search.py        # Arama işlemleri
│   │       │   └── users.py         # Kullanıcı yönetimi
│   │       └── api.py               # API router
│   ├── core/
│   │   ├── config.py                # Yapılandırma
│   │   ├── database.py              # Veritabanı bağlantısı
│   │   ├── security.py              # Güvenlik işlemleri
│   │   └── client.py                # ChromaDB client
│   ├── models/
│   │   ├── user.py                  # Kullanıcı modeli
│   │   ├── document.py              # Doküman modeli
│   │   └── ActivityLog.py           # Aktivite log modeli
│   ├── schemas/
│   │   ├── user.py                  # Kullanıcı şemaları
│   │   ├── document.py              # Doküman şemaları
│   │   └── token.py                 # Token şemaları
│   ├── services/
│   │   ├── ai_service.py            # AI servisleri
│   │   └── storage_service.py       # Dosya depolama
│   └── main.py                      # Ana uygulama
├── tests/                           # Test dosyaları
└── logs/                           # Log dosyaları
```

### 2.2 Katmanlı Mimari

**1. API Katmanı (Controllers)**
- HTTP isteklerini karşılar
- Giriş verilerini doğrular
- İş mantığını servis katmanına yönlendirir
- Yanıtları formatlar

**2. Servis Katmanı (Business Logic)**
- İş mantığını içerir
- AI işlemlerini yönetir
- Veritabanı işlemlerini koordine eder

**3. Model Katmanı (Data Layer)**
- Veritabanı modellerini tanımlar
- Veri ilişkilerini yönetir

**4. Şema Katmanı (Validation)**
- Giriş/çıkış verilerini doğrular
- API sözleşmelerini tanımlar

## 3. Frontend Mimari

### 3.1 Klasör Yapısı

```
frontend/
├── src/
│   ├── components/
│   │   └── Layout.tsx               # Ana layout bileşeni
│   ├── contexts/
│   │   └── AuthContext.tsx          # Kimlik doğrulama context'i
│   ├── pages/
│   │   ├── Login.tsx                # Giriş sayfası
│   │   ├── Register.tsx             # Kayıt sayfası
│   │   ├── Dashboard.tsx            # Ana sayfa
│   │   ├── Documents.tsx            # Doküman listesi
│   │   ├── Search.tsx               # Arama sayfası
│   │   └── Profile.tsx              # Profil sayfası
│   ├── services/
│   │   └── api.ts                   # API servisleri
│   └── styles/
│       └── global.css               # Global stiller
```

### 3.2 Bileşen Mimarisi

**1. Sayfa Bileşenleri (Pages)**
- Ana sayfa bileşenleri
- Routing ile yönetilir
- İş mantığını içerir

**2. Ortak Bileşenler (Components)**
- Yeniden kullanılabilir bileşenler
- UI/UX odaklı
- Props ile yapılandırılır

**3. Context'ler**
- Global state yönetimi
- Kimlik doğrulama durumu
- Tema ve dil ayarları

**4. Servisler**
- API çağrıları
- HTTP istekleri
- Hata yönetimi

## 4. Veritabanı Tasarımı

### 4.1 Ana Tablolar

**Users Tablosu:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Documents Tablosu:**
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    content TEXT,
    summary TEXT,
    keywords TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    is_encrypted BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ActivityLog Tablosu:**
```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    document_id INTEGER REFERENCES documents(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 İlişkiler

- **Users** ↔ **Documents**: One-to-Many
- **Users** ↔ **ActivityLog**: One-to-Many
- **Documents** ↔ **ActivityLog**: One-to-Many

## 5. AI Servisleri

### 5.1 Gemini Entegrasyonu

**Özetleme:**
- Metin analizi ve özet oluşturma
- Prompt engineering ile optimize edilmiş
- Türkçe dil desteği

**Anahtar Kelime Çıkarma:**
- JSON formatında yanıt
- Fallback mekanizması
- En önemli 10 kelime

**Soru-Cevap:**
- Context-aware yanıtlar
- ChromaDB ile entegre
- Bağlam tabanlı cevaplar

### 5.2 Embedding Sistemi

**Sentence Transformers:**
- all-MiniLM-L6-v2 modeli
- 384 boyutlu vektörler
- Cosine similarity

**ChromaDB:**
- Vector database
- Semantic search
- Metadata filtering

### 5.3 Metin İşleme

**Chunking:**
- RecursiveCharacterTextSplitter
- 1000 karakter chunk boyutu
- 200 karakter overlap

**Dosya Desteği:**
- PDF (PyPDF2)
- DOCX (python-docx)
- TXT/MD (native)

## 6. Güvenlik

### 6.1 Kimlik Doğrulama

**JWT Token:**
- Access token (15 dakika)
- Refresh token (7 gün)
- Secure cookie storage

**Password Security:**
- bcrypt hashing
- Salt + pepper
- Minimum güçlük kontrolü

### 6.2 Yetkilendirme

**Role-based Access:**
- User isolation
- Document ownership
- API endpoint protection

**Input Validation:**
- Pydantic schemas
- File type validation
- Size limits

### 6.3 Güvenlik Önlemleri

**CORS:**
- Origin whitelist
- Credentials support
- Preflight handling

**Rate Limiting:**
- API endpoint protection
- Login attempt limits
- Request throttling

## 7. API Endpoints

### 7.1 Kimlik Doğrulama

```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

### 7.2 Doküman Yönetimi

```
GET    /api/v1/documents/
GET    /api/v1/documents/{id}
POST   /api/v1/documents/upload
PUT    /api/v1/documents/update/{id}
DELETE /api/v1/documents/delete/{id}
POST   /api/v1/documents/reprocess/{id}
```

### 7.3 Arama ve AI

```
POST   /api/v1/search/question
GET    /api/v1/search/suggestions
GET    /api/v1/search/debug/chromadb
```

### 7.4 Kullanıcı Yönetimi

```
GET    /api/v1/users/me
PUT    /api/v1/users/me
DELETE /api/v1/users/me
```

## 8. Deployment

### 8.1 Docker Yapısı

**Backend Container:**
- Python 3.11
- FastAPI + Uvicorn
- PostgreSQL client

**Frontend Container:**
- Node.js 18
- React build
- Nginx serving

**Database Container:**
- PostgreSQL 15
- Persistent volume
- Backup strategy

### 8.2 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# AI Services
GOOGLE_API_KEY=your-gemini-api-key

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

## 9. Monitoring ve Logging

### 9.1 Logging

**Loguru Integration:**
- Structured logging
- File rotation
- Error tracking

**Activity Logging:**
- User actions
- Document operations
- Search queries

### 9.2 Performance Monitoring

**Metrics:**
- Response times
- Error rates
- Resource usage

**Health Checks:**
- Database connectivity
- AI service status
- Storage availability

## 10. Test Stratejisi

### 10.1 Test Piramidi

```
    E2E Tests (10%)
   ┌─────────────────┐
   │ Integration     │
   │ Tests (20%)     │
   └─────────────────┘
   ┌─────────────────┐
   │ Unit Tests      │
   │ (70%)           │
   └─────────────────┘
```

### 10.2 Test Kategorileri

**Unit Tests:**
- Individual functions
- Mock dependencies
- Fast execution

**Integration Tests:**
- API endpoints
- Database operations
- External services

**E2E Tests:**
- User workflows
- Browser automation
- Real scenarios

## 11. Gelecek Geliştirmeler

### 11.1 Özellik Eklentileri

- **Multi-language Support**: Çoklu dil desteği
- **Advanced Search**: Gelişmiş arama filtreleri
- **Document Collaboration**: Doküman paylaşımı
- **Real-time Updates**: WebSocket entegrasyonu

### 11.2 Teknik İyileştirmeler

- **Caching**: Redis entegrasyonu
- **Microservices**: Servis ayrıştırması
- **Kubernetes**: Container orchestration
- **CI/CD**: Otomatik deployment

### 11.3 AI Geliştirmeleri

- **Custom Models**: Fine-tuned models
- **Multi-modal**: Görsel analiz
- **Conversation History**: Sohbet geçmişi
- **Personalization**: Kişiselleştirme 