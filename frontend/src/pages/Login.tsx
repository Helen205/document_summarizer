import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Giriş Yap</h1>

        <p className="login-subtitle">
          Doküman yönetim sistemine hoş geldiniz
        </p>

        {error && (
          <div className="alert alert-error">
            {/* Hata mesajı div'i için ek stil */}
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>⚠️</span>
            <span>{typeof error === 'string' ? error : JSON.stringify(error)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <div style={{ position: 'relative' }}> 
              <input
                type="text"
                id="email"
                name="email"
                className="form-input"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>📧</span> {/* İkon */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Şifre</label>
            <div style={{ position: 'relative' }}> {/* İkon için kapsayıcı */}
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }} 
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>🔒</span> {/* İkon */}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : 'Giriş Yap'}
          </button>

          <div className="login-links">
            <RouterLink to="/register" className="login-link">
              Hesabınız yok mu? Kayıt olun
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;