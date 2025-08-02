import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Document {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  summary?: string;
  keywords?: string[];
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSummaryData, setSelectedSummaryData] = useState<{ summary: string; keywords: string[] } | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/api/v1/documents/');
      const rawDocuments = response.data;
      const processedDocuments: Document[] = rawDocuments.map((doc: any) => {
        let processedKeywords: string[] = [];

        if (typeof doc.keywords === 'string' && doc.keywords.trim() !== '') {
          processedKeywords = doc.keywords.split(',').map((kw: string) => kw.trim());
          processedKeywords = processedKeywords.filter((kw: string) => kw !== '');
        } else if (Array.isArray(doc.keywords)) {
          processedKeywords = doc.keywords;
        }
        return {
          ...doc,
          keywords: processedKeywords
        } as Document;
      });

      setDocuments(processedDocuments);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowSummary = (summary: string | undefined, keywords: string[] | undefined) => {
    setSelectedSummaryData({
      summary: summary || 'Özet bulunamadı.',
      keywords: keywords || [],
    });
  };

  const handleCloseSummary = () => {
    setSelectedSummaryData(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Lütfen yüklenecek bir dosya seçin.');
      return;
    }

    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post('/api/v1/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.data?.detail || 'Dosya yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/v1/documents/${documentId}`);
        fetchDocuments();
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtreleme
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tablo başlıkları için stil objesi
  const thStyle = {
    textAlign: 'left' as const,
    padding: '0.8rem 1rem',
    fontWeight: '600',
    color: 'var(--color-dark)',
    backgroundColor: 'var(--color-light)',
    borderBottom: '1px solid var(--color-medium)',
  };

  // Tablo satırları için stil objesi
  const tdStyle = {
    padding: '0.8rem 1rem',
    verticalAlign: 'top' as const,
    borderBottom: '1px solid var(--color-light)',
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-medium)', marginTop: '1rem' }}>Dokümanlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        padding: '1rem 0'
      }}>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: '0',
          color: 'var(--color-dark)',
          fontWeight: '600'
        }}>
          Doküman Yönetimi
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setUploadDialogOpen(true);
            setSelectedFile(null);
            setUploadError('');
          }}
        >
          📤 Yeni Doküman Yükle
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--color-dark)' }}>🔍</span>
          <input
            type="text"
            placeholder="Doküman başlığı veya dosya adı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        {filteredDocuments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-medium)' }}>
            Henüz hiç doküman bulunmamaktadır veya arama sonuç eşleşmedi.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, borderTopLeftRadius: '8px' }}>Doküman Adı</th>
                <th style={thStyle}>Dosya Adı</th>
                <th style={thStyle}>Tür</th>
                <th style={thStyle}>Boyut</th>
                <th style={thStyle}>Yüklenme Tarihi</th>
                <th style={{ ...thStyle, borderTopRightRadius: '8px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} style={{ transition: 'background-color 0.2s ease' }} className="table-row-hover">
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: 'var(--color-dark)' }}>
                      {doc.title}
                    </div>
                    {doc.summary && (
                      <div style={{ color: 'var(--color-medium)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                        <strong>Özet:</strong> {doc.summary.substring(0, 120)}...
                      </div>
                    )}
                    {doc.keywords && doc.keywords.length > 0 && (
                      <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {doc.keywords.map((keyword, idx) => (
                          <span key={idx} style={{
                            backgroundColor: 'var(--color-medium)',
                            color: 'var(--color-lightest)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '500'
                          }}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{doc.filename}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: 'var(--color-dark)',
                      color: 'var(--color-lightest)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      letterSpacing: '0.5px'
                    }}>
                      {doc.file_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatFileSize(doc.file_size)}</td>
                  <td style={tdStyle}>
                    {new Date(doc.uploaded_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={tdStyle}>
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleShowSummary(doc.summary, doc.keywords)}
                      title="Özeti Görüntüle"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                         🔍
                      </span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDelete(doc.id)}
                      style={{ color: '#d32f2f', padding: '0.4rem 0.8rem' }}
                      title="Dokümanı Sil"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        🗑️
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--color-dark)' }}>Yeni Doküman Yükle</h2>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="file-upload" className="form-label">
                Dosya Seçin (PDF, DOCX, TXT)
              </label>
              <input
                accept=".pdf,.doc,.docx,.txt"
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                  📁 {selectedFile ? 'Dosya Değiştir' : 'Dosya Seç'}
              </label>
            </div>
            {selectedFile && (
              <div className="alert alert-info" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                <span>Seçilen dosya: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
            {uploadError && (
              <div className="alert alert-error" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>{uploadError}</span>
              </div>
            )}
            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null); // İptal edildiğinde seçili dosyayı temizle
                  setUploadError('');    // Hata mesajını temizle
                }}
              >
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? <div className="spinner"></div> : 'Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Özet Modalı */}
      {selectedSummaryData && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--color-dark)' }}>Doküman Özeti</h2>
            <div style={{ margin: '1rem 0', color: 'var(--color-dark)', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{selectedSummaryData.summary}</p>

              {selectedSummaryData.keywords && selectedSummaryData.keywords.length > 0 ? (
                <div style={{ marginTop: '1.5rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-dark)' }}>Anahtar Kelimeler:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    {selectedSummaryData.keywords.map((keyword, idx) => (
                      <span key={idx} style={{
                        backgroundColor: 'var(--color-dark)',
                        color: 'var(--color-lightest)',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-medium)', fontStyle: 'italic' }}>Anahtar kelime bulunamadı.</p>
              )}
            </div>
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleCloseSummary}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;