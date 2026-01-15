'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './UserMenu';

const NAV_LINKS: { href: string; label: string; icon: string }[] = [
  { href: '/', label: '오늘의 Top 5', icon: '🏆' },
  { href: '/calendar', label: '추천 달력', icon: '📅' },
  { href: '/portfolio', label: '포폴 분석', icon: '📊' },
  { href: '/consult', label: 'AI 상담', icon: '💬' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="container-app py-3">
        <nav className="glass rounded-2xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <span className="text-white font-bold text-base">S</span>
              </div>
              <span className="font-bold text-dark-50 group-hover:text-white transition-colors text-lg hidden sm:block">
                StockHero
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2 ${
                    isActive(link.href)
                      ? 'text-white bg-brand-500/20 border border-brand-500/30'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800/60'
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <div className="ml-4 pl-4 border-l border-dark-700">
                <UserMenu />
              </div>
            </div>

            {/* Mobile Menu Button & User Menu */}
            <div className="flex md:hidden items-center gap-2">
              <UserMenu />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 text-dark-300 hover:text-white hover:bg-dark-800/60 rounded-xl transition-all"
                aria-label="메뉴 열기"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-dark-700/50">
              <div className="grid grid-cols-2 gap-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center gap-2 ${
                      isActive(link.href)
                        ? 'text-white bg-brand-500/20 border border-brand-500/30'
                        : 'text-dark-300 hover:text-white hover:bg-dark-800/60 border border-dark-800/50'
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
