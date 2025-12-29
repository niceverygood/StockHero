'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/config';

interface UpgradePromptProps {
  feature: string;
  requiredTier: 'pro' | 'premium';
  currentUsage?: number;
  limit?: number;
}

export function UpgradePrompt({ 
  feature, 
  requiredTier, 
  currentUsage, 
  limit 
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === requiredTier);

  if (dismissed || !plan) return null;

  return (
    <div className="bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl p-6 border border-brand-500/30 relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative">
        {/* 닫기 버튼 */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-0 right-0 text-dark-500 hover:text-dark-300 transition-colors"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="text-4xl">{plan.icon}</div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-dark-100 mb-1">
              {feature}은(는) {plan.nameKo} 전용 기능입니다
            </h3>
            {currentUsage !== undefined && limit !== undefined && (
              <p className="text-dark-400 text-sm">
                오늘 사용: {currentUsage}/{limit}회 · 더 많은 기능을 원하시면 업그레이드하세요
              </p>
            )}
          </div>

          <Link
            href="/subscription"
            className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl whitespace-nowrap bg-gradient-to-r ${plan.gradient}`}
          >
            {plan.nameKo} 구독하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// 잠금 오버레이 컴포넌트
interface LockOverlayProps {
  requiredTier: 'pro' | 'premium';
  children: React.ReactNode;
}

export function LockOverlay({ requiredTier, children }: LockOverlayProps) {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === requiredTier);

  return (
    <div className="relative">
      {/* 블러 처리된 컨텐츠 */}
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>

      {/* 잠금 오버레이 */}
      <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-bold text-dark-100 mb-2">
            {plan?.nameKo || 'Pro'} 전용 기능
          </h3>
          <p className="text-dark-400 mb-6">
            이 기능을 이용하시려면 구독이 필요합니다
          </p>
          <Link
            href="/subscription"
            className={`inline-block px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl bg-gradient-to-r ${plan?.gradient || 'from-brand-500 to-brand-600'}`}
          >
            구독하고 잠금 해제 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// 사용량 표시 배지
interface UsageBadgeProps {
  currentUsage: number;
  limit: number;
  feature?: string;
}

export function UsageBadge({ currentUsage, limit, feature }: UsageBadgeProps) {
  const isUnlimited = limit === -1;
  const isNearLimit = !isUnlimited && currentUsage >= limit * 0.8;
  const isAtLimit = !isUnlimited && currentUsage >= limit;

  if (isUnlimited) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-500/20 text-brand-400 rounded-full text-sm">
        ∞ 무제한
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
        isAtLimit
          ? 'bg-red-500/20 text-red-400'
          : isNearLimit
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-dark-700 text-dark-400'
      }`}
    >
      {feature && <span>{feature}:</span>}
      <span className="font-bold">{currentUsage}</span>
      <span>/</span>
      <span>{limit}</span>
      {isAtLimit && <span className="ml-1">⚠️</span>}
    </span>
  );
}

// 업그레이드 배너
export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-brand-500 to-purple-500 text-white py-2 px-4 text-center relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
      <span className="mr-2">🎁</span>
      <span className="font-medium">첫 달 50% 할인!</span>
      <Link
        href="/subscription"
        className="ml-2 underline font-bold hover:no-underline"
      >
        지금 구독하기 →
      </Link>
    </div>
  );
}




