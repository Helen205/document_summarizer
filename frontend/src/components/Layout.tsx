// src/components/Layout.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Dropdown'ın dışına tıklamayı algılamak için useRef kullanıyoruz
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Genel tıklama dinleyicisi
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Kullanıcı menüsünü kapat
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }

      // Mobil menüyü kapat
      const mobileMenuButton = document.querySelector('.mobile-menu-btn');
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        (!mobileMenuButton || !mobileMenuButton.contains(event.target as Node))
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', path: '/', icon: '🏠' },
    { text: 'Dokümanlar', path: '/documents', icon: '📁' },
    { text: 'Arama', path: '/search', icon: '🔍' },
    { text: 'Profil', path: '/profile', icon: '⚙️' }
  ];

  const isActive = (path: string) => location.pathname === path;

  // Avatar için baş harfleri hesapla
  const getInitials = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ').filter(p => p.length > 0);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return '';
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <a href="/" className="logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>DMS</a>

          {/* Desktop Navigation */}
          <nav className="nav desktop-nav">
            {menuItems.map((item) => (
              <a
                key={item.text}
                href={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.text}
              </a>
            ))}
          </nav>

          {/* User Menu */}
          <div className="user-menu" ref={userMenuRef}>
            <button
              className="user-menu-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {user?.profile_picture_url ? (
                <img src={user.profile_picture_url} alt="User Avatar" className="user-avatar-thumb" />
              ) : (
                <div className="user-avatar-thumb initials-avatar">
                  {getInitials(user?.full_name || user?.username)}
                </div>
              )}
              <span className="user-name">
                {user?.full_name || user?.username || 'Kullanıcı'}
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {userMenuOpen && (
              <div className="dropdown-menu animate-fade-in">
                <div className="dropdown-header">
                  {user?.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt="User Avatar" className="dropdown-avatar" />
                  ) : (
                    <div className="dropdown-avatar initials-avatar">
                      {getInitials(user?.full_name || user?.username)}
                    </div>
                  )}
                  <div className="user-details">
                    <div className="user-name-full">{user?.full_name || 'Kullanıcı'}</div>
                    <div className="user-email">{user?.email}</div>
                  </div>
                </div>
                <a
                  href="/profile"
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/profile');
                    setUserMenuOpen(false);
                  }}
                >
                  <span className="dropdown-item-icon">⚙️</span> Profil Ayarları
                </a>
                {user?.role === 'admin' && (
                  <a
                    href="/admin"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/admin');
                      setUserMenuOpen(false);
                    }}
                  >
                    <span className="dropdown-item-icon">🔒</span> Yönetim Paneli
                  </a>
                )}
                <button
                  className="dropdown-item logout-item"
                  onClick={() => {
                    handleLogout();
                    setUserMenuOpen(false);
                  }}
                >
                  <span className="dropdown-item-icon">🚪</span> Çıkış Yap
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button (Hamburger) */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-nav animate-slide-down" ref={mobileMenuRef}>
          {menuItems.map((item) => (
            <a
              key={item.text}
              href={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.text}
            </a>
          ))}
          <button
            className="mobile-nav-link logout-item"
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-icon">🚪</span> Çıkış Yap
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;