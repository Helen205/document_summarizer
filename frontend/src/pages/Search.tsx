import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Document {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  summary?: string;
}

interface QuestionResult {
  question: string;
  answer: string;
  document_id: number;
  document_title: string;
  sources: Array<{
    chunk_index: number;
    similarity: number;
    chunk_text: string;
  }>;
}

const Search = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [inputQuestion, setInputQuestion] = useState('');
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('doc');
    if (docId) {
      setSelectedDocument(docId);
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/api/v1/documents/');
      setDocuments(response.data);
      if (!selectedDocument && response.data.length > 0) {
        setSelectedDocument(response.data[0]?.id || '');
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError('Dokümanlar yüklenirken hata oluştu');
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocument(docId);
    setQuestionResult(null);
    setError('');
    setInputQuestion('');
  };

  const handleAskQuestion = async () => {
    if (!inputQuestion.trim() || !selectedDocument) {
      setError('Lütfen bir doküman seçin ve bir soru girin.');
      return;
    }

    setLoading(true);
    setError('');
    setQuestionResult(null);

    try {
      const response = await api.post('/api/v1/search/question', {
        question: inputQuestion.trim(),
        document_id: parseInt(selectedDocument)
      });
      setQuestionResult(response.data);
      if (!response.data || !response.data.answer) {
        setError('Soruya bir cevap bulunamadı.');
      }
    } catch (err) {
      setError('Soru sorulurken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('Question failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAskQuestion();
    }
  };

  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  const getSelectedDocumentTitle = () => {
    const doc = documents.find(d => d.id === selectedDocument);
    return doc ? doc.title : 'Doküman Seçin';
  };

  return (
    // App.tsx'teki .app ve Layout.tsx'teki main dış container'a dikkat!
    // Bu div, tam ekran flex yapısını Search için sağlıyor.
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}> {/* height: '100vh' yerine '100%' kullanıldı, Layout'taki main div zaten yeterli yüksekliği sağlıyor */}
      {/* Sol Sidebar (Doküman Listesi) */}
      <div style={{
        width: '300px', // Genişlik biraz ayarlandı
        minWidth: '250px', // Minimum genişlik eklendi
        maxWidth: '350px', // Maksimum genişlik eklendi
        background: '#fff', // Beyaz arka plan
        borderRight: '1px solid var(--border-color)',
        padding: '1.5rem 0', // Dikeyde daha fazla boşluk
        overflowY: 'auto',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)', // Daha yumuşak ve hafif gölge
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        display: 'flex', // İçeriği de flex yap
        flexDirection: 'column', // Dikeyde hizala
      }}>
        <h2 style={{ padding: '0 1.5rem 1.5rem', fontSize: '1.5rem', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>📚</span> Dokümanlar
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}> {/* Listeyi esnek yap */}
          {documents.length === 0 && !error && (
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Dokümanlar yükleniyor...</p>
          )}
          {error && <p className="alert alert-error" style={{ fontSize: '0.9rem', margin: '1rem' }}>{error}</p>}
          {documents.map((doc) => (
            <li
              key={doc.id}
              onClick={() => handleDocumentSelect(doc.id)}
              style={{
                padding: '0.8rem 1.5rem',
                marginBottom: '0.25rem',
                borderRadius: '0',
                cursor: 'pointer',
                background: selectedDocument === doc.id ? 'var(--primary-color)' : 'transparent', // Seçiliyse ana renk
                color: selectedDocument === doc.id ? 'var(--text-light)' : 'var(--text-dark)', // Seçiliyse beyaz metin
                fontWeight: selectedDocument === doc.id ? '600' : 'normal',
                transition: 'background 0.2s ease, color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderLeft: selectedDocument === doc.id ? '4px solid var(--primary-dark)' : '4px solid transparent', // Daha belirgin sol çizgi
              }}
              onMouseEnter={(e) => {
                if (selectedDocument !== doc.id) {
                  e.currentTarget.style.background = 'var(--medium-bg)';
                  e.currentTarget.style.color = 'var(--text-dark)'; // Hover'da metin rengini koru
                }
              }}
              onMouseLeave={(e) => {
                if (selectedDocument !== doc.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-dark)';
                }
              }}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0, color: selectedDocument === doc.id ? 'var(--text-light)' : 'var(--primary-color)' }}>📄</span> {/* İkon rengi */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: selectedDocument === doc.id ? 'rgba(255,255,255,0.7)' : 'var(--secondary-color)' }}>
                  ({doc.file_type.toUpperCase()})
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Ana İçerik Alanı (Soru Sorma ve Cevaplama) */}
      <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', background: 'var(--light-bg)' }}> {/* Genel arka plan rengi */}
        <h1 style={{ marginBottom: '1rem', color: 'var(--text-dark)', fontSize: '2rem', fontWeight: '700' }}>Doküman Soru-Cevap</h1>
        <p style={{ color: 'var(--secondary-color)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
          Yapay zeka, seçtiğiniz doküman içindeki bilgilerle size cevap verecektir.
        </p>

        {selectedDocument ? (
          <>
            {/* Soru Sorma Kartı */}
            <div className="card" style={{ marginBottom: '2rem', border: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}> {/* Kart gölgesi güçlendirildi */}
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)' }}>Seçili Doküman: <span style={{ color: 'var(--primary-color)' }}>{getSelectedDocumentTitle()}</span></h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>❓</span>
                <input
                  type="text"
                  placeholder={`"${getSelectedDocumentTitle()}" hakkında soru sorun...`}
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  style={{ flex: 1 }}
                  disabled={loading}
                />
                <button
                  className="btn btn-primary" // Ana buton stilini kullan
                  onClick={handleAskQuestion}
                  disabled={loading || !inputQuestion.trim()}
                  style={{ minWidth: '130px', padding: '0.8rem 1.5rem' }}
                >
                  {loading ? <div className="spinner"></div> : 'Sor'}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            {/* Soru-Cevap Sonucu */}
            {questionResult && !loading && !error && (
              <div className="card" style={{ border: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)' }}>Soru-Cevap Sonucu</h3>

                <div style={{ marginBottom: '1.25rem' }}>
                  <strong style={{ color: 'var(--text-dark)' }}>Soru:</strong> {questionResult.question}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <strong style={{ color: 'var(--text-dark)' }}>Cevap:</strong>
                  <div style={{
                    background: 'var(--medium-bg)',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    marginTop: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem'
                  }}>
                    {questionResult.answer}
                  </div>
                </div>

                {/* Cevabın Kaynakları (Tüm chunk'lar listelenecek) */}
                {questionResult.sources && questionResult.sources.length > 0 && (
                  <div>
                    <h4 style={{ marginTop: '2.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: '600' }}>Kaynaklar</h4>
                    {questionResult.sources.map((source, index) => (
                      <div key={index} style={{
                        marginTop: '0.75rem',
                        padding: '1rem',
                        background: 'var(--light-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0, color: 'var(--secondary-color)' }}>🔍</span> {/* İşaret */}
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', marginBottom: '0.25rem' }}>
                            Parça #{source.chunk_index} (Benzerlik: {formatSimilarity(source.similarity)})
                          </div>
                          <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                            "{source.chunk_text}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Yükleniyor ve Sonuç Bulunamadı durumları */}
            {loading && (
              <div className="card" style={{ textAlign: 'center', border: 'none', boxShadow: 'none' }}>
                <div className="spinner" style={{ margin: 'auto' }}></div>
                <p style={{ color: 'var(--secondary-color)', marginTop: '1rem', fontSize: '1rem' }}>Cevap aranıyor...</p>
              </div>
            )}

            {selectedDocument && !loading && !questionResult && inputQuestion.trim() && !error && (
              <div className="card" style={{ textAlign: 'center', border: 'none', boxShadow: 'none' }}>
                <h3 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                  Cevap Bulunamadı
                </h3>
                <p style={{ color: 'var(--secondary-color)', marginTop: '1rem', fontSize: '0.95rem' }}>
                  Sorgunuzla ilgili bir cevap bulunamadı. Lütfen sorunuzu daha açık ifade edin veya farklı anahtar kelimeler deneyin.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', border: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: 'var(--secondary-color)', fontSize: '1.5rem' }}>Lütfen sol taraftan bir doküman seçin.</h3>
            <p style={{ color: 'var(--secondary-color)', marginTop: '1rem', fontSize: '1.1rem' }}>
              Seçtiğiniz doküman hakkında sorular sorabilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;