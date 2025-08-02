# Test Dokümantasyonu

Bu dizin, projenin temel testlerini içermektedir. Sadece kritik fonksiyonlar test edilmiştir.

## Test Dosyaları

### 1. `test_basic.py`
**Temel İşlevsellik Testleri**
- Uygulama başlatma
- API dokümantasyonu
- Sağlık kontrolü
- Kayıt ve giriş endpoint'leri

### 2. `test_auth.py`
**Kimlik Doğrulama Testleri**
- Kullanıcı kaydı
- Kullanıcı girişi
- Geçersiz kimlik bilgileri

### 3. `test_documents.py`
**Doküman Testleri**
- Doküman yükleme
- Doküman listesi alma
- Geçersiz dosya yükleme

### 4. `test_search.py`
**Arama Testleri**
- Arama önerileri
- ChromaDB debug
- Soru sorma

## Test Çalıştırma

### Tüm Testleri Çalıştırma
```bash
cd backend
python run_tests.py
```

### Belirli Test Dosyasını Çalıştırma
```bash
cd backend
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_documents.py -v
python -m pytest tests/test_search.py -v
python -m pytest tests/test_basic.py -v
```

## Test İstatistikleri

| Kategori | Test Sayısı | Açıklama |
|----------|-------------|----------|
| Temel İşlevsellik | 6 | Uygulama başlatma ve API |
| Kimlik Doğrulama | 3 | Kayıt ve giriş |
| Doküman | 3 | Yükleme ve listeleme |
| Arama | 3 | Arama ve soru sorma |
| **TOPLAM** | **15** | **Basit ve etkili** |

## Test Hedefleri

- ✅ **Basitlik**: Gereksiz karmaşıklık yok
- ✅ **Hız**: Hızlı çalışan testler
- ✅ **Güvenilirlik**: Kritik fonksiyonları test eder
- ✅ **Bakım Kolaylığı**: Anlaşılır ve düzenli

## Test Kuralları

1. **Sadece gerekli testler**: Kritik fonksiyonları test et
2. **Basit assertions**: Karmaşık kontroller yapma
3. **Hızlı çalışma**: Testler 30 saniyede bitmeli
4. **Anlaşılır isimler**: Test fonksiyonları açık olsun

---

**Son Güncelleme**: Aralık 2024  
**Test Versiyonu**: 1.0.0  
**Toplam Test**: 15 