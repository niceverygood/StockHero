'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isAdmin } from '@/lib/admin/config';
import { Menu, X, ShieldCheckIcon } from 'lucide-react';

const NAV_LINKS: { href: string; label: string; icon: string }[] = [
  { href: '/', label: '메인', icon: '🏠' },
  { href: '/consult', label: 'AI 상담', icon: '💬' },
];


export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  
  // 관리자 여부 확인
  const userIsAdmin = isAdmin(user?.email);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="container-app py-3">
        <nav className="glass rounded-2xl px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <span className="text-white font-bold text-sm sm:text-base">S</span>
              </div>
              <span className="font-bold text-dark-50 group-hover:text-white transition-colors text-base sm:text-lg hidden sm:block whitespace-nowrap">
                StockHero
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 xl:px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive(link.href)
                      ? 'text-white bg-brand-500/20 border border-brand-500/30'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800/60'
                  }`}
                >
                  <span className="text-base">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
              
              {/* 관리자 메뉴 */}
              {userIsAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 xl:px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive('/admin')
                      ? 'text-red-400 bg-red-500/20 border border-red-500/30'
                      : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>관리자</span>
                </Link>
              )}
              
              <div className="ml-2 xl:ml-4 pl-2 xl:pl-4 border-l border-dark-700 flex items-center gap-2 xl:gap-3">
                <UserMenu />
              </div>
            </div>

            {/* Mobile/Tablet Menu Button & User Menu */}
            <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
              <UserMenu />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-dark-300 hover:text-white hover:bg-dark-800/60 rounded-xl transition-all"
                aria-label="메뉴 열기"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-dark-700/50">
              <div className="grid grid-cols-2 gap-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                      isActive(link.href)
                        ? 'text-white bg-brand-500/20 border border-brand-500/30'
                        : 'text-dark-300 hover:text-white hover:bg-dark-800/60 border border-dark-800/50'
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
                
                {/* 관리자 메뉴 (관리자만) */}
                {userIsAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2 col-span-2 whitespace-nowrap ${
                      isActive('/admin')
                        ? 'text-red-400 bg-red-500/20 border border-red-500/30'
                        : 'text-red-400/70 hover:text-red-400 border border-red-500/20'
                    }`}
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>관리자</span>
                  </Link>
                )}
              </div>
              
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
