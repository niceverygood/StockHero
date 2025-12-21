'use client';

import { ReactNode } from 'react';
import { useSubscription, useFeatureUsage } from '@/lib/subscription/hooks';
import { LockOverlay, UpgradePrompt, UsageBadge } from './UpgradePrompt';
import { FEATURE_LIMITS } from '@/lib/subscription/config';

interface FeatureGateProps {
  feature: keyof typeof FEATURE_LIMITS;
  children: ReactNode;
  requiredTier?: 'pro' | 'premium';
  showUsage?: boolean;
  trackUsage?: boolean;
  fallback?: ReactNode;
  onBlock?: () => void;
}

/**
 * FeatureGate - 구독 기반 기능 접근 제어 컴포넌트
 * 
 * @param feature - 기능 키 (FEATURE_LIMITS에 정의된 키)
 * @param children - 접근 가능할 때 보여줄 컨텐츠
 * @param requiredTier - 필요한 최소 구독 티어 (기본: 자동 감지)
 * @param showUsage - 사용량 배지 표시 여부
 * @param trackUsage - 사용량 추적 여부 (렌더링 시 자동 증가)
 * @param fallback - 접근 불가 시 보여줄 컨텐츠 (기본: LockOverlay)
 * @param onBlock - 접근 차단 시 콜백
 */
export function FeatureGate({
  feature,
  children,
  requiredTier,
  showUsage = false,
  fallback,
}: FeatureGateProps) {
  const { hasAccess, isPro, isPremium, isLoading } = useSubscription();
  const { currentUsage, limit, canUse, isLoading: usageLoading } = useFeatureUsage(feature);

  // 로딩 중
  if (isLoading || usageLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-dark-700 rounded-lg h-32 w-full" />
      </div>
    );
  }

  // 기능 접근 권한 확인
  const hasFeatureAccess = hasAccess(feature);

  // 티어 요구사항 확인
  const meetsRequiredTier = !requiredTier || 
    (requiredTier === 'pro' && isPro) || 
    (requiredTier === 'premium' && isPremium);

  // 접근 불가 - 티어 부족
  if (!meetsRequiredTier || !hasFeatureAccess) {
    const tierRequired = requiredTier || (isPro ? 'premium' : 'pro');
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <LockOverlay requiredTier={tierRequired}>
        {children}
      </LockOverlay>
    );
  }

  // 접근 불가 - 사용량 초과
  if (!canUse && limit > 0) {
    return (
      <div className="space-y-4">
        <UpgradePrompt
          feature={FEATURE_LIMITS[feature]?.name || feature}
          requiredTier={isPro ? 'premium' : 'pro'}
          currentUsage={currentUsage}
          limit={limit}
        />
        {fallback || (
          <LockOverlay requiredTier={isPro ? 'premium' : 'pro'}>
            {children}
          </LockOverlay>
        )}
      </div>
    );
  }

  // 접근 가능
  return (
    <div className="relative">
      {showUsage && limit !== -1 && (
        <div className="absolute top-2 right-2 z-10">
          <UsageBadge currentUsage={currentUsage} limit={limit} />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * withFeatureGate - HOC 버전
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: keyof typeof FEATURE_LIMITS,
  options?: Omit<FeatureGateProps, 'feature' | 'children'>
) {
  return function WithFeatureGate(props: P) {
    return (
      <FeatureGate feature={feature} {...options}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

/**
 * useFeatureGate - 훅 버전 (프로그래밍 방식 접근 제어)
 */
export function useFeatureGate(feature: keyof typeof FEATURE_LIMITS) {
  const { hasAccess, isPro, isPremium, tier } = useSubscription();
  const { currentUsage, limit, canUse, increment, remaining } = useFeatureUsage(feature);

  return {
    // 접근 가능 여부
    canAccess: hasAccess(feature) && canUse,
    
    // 사용량 정보
    currentUsage,
    limit,
    remaining,
    
    // 사용량 증가 (사용 전 호출)
    use: increment,
    
    // 구독 정보
    tier,
    isPro,
    isPremium,
    
    // 업그레이드 필요 여부
    needsUpgrade: !hasAccess(feature) || !canUse,
    
    // 필요한 티어
    requiredTier: !hasAccess(feature) 
      ? (isPro ? 'premium' : 'pro') 
      : null,
  };
}

