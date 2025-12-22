import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          borderRadius: '40px',
        }}
      >
        {/* Main icon container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Shield with chart */}
          <svg
            width="120"
            height="130"
            viewBox="0 0 120 130"
            fill="none"
          >
            {/* Outer glow */}
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="shieldGradient" x1="60" y1="5" x2="60" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6" />
                <stop offset="0.5" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="chartGradient" x1="30" y1="85" x2="90" y2="35" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" />
                <stop offset="1" stopColor="#34d399" />
              </linearGradient>
            </defs>
            
            {/* Shield background */}
            <path
              d="M60 5L10 22V58C10 90 30 115 60 125C90 115 110 90 110 58V22L60 5Z"
              fill="url(#shieldGradient)"
              filter="url(#glow)"
            />
            
            {/* Inner shield highlight */}
            <path
              d="M60 15L20 28V58C20 84 36 105 60 113C84 105 100 84 100 58V28L60 15Z"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            
            {/* Stock chart line */}
            <path
              d="M28 85L45 65L60 75L92 35"
              stroke="url(#chartGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            
            {/* Arrow head */}
            <path
              d="M80 35H92V47"
              stroke="#22d3ee"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Sparkle effects */}
            <circle cx="92" cy="35" r="4" fill="#fff" opacity="0.8" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}



