import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: formData.email, // Genellikle email kullanıcı adı olarak kullanılır
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password
      });
      // Başarılı kayıttan sonra genellikle login sayfasına yönlendirilir veya otomatik giriş yapılır
      navigate('/login?registrationSuccess=true'); // Kayıt başarılı mesajı gösterebiliriz
    } catch (err) {
      setError('Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container"> {/* login-container class'ını kullanmaya devam */}
      <div className="login-card">
        <h1 className="login-title">Kayıt Ol</h1>

        <p className="login-subtitle">
          Yeni hesap oluşturun
        </p>

        {error && (
          <div className="alert alert-error">
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>⚠️</span>
            <span>{typeof error === 'string' ? error : JSON.stringify(error)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">Ad</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className="form-input"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleChange}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>👤</span> {/* Kişi ikonu */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">Soyad</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="form-input"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>👤</span> {/* Kişi ikonu */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">E-posta Adresi</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>📧</span> {/* E-posta ikonu */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>🔒</span> {/* Kilit ikonu */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Şifre Tekrar</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }}>🔒</span> {/* Kilit ikonu */}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : 'Kayıt Ol'}
          </button>

          <div className="login-links">
            <RouterLink to="/login" className="login-link">
              Zaten hesabınız var mı? Giriş yapın
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;