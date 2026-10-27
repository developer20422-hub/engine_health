import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyState = ({
  icon = 'fa-oil-well',
  title = 'No Inspection Records Found',
  description = 'No diagnostic evaluations have been recorded yet. Launch the Diagnostic Bench to perform your first engine oil test.',
  actionText = 'Open Diagnostic Bench',
  actionLink = '/calculator',
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-glass)',
        margin: '1.5rem 0',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(255, 136, 0, 0.1)',
          border: '1px solid var(--border-amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: 'var(--amber-glow)',
          fontSize: '1.75rem',
        }}
      >
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.25rem',
          color: '#ffffff',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          maxWidth: '480px',
          margin: '0 auto 1.5rem',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      {actionText && actionLink && (
        <Link to={actionLink} className="btn-primary" style={{ display: 'inline-flex', padding: '0.65rem 1.4rem' }}>
          <i className="fa-solid fa-plus" style={{ marginRight: '0.4rem' }}></i>
          {actionText}
        </Link>
      )}
    </div>
  );
};
