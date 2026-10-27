import React, { useEffect } from 'react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`toast-popup ${isError ? 'toast-error' : 'toast-success'}`}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.9rem 1.4rem',
        borderRadius: 'var(--radius-sm)',
        background: isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
        color: '#ffffff',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.9rem',
        fontWeight: 600,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${isError ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
      }}
    >
      <i className={`fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          marginLeft: '0.5rem',
          opacity: 0.8,
        }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};
