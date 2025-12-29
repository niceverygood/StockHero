import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'StockHero - AI Stock Analysis';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          position: 'relative',
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
          }}
        />
        
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
          }}
        >
          {/* Shield icon */}
          <svg
            width="200"
            height="220"
            viewBox="0 0 120 130"
            fill="none"
          >
            <defs>
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
            
            <path
              d="M60 5L10 22V58C10 90 30 115 60 125C90 115 110 90 110 58V22L60 5Z"
              fill="url(#shieldGradient)"
            />
            
            <path
              d="M28 85L45 65L60 75L92 35"
              stroke="url(#chartGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <path
              d="M80 35H92V47"
              stroke="#22d3ee"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <circle cx="92" cy="35" r="5" fill="#fff" opacity="0.9" />
          </svg>
          
          {/* Text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-2px',
              }}
            >
              StockHero
            </div>
            <div
              style={{
                fontSize: '28px',
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '2px',
              }}
            >
              AI STOCK ANALYSIS
            </div>
          </div>
        </div>
        
        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            display: 'flex',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🔍</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px' }}>Claude</div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '24px' }}>×</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🚀</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px' }}>Gemini</div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '24px' }}>×</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🏛️</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px' }}>GPT</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}




