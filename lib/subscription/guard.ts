// =====================================================
// 구독 기반 API 접근 제어
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPlanFeatures, PLAN_ORDER, PLAN_DISPLAY_NAMES } from './utils';
import type { PlanFeatures, FeatureType } from '@/types/subscription';

// Lazy initialization
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) return null;
  
  _supabase = createClient(url, key);
  return _supabase;
}
const supabase = getSupabase();

// 플랜별 제한 설정
export const PLAN_LIMITS = {
  free: {
    consultationPerDay: 3,
    consultationMaxLength: 500,
    debatePerDay: 1,
    debateDelay: 24 * 60 * 60 * 1000, // 1일 지연
    top5Visible: 3,
    showTargetPrice: false,
    showTargetDate: false,
    backtestDays: 7,
    portfolioStocks: 5,
    portfolioAnalysisPerDay: 1,
  },
  basic: {
    consultationPerDay: 10,
    consultationMaxLength: 1000,
    debatePerDay: 5,
    debateDelay: 0,
    top5Visible: 5,
    showTargetPrice: true,
    showTargetDate: false,
    backtestDays: 30,
    portfolioStocks: 10,
    portfolioAnalysisPerDay: 3,
  },
  pro: {
    consultationPerDay: 50,
    consultationMaxLength: 2000,
    debatePerDay: 20,
    debateDelay: 0,
    top5Visible: 5,
    showTargetPrice: true,
    showTargetDate: true,
    backtestDays: 90,
    portfolioStocks: 30,
    portfolioAnalysisPerDay: 10,
  },
  vip: {
    consultationPerDay: -1, // 무제한
    consultationMaxLength: 5000,
    debatePerDay: -1,
    debateDelay: 0,
    top5Visible: 5,
    showTargetPrice: true,
    showTargetDate: true,
    backtestDays: 365,
    portfolioStocks: -1,
    portfolioAnalysisPerDay: -1,
    deepAnalysis: true, // VIP 전용 심층분석
  },
};

export type PlanName = keyof typeof PLAN_LIMITS;

// 구독 정보 타입
interface SubscriptionInfo {
  userId: string;
  planName: PlanName;
  planId: string | null;
  limits: typeof PLAN_LIMITS[PlanName];
  isActive: boolean;
  periodEnd: string | null;
}

// 가드 옵션
interface GuardOptions {
  requiredPlan?: PlanName;
  feature?: FeatureType;
  checkUsage?: boolean;
}

// 에러 응답 생성
function createUpgradeRequiredResponse(
  currentPlan: string,
  requiredPlan: string,
  feature?: string
) {
  const requiredDisplayName = PLAN_DISPLAY_NAMES[requiredPlan as keyof typeof PLAN_DISPLAY_NAMES] || requiredPlan;
  const currentDisplayName = PLAN_DISPLAY_NAMES[currentPlan as keyof typeof PLAN_DISPLAY_NAMES] || currentPlan;

  return NextResponse.json({
    success: false,
    error: 'upgrade_required',
    message: feature 
      ? `이 기능은 ${requiredDisplayName} 플랜 이상에서 이용 가능합니다.`
      : `${requiredDisplayName} 플랜 이상이 필요합니다.`,
    currentPlan: currentDisplayName,
    requiredPlan: requiredDisplayName,
    upgradeUrl: '/pricing',
  }, { status: 403 });
}

function createUsageLimitResponse(
  feature: string,
  used: number,
  limit: number,
  planName: string
) {
  return NextResponse.json({
    success: false,
    error: 'usage_limit_exceeded',
    message: `오늘 ${feature} 사용량을 모두 소진했습니다. (${used}/${limit})`,
    used,
    limit,
    currentPlan: PLAN_DISPLAY_NAMES[planName as keyof typeof PLAN_DISPLAY_NAMES],
    upgradeUrl: '/pricing',
  }, { status: 429 });
}

/**
 * 사용자 구독 정보 조회
 */
export async function getSubscriptionInfo(request: NextRequest): Promise<SubscriptionInfo | null> {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // 쿠키에서 세션 확인
    if (!userId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Supabase 세션 쿠키 파싱 (간소화)
        const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
        if (match) {
          try {
            const tokenData = JSON.parse(decodeURIComponent(match[1]));
            if (tokenData?.access_token) {
              const { data: { user } } = await supabase.auth.getUser(tokenData.access_token);
              userId = user?.id || null;
            }
          } catch {}
        }
      }
    }

    if (!userId) {
      // 비로그인 사용자 = 무료 플랜
      return {
        userId: 'anonymous',
        planName: 'free',
        planId: null,
        limits: PLAN_LIMITS.free,
        isActive: true,
        periodEnd: null,
      };
    }

    // 구독 정보 조회
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .gt('current_period_end', new Date().toISOString())
      .single();

    if (!subscription) {
      return {
        userId,
        planName: 'free',
        planId: null,
        limits: PLAN_LIMITS.free,
        isActive: true,
        periodEnd: null,
      };
    }

    const planName = (subscription.plan?.name || 'free') as PlanName;

    return {
      userId,
      planName,
      planId: subscription.plan_id,
      limits: PLAN_LIMITS[planName] || PLAN_LIMITS.free,
      isActive: subscription.status === 'active' || subscription.status === 'trial',
      periodEnd: subscription.current_period_end,
    };

  } catch (error) {
    console.error('Failed to get subscription info:', error);
    return null;
  }
}

