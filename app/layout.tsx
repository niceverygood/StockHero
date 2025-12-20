import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f172a' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'StockHero | AI Stock Analysis',
  description: 'Watch Claude, Gemini, and GPT debate stocks in real-time. Entertainment-focused financial content with AI-powered analysis.',
  keywords: ['AI', 'Stock', 'Analysis', 'Claude', 'Gemini', 'GPT', 'Investment', '주식', 'AI분석'],
  authors: [{ name: 'StockHero' }],
  creator: 'StockHero',
  publisher: 'StockHero',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'StockHero | AI Stock Analysis',
    description: 'Watch Claude, Gemini, and GPT debate stocks in real-time. Entertainment-focused financial content.',
    url: '/',
    siteName: 'StockHero',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockHero | AI Stock Analysis',
    description: 'Watch Claude, Gemini, and GPT debate stocks in real-time.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${spaceGrotesk.variable} dark`}>
      <body className="bg-dark-950 text-dark-100 antialiased selection:bg-brand-500/30 font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
