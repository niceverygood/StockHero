'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createBrowserClient } from '@/lib/supabase/client';
import { 
  SubscriptionTier, 
  SubscriptionPlan,
  SUBSCRIPTION_PLANS,
  canAccessFeature,
  getFeatureLimit,
  FEATURE_LIMITS,
} from './config';

interface SubscriptionState {
  tier: SubscriptionTier;
  status: string;
  plan: SubscriptionPlan;
  subscription: {
    billingCycle: 'monthly' | 'yearly';
    currentPeriodEnd: string | null;
  } | null;
  isLoading: boolean;
  error: string | null;
}

interface UsageState {
  [key: string]: {
    currentUsage: number;
    limit: number;
    canUse: boolean;
  };
}

// 액세스 토큰 가져오기 헬퍼
async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// 구독 정보 훅
export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    status: 'active',
    plan: SUBSCRIPTION_PLANS[0],
    subscription: null,
    isLoading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState({
        tier: 'free',
        status: 'active',
        plan: SUBSCRIPTION_PLANS[0],
        subscription: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setState({
        tier: data.tier,
        status: data.status,
        plan: data.plan,
        subscription: data.subscription,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // 기능 접근 가능 여부
  const hasAccess = useCallback(
    (feature: keyof typeof FEATURE_LIMITS): boolean => {
      return canAccessFeature(state.tier, feature);
    },
    [state.tier]
  );

  // 기능 제한 수 확인
  const getLimit = useCallback(
    (feature: keyof typeof FEATURE_LIMITS): number => {
      return getFeatureLimit(state.tier, feature);
    },
    [state.tier]
  );

  // Pro 이상인지 확인
  const isPro = state.tier === 'pro' || state.tier === 'premium';
  
  // Premium인지 확인
  const isPremium = state.tier === 'premium';

  return {
    ...state,
    hasAccess,
    getLimit,
    isPro,
    isPremium,
    refetch: fetchSubscription,
  };
}

// 기능 사용량 훅
export function useFeatureUsage(featureKey: string) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<{
    currentUsage: number;
    limit: number;
    canUse: boolean;
    isLoading: boolean;
  }>({
    currentUsage: 0,
    limit: 0,
    canUse: false,
    isLoading: true,
  });

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage({ currentUsage: 0, limit: 0, canUse: false, isLoading: false });
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`/api/subscription/usage?feature=${featureKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage({
          currentUsage: data.currentUsage,
          limit: data.limit,
          canUse: data.canUse,
          isLoading: false,
        });
      }
    } catch {
      setUsage(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, featureKey]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // 사용량 증가
  const increment = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await getAccessToken();
      if (!token) return false;

      const response = await fetch('/api/subscription/usage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(prev => ({
          ...prev,
          currentUsage: data.currentUsage,
          canUse: data.canUse,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user, featureKey]);

  return {
    ...usage,
    increment,
    refetch: fetchUsage,
    remaining: usage.limit === -1 ? Infinity : usage.limit - usage.currentUsage,
  };
}

// 전체 사용량 훅
export function useAllFeatureUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageState>({});
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllUsage = useCallback(async () => {
    if (!user) {
      setUsage({});
      setIsLoading(false);
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/subscription/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTier(data.tier);
        setUsage(data.usage);
      }
    } catch {
      // 에러 처리
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllUsage();
  }, [fetchAllUsage]);

  return { tier, usage, isLoading, refetch: fetchAllUsage };
}
