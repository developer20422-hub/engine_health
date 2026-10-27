import React from 'react';

export const LoadingSkeleton = ({ height = '120px', width = '100%', style = {} }) => {
  return (
    <div
      style={{
        height,
        width,
        background: 'linear-gradient(90deg, #131217 25%, #1f1d26 50%, #131217 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.6s infinite ease-in-out',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    />
  );
};

export const CardSkeleton = () => (
  <div className="metric-hud-card" style={{ opacity: 0.7 }}>
    <LoadingSkeleton height="20px" width="60%" style={{ marginBottom: '12px' }} />
    <LoadingSkeleton height="40px" width="40%" style={{ marginBottom: '12px' }} />
    <LoadingSkeleton height="16px" width="80%" />
  </div>
);
