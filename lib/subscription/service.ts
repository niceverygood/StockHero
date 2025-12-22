// 구독 서비스 - 비즈니스 로직

import { createClient } from '@supabase/supabase-js';
import { SubscriptionTier, FEATURE_LIMITS, getFeatureLimit } from './config';

// Supabase 클라이언트 (서버용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 구독 정보 타입
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  billingCycle: 'monthly' | 'yearly';
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  portoneCustomerId: string | null;
  portoneBillingKey: string | null;
}

// 사용자 구독 정보 조회
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    tier: data.tier,
    status: data.status,
    billingCycle: data.billing_cycle,
    startedAt: data.started_at,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelledAt: data.cancelled_at,
    portoneCustomerId: data.portone_customer_id,
    portoneBillingKey: data.portone_billing_key,
  };
}

// 사용자 구독 티어 조회 (간단 버전)
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription || subscription.status !== 'active') {
    return 'free';
  }

  // 구독 기간 만료 체크
  if (subscription.currentPeriodEnd) {
    const endDate = new Date(subscription.currentPeriodEnd);
    if (endDate < new Date()) {
      return 'free';
    }
  }

  return subscription.tier;
}

// 구독 생성/업데이트
export async function createOrUpdateSubscription(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  billingKey?: string,
  customerId?: string
): Promise<Subscription | null> {
  const periodEnd = calculatePeriodEnd(billingCycle);

  const subscriptionData = {
    user_id: userId,
    tier,
    status: 'active',
    billing_cycle: billingCycle,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    portone_billing_key: billingKey || null,
    portone_customer_id: customerId || null,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create subscription:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    tier: data.tier,
    status: data.status,
    billingCycle: data.billing_cycle,
    startedAt: data.started_at,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelledAt: data.cancelled_at,
    portoneCustomerId: data.portone_customer_id,
    portoneBillingKey: data.portone_billing_key,
  };
}

// 구독 취소
export async function cancelSubscription(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !error;
}

// 구독 기간 계산
function calculatePeriodEnd(billingCycle: 'monthly' | 'yearly'): Date {
  const now = new Date();
  if (billingCycle === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now;
}

// 결제 기록 저장
export async function recordPayment(
  userId: string,
  subscriptionId: string,
  amount: number,
  planId: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  portonePaymentId: string,
  portoneTxId: string,
  status: 'paid' | 'failed' = 'paid'
): Promise<boolean> {
  const { error } = await supabase.from('payments').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    amount,
    status,
    plan_id: planId,
    billing_cycle: billingCycle,
    portone_payment_id: portonePaymentId,
    portone_tx_id: portoneTxId,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
  });

  return !error;
}

// 기능 사용량 확인
export async function checkFeatureUsage(
  userId: string,
  featureKey: string
): Promise<{ canUse: boolean; currentUsage: number; limit: number }> {
  const tier = await getUserTier(userId);
  const limit = getFeatureLimit(tier, featureKey as keyof typeof FEATURE_LIMITS);

  // 무제한인 경우
  if (limit === -1) {
    return { canUse: true, currentUsage: 0, limit: -1 };
  }

  // 사용 불가인 경우
  if (limit === 0) {
    return { canUse: false, currentUsage: 0, limit: 0 };
  }

  // 오늘 사용량 조회
  const { data } = await supabase
    .from('feature_usage')
    .select('usage_count')
    .eq('user_id', userId)
    .eq('feature_key', featureKey)
    .eq('usage_date', new Date().toISOString().split('T')[0])
    .single();

  const currentUsage = data?.usage_count || 0;

  return {
    canUse: currentUsage < limit,
    currentUsage,
    limit,
  };
}

// 기능 사용량 증가
export async function incrementFeatureUsage(
  userId: string,
  featureKey: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('increment_feature_usage', {
    p_user_id: userId,
    p_feature_key: featureKey,
  });

  if (error) {
    // RPC가 없으면 직접 upsert
    const { data: existing } = await supabase
      .from('feature_usage')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('usage_date', today)
      .single();

    if (existing) {
      await supabase
        .from('feature_usage')
        .update({ usage_count: existing.usage_count + 1 })
        .eq('user_id', userId)
        .eq('feature_key', featureKey)
        .eq('usage_date', today);
      return existing.usage_count + 1;
    } else {
      await supabase.from('feature_usage').insert({
        user_id: userId,
        feature_key: featureKey,
        usage_count: 1,
        usage_date: today,
      });
      return 1;
    }
  }

  return data || 1;
}

// 쿠폰 검증
export async function validateCoupon(
  code: string,
  planId: SubscriptionTier
): Promise<{ valid: boolean; discountPercent?: number; error?: string }> {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return { valid: false, error: '유효하지 않은 쿠폰입니다.' };
  }

  // 유효기간 체크
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, error: '만료된 쿠폰입니다.' };
  }

  // 사용 횟수 체크
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, error: '사용 가능 횟수를 초과한 쿠폰입니다.' };
  }

  // 적용 가능 플랜 체크
  if (coupon.applicable_plans && !coupon.applicable_plans.includes(planId)) {
    return { valid: false, error: '해당 플랜에 적용할 수 없는 쿠폰입니다.' };
  }

  const discountPercent = coupon.discount_type === 'percent' 
    ? coupon.discount_value 
    : 0; // fixed 타입은 별도 처리 필요

  return { valid: true, discountPercent };
}

// 쿠폰 사용 처리
export async function redeemCoupon(
  couponCode: string,
  userId: string,
  paymentId?: string
): Promise<boolean> {
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, current_uses')
    .eq('code', couponCode.toUpperCase())
    .single();

  if (!coupon) return false;

  // 쿠폰 사용 횟수 증가
  await supabase
    .from('coupons')
    .update({ current_uses: coupon.current_uses + 1 })
    .eq('id', coupon.id);

  // 쿠폰 사용 기록
  await supabase.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    user_id: userId,
    payment_id: paymentId,
  });

  return true;
}

// 구독 상태 동기화 (웹훅용)
export async function syncSubscriptionStatus(
  userId: string,
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
): Promise<boolean> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('user_id', userId);

  return !error;
}



