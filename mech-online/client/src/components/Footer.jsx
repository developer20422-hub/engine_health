import React from 'react';
import { Link } from 'react-router-dom';
import { PinwheelLogo } from './PinwheelLogo';

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand-logo" style={{ fontSize: '1.15rem' }}>
            <span className="brand-text">LUBRI</span>
            <PinwheelLogo size={18} />
            <span className="brand-text">SPEC</span>
          </div>
          <div className="footer-academic-meta" style={{ marginTop: '0.4rem' }}>
            ML-based Project &bull; Engine Oil Health Analysis &bull; MERN Platform
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Link to="/" className="nav-link" style={{ fontSize: '0.85rem', color: 'var(--amber-glow)' }}>
            Return to Overview <i className="fa-solid fa-arrow-right" style={{ marginLeft: '0.3rem' }}></i>
          </Link>
        </div>
      </div>
    </footer>
  );
};
