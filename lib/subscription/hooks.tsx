// =====================================================
// StockHero 구독 시스템 React 훅
// =====================================================

'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
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
  checkFeatureAccess, 
  checkUsageLimitByPlan,
  getUpgradeMessage,
  getRecommendedPlan,
  PLAN_DISPLAY_NAMES
} from './utils';

// Supabase 클라이언트 (브라우저용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 기본 무료 플랜
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

// =====================================================
// 구독 컨텍스트
// =====================================================

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({ isOpen: false });

  // 구독 정보 새로고침
  const refreshSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCurrentPlan(DEFAULT_FREE_PLAN);
        setSubscription(null);
        setUsage(null);
        return;
      }

      // 구독 정보 조회
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'trial'])
        .gt('current_period_end', new Date().toISOString())
        .single();

      if (subError && subError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw subError;
      }

      if (subData) {
        setSubscription(subData);
        setCurrentPlan(subData.plan || DEFAULT_FREE_PLAN);
      } else {
        // 구독이 없으면 무료 플랜
        setCurrentPlan(DEFAULT_FREE_PLAN);
        setSubscription(null);
      }

      // 오늘 사용량 조회
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setUsage(usageData || {
        id: '',
        userId: user.id,
        date: today,
        aiConsultationsUsed: 0,
        debatesWatched: 0,
        reportsDownloaded: 0,
        portfolioAnalyses: 0,
        createdAt: '',
        updatedAt: '',
      });

    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      setCurrentPlan(DEFAULT_FREE_PLAN);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    refreshSubscription();

    // 인증 상태 변경 감지
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      refreshSubscription();
    });

    return () => {
      authSub.unsubscribe();
    };
  }, [refreshSubscription]);

  // 기능 접근 체크
  const checkAccess = useCallback((feature: FeatureType): boolean => {
    const planName = currentPlan?.name || 'free';
    return checkFeatureAccess(planName, feature);
  }, [currentPlan]);

  // 사용량 한도 체크
  const checkUsageLimit = useCallback((feature: FeatureType): UsageLimitResult => {
    const planName = currentPlan?.name || 'free';
    let currentUsage = 0;

    if (usage) {
      switch (feature) {
        case 'ai_consultations':
          currentUsage = usage.aiConsultationsUsed;
          break;
        case 'debates':
          currentUsage = usage.debatesWatched;
          break;
        case 'reports':
          currentUsage = usage.reportsDownloaded;
          break;
        case 'portfolio_analyses':
          currentUsage = usage.portfolioAnalyses;
          break;
      }
    }

    return checkUsageLimitByPlan(planName, feature, currentUsage);
  }, [currentPlan, usage]);

  // 사용량 증가
  const incrementUsage = useCallback(async (feature: FeatureType): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 한도 체크
      const limit = checkUsageLimit(feature);
      if (!limit.allowed) {
        openUpgradeModal(feature);
        return false;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // UPSERT로 사용량 증가
      const columnMap: Record<string, string> = {
        ai_consultations: 'ai_consultations_used',
        debates: 'debates_watched',
        reports: 'reports_downloaded',
        portfolio_analyses: 'portfolio_analyses',
      };

      const column = columnMap[feature];
      if (!column) return false;

      // 먼저 기존 레코드 확인
      const { data: existing } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existing) {
        // 업데이트
        await supabase
          .from('subscription_usage')
          .update({ [column]: (existing as any)[column] + 1 })
          .eq('user_id', user.id)
          .eq('date', today);
      } else {
        // 새로 생성
        await supabase
          .from('subscription_usage')
          .insert({
            user_id: user.id,
            date: today,
            [column]: 1,
          });
      }

      // 로컬 상태 업데이트
      setUsage(prev => prev ? {
        ...prev,
        [column.replace(/_/g, '')]: (prev as any)[column.replace(/_/g, '')] + 1,
      } : prev);

      return true;
    } catch (err) {
      console.error('Failed to increment usage:', err);
      return false;
    }
  }, [checkUsageLimit]);

  // 업그레이드 모달
  const openUpgradeModal = useCallback((feature?: FeatureType, message?: string) => {
    setUpgradeModal({
      isOpen: true,
      feature,
      message: message || (feature ? getUpgradeMessage(feature) : undefined),
      recommendedPlan: feature ? getRecommendedPlan(feature) : 'basic',
    });
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({ isOpen: false });
  }, []);

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
    // Provider 없이 사용할 경우 기본값 반환
    return {
      currentPlan: DEFAULT_FREE_PLAN,
      subscription: null,
      usage: null,
      isLoading: false,
      error: null,
      refreshSubscription: async () => {},
      checkAccess: () => false,
      checkUsageLimit: () => ({ allowed: false, limit: 0, used: 0, remaining: 0 }),
      incrementUsage: async () => false,
      upgradeModal: { isOpen: false },
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
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
  
  const canAccess = useMemo(() => checkAccess(feature), [checkAccess, feature]);
  
  const openUpgrade = useCallback(() => {
    openUpgradeModal(feature);
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
  
  const limit = useMemo(() => checkUsageLimit(feature), [checkUsageLimit, feature]);
  
  const increment = useCallback(() => incrementUsage(feature), [incrementUsage, feature]);
  
  const openUpgrade = useCallback(() => {
    openUpgradeModal(feature);
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
    isOpen: upgradeModal.isOpen,
    feature: upgradeModal.feature,
    message: upgradeModal.message,
    recommendedPlan: upgradeModal.recommendedPlan,
    open: openUpgradeModal,
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
  
  const planName = currentPlan?.name || 'free';
  const displayName = PLAN_DISPLAY_NAMES[planName as keyof typeof PLAN_DISPLAY_NAMES] || '무료';
  const features = getPlanFeatures(planName);
  const isPremium = planName !== 'free';
  const isVip = planName === 'vip';
  
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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { plans, isLoading, error };
}
