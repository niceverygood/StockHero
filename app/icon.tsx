import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '8px',
        }}
      >
        {/* Shield shape with stock chart */}
        <svg
          width="26"
          height="28"
          viewBox="0 0 26 28"
          fill="none"
        >
          {/* Shield background */}
          <path
            d="M13 1L2 5V13C2 19.5 6.5 25.5 13 27C19.5 25.5 24 19.5 24 13V5L13 1Z"
            fill="url(#shieldGradient)"
            stroke="#22d3ee"
            strokeWidth="1.5"
          />
          {/* Upward chart line */}
          <path
            d="M6 18L10 14L14 16L20 8"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow head */}
          <path
            d="M17 8H20V11"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="shieldGradient" x1="13" y1="1" x2="13" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e40af" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}



