'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionTier, UserSubscription, TIER_LIMITS, TierLimits } from '@/types/subscription';

// Supabase 클라이언트 (브라우저용) - 환경변수 없으면 null
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

interface UseSubscriptionReturn {
  subscription: UserSubscription;
  limits: TierLimits;
  loading: boolean;
  canAccess: (feature: keyof TierLimits) => boolean;
  isFeatureBlurred: (feature: keyof TierLimits) => boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: 'free',
    isActive: false,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    // Supabase 클라이언트가 없으면 free로 설정
    if (!supabase) {
      setSubscription({ tier: 'free', isActive: true, expiresAt: null });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSubscription({ tier: 'free', isActive: false, expiresAt: null });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier, is_active, expires_at')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // 구독 정보가 없으면 free
        setSubscription({ tier: 'free', isActive: true, expiresAt: null });
      } else if (data.is_active) {
        // 만료일 체크
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        setSubscription({
          tier: isExpired ? 'free' : (data.tier as SubscriptionTier),
          isActive: !isExpired,
          expiresAt: data.expires_at,
        });
      } else {
        setSubscription({ tier: 'free', isActive: false, expiresAt: null });
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription({ tier: 'free', isActive: false, expiresAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const limits = TIER_LIMITS[subscription.tier];

  const canAccess = useCallback((feature: keyof TierLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0 || value === -1;
    return true;
  }, [limits]);

  const isFeatureBlurred = useCallback((feature: keyof TierLimits): boolean => {
    return !canAccess(feature);
  }, [canAccess]);

  return { 
    subscription, 
    limits, 
    loading, 
    canAccess, 
    isFeatureBlurred,
    refetch: fetchSubscription 
  };
}

// 랭크가 보이는지 확인하는 헬퍼
export function isRankVisible(rank: number, tier: SubscriptionTier): boolean {
  return rank <= TIER_LIMITS[tier].top5Visible;
}

// 날짜가 접근 가능한지 확인하는 헬퍼
export function isDateAccessible(dateStr: string, tier: SubscriptionTier): boolean {
  const limits = TIER_LIMITS[tier];
  if (limits.historyDays === -1) return true; // 무제한
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  
  if (limits.historyDays === 0) {
    // 오늘만 접근 가능
    return targetDate.getTime() === today.getTime();
  }
  
  const limitDate = new Date(today);
  limitDate.setDate(today.getDate() - limits.historyDays);
  
  return targetDate >= limitDate;
}
