'use client';

import { ReactNode } from 'react';
import { useCurrentPlan } from '@/lib/subscription/hooks';
import { LockOverlay, UpgradePrompt, UsageBadge } from './UpgradePrompt';
import { FEATURE_LIMITS, SUBSCRIPTION_ENABLED, canAccessFeature, getFeatureLimit, type SubscriptionTier } from '@/lib/subscription/config';

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
  const { planName, isPremium, isVip, isLoading } = useCurrentPlan();
  const tier = (planName || 'free') as SubscriptionTier;

  // 구독 기능 비활성화 시 바로 children 렌더링
  if (!SUBSCRIPTION_ENABLED) {
    return <>{children}</>;
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-dark-700 rounded-lg h-32 w-full" />
      </div>
    );
  }

  // 기능 접근 권한 확인
  const hasFeatureAccess = canAccessFeature(tier, feature);
  const featureLimit = getFeatureLimit(tier, feature);
  const isPro = planName === 'pro' || planName === 'vip';

  // 티어 요구사항 확인
  const meetsRequiredTier = !requiredTier || 
    (requiredTier === 'pro' && isPro) || 
    (requiredTier === 'premium' && (isPremium || isPro));

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

  // 접근 가능
  return (
    <div className="relative">
      {showUsage && featureLimit !== -1 && (
        <div className="absolute top-2 right-2 z-10">
          <UsageBadge currentUsage={0} limit={featureLimit} />
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
  const { planName, isPremium, isVip, isLoading } = useCurrentPlan();
  const tier = (planName || 'free') as SubscriptionTier;

  // 구독 기능 비활성화 시 모든 기능 허용
  if (!SUBSCRIPTION_ENABLED) {
    return {
      canAccess: true,
      currentUsage: 0,
      limit: -1,
      remaining: Infinity,
      use: async () => true,
      tier: 'premium' as const,
      isPro: true,
      isPremium: true,
      needsUpgrade: false,
      requiredTier: null,
    };
  }

  const hasFeatureAccess = canAccessFeature(tier, feature);
  const featureLimit = getFeatureLimit(tier, feature);
  const isPro = planName === 'pro' || planName === 'vip';

  return {
    // 접근 가능 여부
    canAccess: hasFeatureAccess,
    
    // 사용량 정보
    currentUsage: 0,
    limit: featureLimit,
    remaining: featureLimit === -1 ? Infinity : featureLimit,
    
    // 사용량 증가 (사용 전 호출) - 서버에서 처리
    use: async () => true,
    
    // 구독 정보
    tier: planName,
    isPro,
    isPremium,
    
    // 업그레이드 필요 여부
    needsUpgrade: !hasFeatureAccess,
    
    // 필요한 티어
    requiredTier: !hasFeatureAccess 
      ? (isPro ? 'premium' : 'pro') 
      : null,
  };
}

