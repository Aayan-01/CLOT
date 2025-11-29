import React from 'react';

const CameraIcon: React.FC = () => {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left photo card */}
      <g transform="translate(15, 30) rotate(-12)">
        <rect
          x="0"
          y="0"
          width="32"
          height="40"
          rx="3"
          fill="white"
          stroke="#E0E0E0"
          strokeWidth="2"
        />
        <circle cx="10" cy="10" r="3" fill="#D0D0D0" />
        <circle cx="10" cy="10" r="1.5" fill="#999999" />
        <rect x="6" y="20" width="20" height="2" rx="1" fill="#E0E0E0" />
        <rect x="6" y="26" width="14" height="2" rx="1" fill="#E0E0E0" />
      </g>

      {/* Center photo card */}
      <g transform="translate(44, 25)">
        <rect
          x="0"
          y="0"
          width="32"
          height="40"
          rx="3"
          fill="white"
          stroke="#CCCCCC"
          strokeWidth="2.5"
        />
        <path d="M8 14 L12 18 L16 14 L20 18 L24 12 L24 32 L8 32 Z" fill="#E5E5E5" />
        <circle cx="13" cy="10" r="2.5" fill="#B0B0B0" />
        <circle cx="13" cy="10" r="1" fill="#666666" />
      </g>

      {/* Right photo card */}
      <g transform="translate(73, 30) rotate(12)">
        <rect
          x="0"
          y="0"
          width="32"
          height="40"
          rx="3"
          fill="white"
          stroke="#E0E0E0"
          strokeWidth="2"
        />
        <circle cx="22" cy="10" r="3" fill="#999999" />
        <rect x="6" y="20" width="20" height="2" rx="1" fill="#E0E0E0" />
        <rect x="6" y="26" width="16" height="2" rx="1" fill="#E0E0E0" />
      </g>
    </svg>
  );
};

export default CameraIcon;