/**
 * 플랜 레벨 비교
 */
export function isPlanSufficient(currentPlan: PlanName, requiredPlan: PlanName): boolean {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
  return currentIndex >= requiredIndex;
}

/**
 * 일일 사용량 조회
 */
export async function getDailyUsage(
  userId: string,
  feature: 'ai_consultations' | 'debates' | 'portfolio_analyses' | 'reports'
): Promise<number> {
  if (userId === 'anonymous') return 0;

  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('subscription_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (!data) return 0;

  const fieldMap: Record<string, string> = {
    ai_consultations: 'ai_consultations_used',
    debates: 'debates_watched',
    portfolio_analyses: 'portfolio_analyses',
    reports: 'reports_downloaded',
  };

  return (data as any)[fieldMap[feature]] || 0;
}

/**
 * 사용량 증가
 */
export async function incrementDailyUsage(
  userId: string,
  feature: 'ai_consultations' | 'debates' | 'portfolio_analyses' | 'reports'
): Promise<boolean> {
  if (userId === 'anonymous') return false;

  const today = new Date().toISOString().split('T')[0];
  const fieldMap: Record<string, string> = {
    ai_consultations: 'ai_consultations_used',
    debates: 'debates_watched',
    portfolio_analyses: 'portfolio_analyses',
    reports: 'reports_downloaded',
  };
  const field = fieldMap[feature];

  // UPSERT
  const { data: existing } = await supabase
    .from('subscription_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('subscription_usage')
      .update({ [field]: (existing as any)[field] + 1 })
      .eq('user_id', userId)
      .eq('date', today);
  } else {
    await supabase
      .from('subscription_usage')
      .insert({
        user_id: userId,
        date: today,
        [field]: 1,
      });
  }

  return true;
}

/**
 * withSubscription 래퍼 - API 라우트에서 사용
 */
export function withSubscription<T extends any[]>(
  handler: (request: NextRequest, subInfo: SubscriptionInfo, ...args: T) => Promise<NextResponse>,
  options: GuardOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // 구독 정보 조회
    const subInfo = await getSubscriptionInfo(request);

    if (!subInfo) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify subscription' },
        { status: 500 }
      );
    }

    // 최소 플랜 체크
    if (options.requiredPlan) {
      if (!isPlanSufficient(subInfo.planName, options.requiredPlan)) {
        return createUpgradeRequiredResponse(
          subInfo.planName,
          options.requiredPlan,
          options.feature
        );
      }
    }

    // 사용량 체크
    if (options.checkUsage && options.feature) {
      const featureToUsage: Record<string, 'ai_consultations' | 'debates' | 'portfolio_analyses' | 'reports'> = {
        ai_consultations: 'ai_consultations',
        debates: 'debates',
        portfolio_analyses: 'portfolio_analyses',
        reports: 'reports',
      };

      const usageFeature = featureToUsage[options.feature];
      if (usageFeature) {
        const used = await getDailyUsage(subInfo.userId, usageFeature);
        
        const limitKey = {
          ai_consultations: 'consultationPerDay',
          debates: 'debatePerDay',
          portfolio_analyses: 'portfolioAnalysisPerDay',
          reports: 'reportDownload',
        }[usageFeature] as keyof typeof PLAN_LIMITS[PlanName];

        const limit = (subInfo.limits as any)[limitKey];

        if (limit !== -1 && used >= limit) {
          return createUsageLimitResponse(
            options.feature,
            used,
            limit,
            subInfo.planName
          );
        }
      }
    }

    // 핸들러 실행
    return handler(request, subInfo, ...args);
  };
}

/**
 * 간단한 플랜 체크 헬퍼
 */
export async function checkPlanAccess(
  request: NextRequest,
  requiredPlan: PlanName
): Promise<{ allowed: boolean; subInfo: SubscriptionInfo | null; response?: NextResponse }> {
  const subInfo = await getSubscriptionInfo(request);

  if (!subInfo) {
    return {
      allowed: false,
      subInfo: null,
      response: NextResponse.json(
        { success: false, error: 'Failed to verify subscription' },
        { status: 500 }
      ),
    };
  }

  if (!isPlanSufficient(subInfo.planName, requiredPlan)) {
    return {
      allowed: false,
      subInfo,
      response: createUpgradeRequiredResponse(subInfo.planName, requiredPlan),
    };
  }

  return { allowed: true, subInfo };
}
