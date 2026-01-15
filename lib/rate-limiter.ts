// =====================================================
// 플랜별 레이트 리밋 관리
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { PLAN_FEATURES, PLAN_DISPLAY_NAMES } from './subscription/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 기능별 사용량 타입
export type UsageFeature = 
  | 'ai_consultations'
  | 'debates'
  | 'portfolio_analyses'
  | 'reports'
  | 'backtest';

// 레이트 리밋 결과
export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  error?: string;
}

// 플랜별 기능 제한 매핑
const PLAN_LIMIT_MAP: Record<UsageFeature, (plan: string) => number> = {
  ai_consultations: (plan) => PLAN_FEATURES[plan]?.dailyConsultationLimit ?? 3,
  debates: (plan) => PLAN_FEATURES[plan]?.dailyDebateLimit ?? 1,
  portfolio_analyses: (plan) => PLAN_FEATURES[plan]?.dailyPortfolioAnalysis ?? 1,
  reports: (plan) => PLAN_FEATURES[plan]?.reportDownload ?? 0,
  backtest: () => -1, // 백테스트는 횟수 제한 없음 (기간만 제한)
};

// DB 컬럼 매핑
const FEATURE_TO_COLUMN: Record<UsageFeature, string> = {
  ai_consultations: 'ai_consultations_used',
  debates: 'debates_watched',
  portfolio_analyses: 'portfolio_analyses',
  reports: 'reports_downloaded',
  backtest: 'backtest_used',
};

/**
 * 오늘 날짜 (KST 기준)
 */
function getTodayKST(): string {
  const now = new Date();
  // KST는 UTC+9
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().split('T')[0];
}

/**
 * 다음 리셋 시간 (다음 날 자정 KST)
 */
function getNextResetTime(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  kst.setDate(kst.getDate() + 1);
  kst.setHours(0, 0, 0, 0);
  return kst.toISOString();
}

/**
 * 사용량 조회
 */
export async function getUsage(
  userId: string,
  feature: UsageFeature
): Promise<number> {
  const today = getTodayKST();
  const column = FEATURE_TO_COLUMN[feature];

  const { data, error } = await supabase
    .from('subscription_usage')
    .select(column)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) return 0;
  return (data as any)[column] || 0;
}

/**
 * 레이트 리밋 체크
 */
export async function checkRateLimit(
  userId: string,
  feature: UsageFeature,
  planName: string = 'free'
): Promise<RateLimitResult> {
  const limit = PLAN_LIMIT_MAP[feature](planName);
  
  // 무제한인 경우
  if (limit === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: getNextResetTime(),
    };
  }

  const used = await getUsage(userId, feature);
  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return {
    allowed,
    used,
    limit,
    remaining,
    resetAt: getNextResetTime(),
    error: allowed ? undefined : `일일 ${FEATURE_TO_COLUMN[feature]} 한도 초과`,
  };
}

/**
 * 사용량 증가
 */
export async function incrementUsage(
  userId: string,
  feature: UsageFeature
): Promise<boolean> {
  const today = getTodayKST();
  const column = FEATURE_TO_COLUMN[feature];

  try {
    // 기존 레코드 확인
    const { data: existing } = await supabase
      .from('subscription_usage')
      .select('id, ' + column)
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existing) {
      // 기존 레코드 업데이트
      const { error } = await supabase
        .from('subscription_usage')
        .update({ [column]: ((existing as any)[column] || 0) + 1 })
        .eq('id', existing.id);

      return !error;
    } else {
      // 새 레코드 생성
      const { error } = await supabase
        .from('subscription_usage')
        .insert({
          user_id: userId,
          date: today,
          [column]: 1,
        });

      return !error;
    }
  } catch (error) {
    console.error('Failed to increment usage:', error);
    return false;
  }
}

/**
 * 플랜별 콘텐츠 길이 제한
 */
export const CONTENT_LENGTH_LIMITS = {
  free: {
    consultationInput: 500,
    consultationOutput: 1000,
  },
  basic: {
    consultationInput: 1000,
    consultationOutput: 2000,
  },
  pro: {
    consultationInput: 2000,
    consultationOutput: 4000,
  },
  vip: {
    consultationInput: 5000,
    consultationOutput: 10000,
  },
};

/**
 * 플랜별 백테스트 기간 제한
 */
export const BACKTEST_DAYS_LIMITS = {
  free: 7,
  basic: 30,
  pro: 90,
  vip: 365,
};

/**
 * 플랜별 토론 지연 시간 (밀리초)
 */
export const DEBATE_DELAY = {
  free: 24 * 60 * 60 * 1000, // 1일
  basic: 0,
  pro: 0,
  vip: 0,
};

/**
 * Top 5 공개 개수
 */
export const TOP5_VISIBLE_COUNT = {
  free: 3,  // 3~5위만
  basic: 5, // 전체
  pro: 5,
  vip: 5,
};

/**
 * 레이트 리밋 미들웨어 헬퍼
 */
export async function withRateLimit(
  userId: string,
  feature: UsageFeature,
  planName: string,
  incrementOnSuccess: boolean = true
): Promise<RateLimitResult & { increment: () => Promise<boolean> }> {
  const result = await checkRateLimit(userId, feature, planName);

  return {
    ...result,
    increment: async () => {
      if (incrementOnSuccess && result.allowed) {
        return incrementUsage(userId, feature);
      }
      return false;
    },
  };
}

/**
 * 사용량 초기화 (일괄) - 관리자용
 */
export async function resetDailyUsage(): Promise<boolean> {
  // 어제까지의 데이터는 유지, 오늘 자정에 자동으로 새 레코드 생성
  // 실제로는 Supabase cron job에서 호출
  console.log('Daily usage will reset automatically at midnight KST');
  return true;
}

/**
 * 사용량 통계 조회
 */
export async function getUsageStats(
  userId: string,
  days: number = 7
): Promise<Array<{
  date: string;
  ai_consultations: number;
  debates: number;
  portfolio_analyses: number;
  reports: number;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('subscription_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error || !data) return [];

  return data.map(d => ({
    date: d.date,
    ai_consultations: d.ai_consultations_used || 0,
    debates: d.debates_watched || 0,
    portfolio_analyses: d.portfolio_analyses || 0,
    reports: d.reports_downloaded || 0,
  }));
}
