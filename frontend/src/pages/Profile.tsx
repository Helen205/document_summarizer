import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api'; // Axios instance'ınız

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  profile_picture_url?: string; // Profil resmi URL'si için alan
}

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // İşlem durumları
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    newPasswordConfirm: ''
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null); // Seçilen profil resmi dosyası
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null); // Profil resmi önizlemesi (URL.createObjectURL veya gerçek URL)

  // Profil verisini çekme işlevi
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.get(`/api/v1/users/get/${user.id}`);
      const userData: UserProfile = response.data;
      setProfile(userData);
      setFormData(prev => ({
        ...prev,
        full_name: userData.full_name || '',
        email: userData.email || '',
        oldPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
      }));

      // Eğer kullanıcının mevcut profil resmi URL'si varsa, önizlemeyi buna ayarla
      if (userData.profile_picture_url) {
        setProfileImagePreview(userData.profile_picture_url);
      } else {
        setProfileImagePreview(null); // URL yoksa önizlemeyi temizle
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      setError(error.response?.data?.detail || 'Profil bilgileri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // user.id değiştiğinde fetchProfile'ı yeniden oluştur

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // fetchProfile useCallback olduğu için bağımlılık olarak eklenebilir

  // Profil resmini temizleme ve önizlemeyi kaldırma
  const clearProfileImage = () => {
    setSelectedProfileImage(null);
    setProfileImagePreview(profile?.profile_picture_url || null); // Temizlerken orijinaline dön veya null yap
    // Eğer bir resim seçiliyken silme işlemi yapılıp kaydedilmezse, bir sonraki yüklemede hala eski resmin görünmesi istenebilir.
    // Ya da tamamen sıfırlamak istiyorsanız: setProfileImagePreview(null);
    setError(''); // Hata mesajlarını temizle
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Boyut kontrolü (örnek: 5MB)
      const maxFileSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxFileSize) {
        setError('Profil resmi boyutu 5MB\'tan küçük olmalı.');
        setSelectedProfileImage(null);
        setProfileImagePreview(profile?.profile_picture_url || null); // Orijinal resme geri dön
        return;
      }
      // Uzantı kontrolü (örnek: sadece JPG/PNG)
      const allowedExtensions = ['image/jpeg', 'image/png'];
      if (!allowedExtensions.includes(file.type)) {
        setError('Sadece JPG veya PNG formatında resim yükleyebilirsiniz.');
        setSelectedProfileImage(null);
        setProfileImagePreview(profile?.profile_picture_url || null); // Orijinal resme geri dön
        return;
      }

      setSelectedProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file)); // Anlık önizleme için geçici URL oluştur
      setError(''); // Önceki hata mesajlarını temizle
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const updatePayload: any = {
      full_name: formData.full_name,
      email: formData.email
    };

    // Şifre değiştirme mantığı (mevcut haliyle iyi)
    if (showPasswordFields && (formData.oldPassword || formData.newPassword || formData.newPasswordConfirm)) {
      if (!formData.oldPassword || !formData.newPassword || !formData.newPasswordConfirm) {
        setError('Şifre değiştirmek için tüm şifre alanlarını doldurun.');
        setSaving(false);
        return;
      }
      if (formData.newPassword !== formData.newPasswordConfirm) {
        setError('Yeni şifreler eşleşmiyor.');
        setSaving(false);
        return;
      }
      if (formData.oldPassword === formData.newPassword) {
        setError('Yeni şifre, eski şifrenizden farklı olmalıdır.');
        setSaving(false);
        return;
      }
      if (formData.newPassword.length < 6) { // Minimum şifre uzunluğu kontrolü
        setError('Yeni şifre en az 6 karakter olmalıdır.');
        setSaving(false);
        return;
      }

      updatePayload.old_password = formData.oldPassword;
      updatePayload.password = formData.newPassword;
    }

    try {
      // 1. Önce profil bilgilerini güncelle
      const profileResponse = await api.put(`/api/v1/users/${user.id}`, updatePayload);
      let updatedUserData: UserProfile = profileResponse.data;

      // 2. Eğer yeni bir profil resmi seçildiyse, resmi yükle
      if (selectedProfileImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', selectedProfileImage);

        const imageUploadResponse = await api.post(`/api/v1/users/${user.id}/upload-profile-picture`, imageFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Backend'den başarılı bir yanıt geldiyse ve muhtemelen yeni URL döndürüyorsa kullanın.
        // Eğer backend tam URL döndürmüyorsa, statik dosya sunumuna göre kendiniz oluşturun.
        // Örneğin: `http://localhost:8000/uploads/${user.id}.jpg` gibi.
        // Backend'in `profile_picture_url` döndürdüğünü varsayalım:
        if (imageUploadResponse.data && imageUploadResponse.data.profile_picture_url) {
            updatedUserData.profile_picture_url = imageUploadResponse.data.profile_picture_url;
        } else {
            // Backend URL döndürmüyorsa, kendi statik yol kuralınıza göre oluşturun
            // API'nizin çalıştığı temel URL'yi burada belirtebilirsiniz.
            // Örneğin, "http://localhost:8000" veya "https://api.example.com"
            const baseUrl = api.defaults.baseURL || window.location.origin; // Axios base URL'sini kullan veya mevcut sayfanın origin'ini al
            const newExtension = selectedProfileImage.name.split('.').pop(); // Yüklenen dosyanın uzantısını al
            updatedUserData.profile_picture_url = `${baseUrl}/uploads/${user.id}.${newExtension}`;
        }
      } else if (profileImagePreview === null && profile?.profile_picture_url) {
          // Kullanıcı mevcut resmi kaldırmak isterse (yani profileImagePreview null ve önceden bir URL varsa)
          // Bu, backend'e resmi silmesi için özel bir istek göndermenizi gerektirebilir
          // Veya `upload-profile-picture` endpoint'ine boş dosya göndererek silme işlemi yaptırabilirsiniz.
          // Şimdilik varsayalım ki `selectedProfileImage` null ise ve `profileImagePreview` da null'a ayarlandıysa,
          // bu resmin silindiği anlamına gelir. Backend'in de bu durumu işlemesi gerekir.
          updatedUserData.profile_picture_url = undefined; // Veya null
      }


      // Güncellenmiş veriyi state'e ve AuthContext'e kaydet
      setProfile(updatedUserData);
      updateUser(updatedUserData); // Auth context'i de güncelle

      // Başarılı bir şekilde kaydedildiyse, önizlemeyi de gerçek URL'ye ayarla
      // Bu zaten profile_picture_url içinden geliyor olmalı, emin olmak için buraya da ekleyebiliriz.
      if (updatedUserData.profile_picture_url) {
          setProfileImagePreview(updatedUserData.profile_picture_url);
      } else {
          setProfileImagePreview(null);
      }
      setSelectedProfileImage(null); // Seçilen dosyayı sıfırla

      setSuccess('Profil bilgileri başarıyla güncellendi.');
      // Şifre alanlarını sıfırla
      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
      }));
      setShowPasswordFields(false);


    } catch (error: any) {
      setError(error.response?.data?.detail || 'Profil güncellenirken bir hata oluştu.');
      console.error('Profile update failed:', error);
      // Hata durumunda, seçilen resim önizlemesini eski haline getir
      setSelectedProfileImage(null);
      setProfileImagePreview(profile?.profile_picture_url || null);
    } finally {
      setSaving(false);
    }
  };

  // Avatar için baş harfleri hesapla
  const getInitials = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ').filter(p => p.length > 0);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return '';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ color: 'var(--secondary-color)', marginTop: '1rem' }}>Profil bilgileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 className="main-title">Profil Ayarları</h1>

      {error && (
        <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      <div className="grid-profile">
        {/* Sol taraftaki Profil Bilgileri ve Şifre Değiştirme */}
        <div className="card profile-card-left">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Hesap Bilgileri</h3>
          <div className="form-group">
            <label htmlFor="full_name" className="form-label">Ad Soyad</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="full_name"
                name="full_name"
                className="form-input"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={saving}
                style={{ paddingLeft: '2.5rem' }}
              />
              <span className="input-icon">👤</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">E-posta</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                disabled={saving}
                style={{ paddingLeft: '2.5rem' }}
              />
              <span className="input-icon">📧</span>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-icon-left"
            onClick={() => setShowPasswordFields(!showPasswordFields)}
            style={{ marginTop: '1.5rem' }}
          >
            {showPasswordFields ? (
              <>
                <span style={{ fontSize: '1.2rem' }}>🚫</span> Şifre Değiştirme Formunu Kapat
              </>
            ) : (
              <>
                <span style={{ fontSize: '1.2rem' }}>🔑</span> Şifreyi Değiştir
              </>
            )}
          </button>

          {showPasswordFields && (
            <div className="password-fields animate-fade-in">
              <h3 className="card-title" style={{ marginTop: '2.5rem', marginBottom: '1.5rem' }}>Şifre Değiştir</h3>
              <div className="form-group">
                <label htmlFor="oldPassword" className="form-label">Mevcut Şifre</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    id="oldPassword"
                    name="oldPassword"
                    className="form-input"
                    value={formData.oldPassword}
                    onChange={handleInputChange}
                    disabled={saving}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <span className="input-icon">🔐</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">Yeni Şifre</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    className="form-input"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    disabled={saving}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <span className="input-icon">✨</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="newPasswordConfirm" className="form-label">Yeni Şifre (Tekrar)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    id="newPasswordConfirm"
                    name="newPasswordConfirm"
                    className="form-input"
                    value={formData.newPasswordConfirm}
                    onChange={handleInputChange}
                    disabled={saving}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <span className="input-icon">✨</span>
                </div>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-icon-left"
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: showPasswordFields ? '2rem' : '1.5rem', width: '100%' }}
          >
            {saving ? <div className="spinner"></div> : '💾 Bilgileri Kaydet'}
          </button>
        </div>

        {/* Sağdaki Profil Özeti ve Resim Yükleme */}
        <div className="card profile-card-right">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Profil Özeti</h3>
          <div className="profile-summary-header">
            <div className="profile-avatar">
              {profileImagePreview ? (
                <img src={profileImagePreview} alt="Profil Resmi" className="avatar-img" />
              ) : (
                <span className="avatar-initials">{getInitials(profile?.full_name)}</span>
              )}
            </div>
            <div className="profile-info-text">
              <h3 className="profile-name">{profile?.full_name}</h3>
              <p className="profile-email">{profile?.email}</p>
            </div>
          </div>
          <div className="profile-picture-upload-section">
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '1rem', marginTop: '1.5rem' }}>Profil Resmi</h4>
            <input
              type="file"
              id="profile-image-upload"
              accept="image/jpeg,image/png" // Sadece JPG ve PNG'ye izin ver
              onChange={handleProfileImageChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="profile-image-upload" className="btn btn-secondary btn-icon-left" style={{ width: '100%' }}>
              <span style={{ fontSize: '1.2rem' }}>🖼️</span> Resim Seç
            </label>
            {selectedProfileImage && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>✅</span> {selectedProfileImage.name}
                </span>
                <button onClick={clearProfileImage} className="btn-clear-selection">
                  ✖️
                </button>
              </div>
            )}
            {/* Resim önizleme varsa, resmi kaldırma butonu ekleyebiliriz */}
            {profileImagePreview && !selectedProfileImage && ( // Seçili yeni resim yoksa ve önizleme varsa
              <button
                onClick={clearProfileImage}
                className="btn btn-danger btn-icon-left"
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                <span style={{ fontSize: '1.2rem' }}>🗑️</span> Profil Resmini Kaldır
              </button>
            )}

            <p className="small-text" style={{ marginTop: '0.75rem', color: 'var(--secondary-color)' }}>
              Yalnızca JPG veya PNG formatında, maksimum 5MB boyutunda resimler yükleyebilirsiniz.
            </p>
          </div>

          <hr className="divider" />

          <div className="profile-details-section">
            <div className="detail-item">
              <span className="detail-icon">📅</span>
              <div>
                <div className="detail-label">Üyelik Tarihi</div>
                <div className="detail-value">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </div>
              </div>
            </div>
            {profile?.last_login && (
              <div className="detail-item">
                <span className="detail-icon">⏰</span>
                <div>
                  <div className="detail-label">Son Giriş</div>
                  <div className="detail-value">
                    {new Date(profile.last_login).toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-icon">🎖️</span>
              <div>
                <div className="detail-label">Rol</div>
                <div className="detail-value" style={{ textTransform: 'capitalize' }}>
                  {profile?.role || 'Kullanıcı'}
                </div>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-icon">🟢</span>
              <div>
                <div className="detail-label">Hesap Durumu</div>
                <div className="detail-value">
                  {profile?.is_active ? 'Aktif' : 'Pasif'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;