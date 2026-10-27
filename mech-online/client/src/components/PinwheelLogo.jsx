import React from 'react';

export const PinwheelLogo = ({ size = 24, className = 'pinwheel-icon', style = {} }) => {
  return (
    <svg
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 12L7 2H12L12 12Z" fill="#ffaa00" />
      <path d="M12 12L22 7V12L12 12Z" fill="#ff6600" />
      <path d="M12 12L17 22H12L12 12Z" fill="#ffaa00" />
      <path d="M12 12L2 17V12L12 12Z" fill="#ff6600" />
    </svg>
  );
};
