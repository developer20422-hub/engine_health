import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PinwheelLogo } from './PinwheelLogo';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ badge = 'SYSTEM V2' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="nav-header">
      <div className="container nav-container">
        <Link to="/" className="brand-logo" id="brand-logo-link">
          <span className="brand-text">LUBRI</span>
          <PinwheelLogo size={24} />
          <span className="brand-text">SPEC</span>
          <span className="brand-badge">{badge}</span>
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              <i className="fa-solid fa-house" style={{ marginRight: '0.4rem' }}></i>
              Overview
            </Link>
          </li>
          <li>
            <Link
              to="/calculator"
              className={`nav-link ${isActive('/calculator') ? 'active' : ''}`}
            >
              <i className="fa-solid fa-calculator" style={{ marginRight: '0.4rem' }}></i>
              Diagnostic Bench
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              <i className="fa-solid fa-chart-line" style={{ marginRight: '0.4rem' }}></i>
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/reports"
              className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
            >
              <i className="fa-solid fa-file-csv" style={{ marginRight: '0.4rem' }}></i>
              Reports & Batches
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link
                to="/profile"
                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              >
                <i className="fa-solid fa-user-gear" style={{ marginRight: '0.4rem' }}></i>
                Profile & Fleet
              </Link>
            </li>
          )}
        </ul>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Link to="/profile" className="user-profile-badge" style={{ textDecoration: 'none' }} title="Manage Profile & Fleet Settings">
                <div className="user-avatar">
                  {user?.avatarUrl && user.avatarUrl.startsWith('http') ? (
                    <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    <i className={user?.avatarUrl || 'fa-solid fa-user-gear'}></i>
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#fff',
                    }}
                    id="logged-user-name"
                  >
                    {user?.name || user?.email?.split('@')[0] || 'Mechanic'}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: 'var(--amber-glow)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {user?.accountType === 'organisation' ? `${user?.role?.toUpperCase()} • GARAGE` : 'OPERATOR'}
                  </div>
                </div>
              </Link>

              <button
                id="btn-logout"
                className="btn-logout-pill"
                title="Logout session"
                onClick={handleLogout}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/calculator"
                className="btn-secondary"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem' }}
              >
                <i className="fa-solid fa-calculator" style={{ marginRight: '0.4rem' }}></i>
                Bench
              </Link>
              <Link
                to="/login"
                className="btn-primary"
                style={{ padding: '0.55rem 1.3rem', fontSize: '0.82rem' }}
              >
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '0.4rem' }}></i>
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
