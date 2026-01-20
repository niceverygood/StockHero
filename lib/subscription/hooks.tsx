// =====================================================
// StockHero 구독 시스템 React 훅
// =====================================================
// ⚠️ 현재 무료 모드로 설정됨 - 모든 기능 제한 없이 이용 가능

'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import type { 
  SubscriptionPlan, 
  UserSubscription, 
  SubscriptionUsage, 
  FeatureType, 
  UsageLimitResult,
  UpgradeModalState,
  SubscriptionContextValue,
  PlanFeatures
} from '@/types/subscription';
import { 
  getPlanFeatures, 
  PLAN_DISPLAY_NAMES
} from './utils';

// =====================================================
// 🆓 무료 모드 설정 - 모든 기능 활성화
// =====================================================
const FREE_MODE = true; // true면 모든 기능 무료 이용 가능

// Pro 플랜으로 설정 (모든 기능 활성화)
const DEFAULT_PRO_PLAN: SubscriptionPlan = {
  id: 'free-mode-pro',
  name: 'pro',
  displayName: 'Pro (무료 체험)',
  priceMonthly: 0,
  priceYearly: 0,
  features: getPlanFeatures('pro'),
  isActive: true,
  sortOrder: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 기본 무료 플랜 (백업용)
const DEFAULT_FREE_PLAN: SubscriptionPlan = {
  id: 'free-default',
  name: 'free',
  displayName: '무료',
  priceMonthly: 0,
  priceYearly: 0,
  features: getPlanFeatures('free'),
  isActive: true,
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 현재 적용할 기본 플랜
const CURRENT_DEFAULT_PLAN = FREE_MODE ? DEFAULT_PRO_PLAN : DEFAULT_FREE_PLAN;

// =====================================================
// 구독 컨텍스트
// =====================================================

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(CURRENT_DEFAULT_PLAN);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({ isOpen: false });

  // 구독 정보 새로고침 (무료 모드에서는 즉시 Pro 반환)
  const refreshSubscription = useCallback(async () => {
    if (FREE_MODE) {
      setCurrentPlan(DEFAULT_PRO_PLAN);
      setSubscription(null);
      setUsage(null);
      setIsLoading(false);
      return;
    }
    // 기존 Supabase 로직은 유료 모드 활성화 시 사용
    setCurrentPlan(DEFAULT_FREE_PLAN);
    setIsLoading(false);
  }, []);

  // 초기 로드
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // 기능 접근 체크 (무료 모드에서는 항상 true)
  const checkAccess = useCallback((feature: FeatureType): boolean => {
    if (FREE_MODE) return true;
    return false;
  }, []);

  // 사용량 한도 체크 (무료 모드에서는 무제한)
  const checkUsageLimit = useCallback((feature: FeatureType): UsageLimitResult => {
    if (FREE_MODE) {
      return {
        allowed: true,
        limit: 9999,
        used: 0,
        remaining: 9999,
      };
    }
    return { allowed: false, limit: 0, used: 0, remaining: 0 };
  }, []);

  // 사용량 증가 (무료 모드에서는 항상 성공)
  const incrementUsage = useCallback(async (feature: FeatureType): Promise<boolean> => {
    if (FREE_MODE) return true;
    return false;
  }, []);

  // 업그레이드 모달 (무료 모드에서는 사용 안 함)
  const openUpgradeModal = useCallback((feature?: FeatureType, message?: string) => {
    if (FREE_MODE) return; // 무료 모드에서는 업그레이드 모달 표시 안 함
    setUpgradeModal({
      isOpen: true,
      feature,
      message,
      recommendedPlan: 'basic',
    });
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({ isOpen: false });
  }, []);

  // 무료 모드에서는 항상 Pro
  const isPro = FREE_MODE ? true : (currentPlan?.name === 'pro' || currentPlan?.name === 'vip');
  const isPremium = FREE_MODE ? true : (currentPlan?.name === 'basic' || isPro);
  
  const hasAccess = checkAccess;

  const value: SubscriptionContextValue = {
    currentPlan,
    subscription,
    usage,
    isLoading,
    error,
    refreshSubscription,
    checkAccess,
    checkUsageLimit,
    incrementUsage,
    upgradeModal,
    openUpgradeModal,
    closeUpgradeModal,
    hasAccess,
    isPro,
    isPremium,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// =====================================================
// 개별 훅들
// =====================================================

/**
 * 구독 정보 전체 조회
 */
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    // Provider 없이 사용할 경우 기본값 반환 (무료 모드)
    return {
      currentPlan: CURRENT_DEFAULT_PLAN,
      subscription: null,
      usage: null,
      isLoading: false,
      error: null,
      refreshSubscription: async () => {},
      checkAccess: () => FREE_MODE,
      hasAccess: () => FREE_MODE,
      checkUsageLimit: () => ({ 
        allowed: FREE_MODE, 
        limit: FREE_MODE ? 9999 : 0, 
        used: 0, 
        remaining: FREE_MODE ? 9999 : 0 
      }),
      incrementUsage: async () => FREE_MODE,
      upgradeModal: { isOpen: false },
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
      isPro: FREE_MODE,
      isPremium: FREE_MODE,
    };
  }
  
  return context;
}

/**
 * 특정 기능 접근 가능 여부 체크
 */
export function useCanAccess(feature: FeatureType): {
  canAccess: boolean;
  isLoading: boolean;
  openUpgrade: () => void;
} {
  const { checkAccess, isLoading, openUpgradeModal } = useSubscription();
  
  // useMemo는 항상 호출하고, FREE_MODE 체크는 내부에서 처리
  const canAccess = useMemo(() => {
    if (FREE_MODE) return true;
    return checkAccess(feature);
  }, [checkAccess, feature]);
  
  const openUpgrade = useCallback(() => {
    if (!FREE_MODE) openUpgradeModal(feature);
  }, [openUpgradeModal, feature]);
  
  return { canAccess, isLoading, openUpgrade };
}

/**
 * 사용량 한도 체크
 */
export function useUsageLimit(feature: FeatureType): {
  limit: UsageLimitResult;
  isLoading: boolean;
  increment: () => Promise<boolean>;
  openUpgrade: () => void;
} {
  const { checkUsageLimit, incrementUsage, isLoading, openUpgradeModal } = useSubscription();
  
  // useMemo는 항상 호출하고, FREE_MODE 체크는 내부에서 처리
  const limit = useMemo(() => {
    if (FREE_MODE) {
      return { allowed: true, limit: 9999, used: 0, remaining: 9999 };
    }
    return checkUsageLimit(feature);
  }, [checkUsageLimit, feature]);
  
  const increment = useCallback(() => {
    if (FREE_MODE) return Promise.resolve(true);
    return incrementUsage(feature);
  }, [incrementUsage, feature]);
  
  const openUpgrade = useCallback(() => {
    if (!FREE_MODE) openUpgradeModal(feature);
  }, [openUpgradeModal, feature]);
  
  return { limit, isLoading, increment, openUpgrade };
}

/**
 * 업그레이드 모달 상태 관리
 */
export function useUpgradeModal(): {
  isOpen: boolean;
  feature?: FeatureType;
  message?: string;
  recommendedPlan?: 'basic' | 'pro' | 'vip';
  open: (feature?: FeatureType, message?: string) => void;
  close: () => void;
} {
  const { upgradeModal, openUpgradeModal, closeUpgradeModal } = useSubscription();
  
  return {
    isOpen: FREE_MODE ? false : upgradeModal.isOpen, // 무료 모드에서는 항상 닫힘
    feature: upgradeModal.feature,
    message: upgradeModal.message,
    recommendedPlan: upgradeModal.recommendedPlan,
    open: FREE_MODE ? () => {} : openUpgradeModal,
    close: closeUpgradeModal,
  };
}

/**
 * 현재 플랜 정보만 조회
 */
export function useCurrentPlan(): {
  plan: SubscriptionPlan | null;
  planName: string;
  displayName: string;
  features: PlanFeatures;
  isLoading: boolean;
  isPremium: boolean;
  isVip: boolean;
} {
  const { currentPlan, isLoading } = useSubscription();
  
  // 무료 모드에서는 Pro로 표시
  const planName = FREE_MODE ? 'pro' : (currentPlan?.name || 'free');
  const displayName = FREE_MODE ? 'Pro (무료)' : (PLAN_DISPLAY_NAMES[planName as keyof typeof PLAN_DISPLAY_NAMES] || '무료');
  const features = getPlanFeatures(FREE_MODE ? 'pro' : planName);
  const isPremium = FREE_MODE ? true : (planName !== 'free');
  const isVip = FREE_MODE ? true : (planName === 'vip');
  
  return {
    plan: currentPlan,
    planName,
    displayName,
    features,
    isLoading,
    isPremium,
    isVip,
  };
}

/**
 * 플랜 목록 조회
 */
export function usePlans(): {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
} {
  // useState는 항상 호출 (React Hooks 규칙 준수)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 무료 모드에서는 빈 배열 반환 (플랜 선택 UI 숨김)
  if (FREE_MODE) {
    return {
      plans: [],
      isLoading: false,
      error: null,
    };
  }

  return { plans, isLoading, error };
}
