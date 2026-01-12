'use client';

import { useState, useEffect } from 'react';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { useAuth } from '@/lib/contexts/AuthContext';

interface WatchlistButtonProps {
  symbolCode: string;
  symbolName: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function WatchlistButton({
  symbolCode,
  symbolName,
  size = 'md',
  showLabel = false,
  className = '',
}: WatchlistButtonProps) {
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist, loading } = useWatchlist();
  const [isAdded, setIsAdded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAdded(isInWatchlist(symbolCode));
  }, [isInWatchlist, symbolCode]);

  const handleClick = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsAnimating(true);
    const success = await toggleWatchlist(symbolCode, symbolName);
    
    if (success) {
      setIsAdded(!isAdded);
    }

    setTimeout(() => setIsAnimating(false), 300);
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        rounded-lg
        transition-all duration-200
        ${isAdded
          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          : 'bg-dark-800/50 text-dark-400 hover:text-amber-400 hover:bg-dark-800'
        }
        ${isAnimating ? 'scale-110' : 'scale-100'}
        ${className}
        flex items-center gap-2
      `}
      title={isAdded ? '관심 종목에서 제거' : '관심 종목에 추가'}
    >
      <svg
        className={`${iconSizes[size]} transition-transform ${isAnimating ? 'scale-125' : ''}`}
        fill={isAdded ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={isAdded ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      {showLabel && (
        <span className="text-sm font-medium">
          {isAdded ? '관심 종목' : '관심 등록'}
        </span>
      )}
    </button>
  );
}








