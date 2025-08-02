import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalDocuments: number;
  recentDocuments: number;
  searchAndQuestionCount: number; 
  storageUsed: number;
  recentActivities: Array<{ 
    type: string;
    description: string;
    timeAgo: string;
    documentTitle: string | null; 
  }>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/api/v1/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError('İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {typeof error === 'string' ? error : JSON.stringify(error)}
      </div>
    );
  }
  
  const getActivityTagColor = (type: string) => {
    switch (type) {
      case 'document_upload': return 'var(--color-dark)';
      case 'document_search': return '#dc004e';
      case 'question_ask': return '#9c27b0';
      case 'document_delete': return '#ff9800';
      default: return 'var(--color-medium)';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      <h1 style={{ 
        fontSize: '2rem', 
        color: 'var(--color-dark)', 
        marginBottom: '0.5rem',
        fontWeight: '600'
      }}>
        Hoş Geldiniz, {user?.full_name || user?.username}!
      </h1>
      
      <p style={{ 
        color: 'var(--color-medium)', 
        marginBottom: '2rem',
        fontSize: '1.1rem'
      }}>
        Doküman yönetim sisteminizin genel durumu
      </p>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats?.totalDocuments || 0}</div>
          <div className="stat-label">Toplam Doküman</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats?.searchAndQuestionCount || 0}</div>
          <div className="stat-label">Arama & Soru Sayısı</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats?.recentDocuments || 0}</div>
          <div className="stat-label">Son 7 Gün Yüklenen</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {formatStorage(stats?.storageUsed || 0)}
          </div>
          <div className="stat-label">Kullanılan Alan</div>
        </div>
      </div>

      {/* Quick Access and Recent Activities */}
      <div className="grid grid-2">
        {/* Hızlı Erişim kartı */}
        <div className="card">
          <h3 className="card-title">Hızlı Erişim</h3>
          <div>
            <Link to="/documents" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1rem 0', 
                borderBottom: '1px solid var(--color-light)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--color-dark)' }}>Yeni Doküman Yükle</div>
                  <div style={{ color: 'var(--color-medium)', fontSize: '0.9rem' }}>PDF, DOC, TXT dosyaları</div>
                </div>
                <span style={{ 
                  background: 'var(--color-dark)', 
                  color: 'var(--color-lightest)', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  Yeni
                </span>
              </div>
            </Link>

            <Link to="/search" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1rem 0',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--color-dark)' }}>Doküman Arama</div>
                  <div style={{ color: 'var(--color-medium)', fontSize: '0.9rem' }}>Doküman içinde arama yapın</div>
                </div>
                <span style={{ 
                  background: '#dc004e', 
                  color: 'white', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  AI
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Son Aktiviteler */}
        <div className="card">
          <h3 className="card-title">Son Aktiviteler</h3>
          <div>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, index) => (
                <div key={index} style={{ 
                  padding: '1rem 0', 
                  borderBottom: index < stats.recentActivities.length - 1 ? '1px solid var(--color-light)' : 'none'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ 
                      background: getActivityTagColor(activity.type), 
                      color: 'white', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      textTransform: 'uppercase'
                    }}>
                      {activity.type === 'document_upload' ? 'UPLOAD' :
                       activity.type === 'document_search' ? 'SEARCH' :
                       activity.type === 'question_ask' ? 'QUESTION ASK' :
                       activity.type === 'document_delete' ? 'DELETE' : 'ACTIVITY'}
                    </span>
                    <span style={{ color: 'var(--color-medium)', fontSize: '0.8rem' }}>
                      {activity.timeAgo}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-dark)', fontSize: '0.9rem' }}>
                    {activity.description}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '1rem 0', 
                color: 'var(--color-medium)', 
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                Henüz aktivite bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;