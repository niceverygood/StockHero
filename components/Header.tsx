'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './UserMenu';

const NAV_LINKS: { href: string; label: string; highlight?: boolean }[] = [
  { href: '/verdict', label: 'Top 5' },
  { href: '/heroes', label: 'Stock Heros' },
  { href: '/us-stocks', label: '🇺🇸 US Stocks' },
  { href: '/themes', label: '🔥 Hot Themes' },
  { href: '/battle/005930', label: 'Watch Debate' },
  { href: '/consulting', label: 'Consulting' },
  { href: '/investment-style', label: '🧬 투자성향' },
  { href: '/subscription', label: '💎 구독', highlight: true },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="fixed top-[41px] left-0 right-0 z-40">
      <div className="container-app py-2 sm:py-4">
        <nav className="glass rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">S</span>
              </div>
              <span className="font-semibold text-dark-100 group-hover:text-white transition-colors text-sm sm:text-base">
                StockHero
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 lg:px-4 py-2 text-sm rounded-lg transition-all ${
                    link.highlight
                      ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium hover:opacity-90'
                      : isActive(link.href)
                      ? 'text-brand-400 bg-brand-500/10'
                      : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="ml-3 lg:ml-4 pl-3 lg:pl-4 border-l border-dark-700">
                <UserMenu />
              </div>
            </div>

            {/* Mobile Menu Button & User Menu */}
            <div className="flex md:hidden items-center gap-2">
              <UserMenu />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800/50 rounded-lg transition-all"
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
            <div className="md:hidden mt-3 pt-3 border-t border-dark-700/50">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2.5 text-sm rounded-lg transition-all ${
                      link.highlight
                        ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium'
                        : isActive(link.href)
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800/50'
                    }`}
                  >
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
