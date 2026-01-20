// =====================================================
// StockHero 구독 유틸리티 함수
// =====================================================

import type { PlanFeatures, FeatureType, UsageLimitResult } from '@/types/subscription';

/**
 * 플랜별 기능 설정
 */
export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    dailyConsultationLimit: 3,
    top5VisibleCount: 3,
    showTargetPrice: false,
    showTargetDate: false,
    showRealTimeDebate: false,
    dailyDebateLimit: 1,
    alertsPerDay: 0,
    backtestDays: 0,
    portfolioStockLimit: 5,
    dailyPortfolioAnalysis: 1,
    hasVipStocks: false,
    hasRealTimeSignal: false,
    hasPrioritySupport: false,
    adFree: false,
    reportDownload: 0,
    description: '기본 기능 무료 이용',
  },
  basic: {
    dailyConsultationLimit: 10,
    top5VisibleCount: 5,
    showTargetPrice: true,
    showTargetDate: false,
    showRealTimeDebate: true,
    dailyDebateLimit: 5,
    alertsPerDay: 3,
    backtestDays: 30,
    portfolioStockLimit: 10,
    dailyPortfolioAnalysis: 3,
    hasVipStocks: false,
    hasRealTimeSignal: false,
    hasPrioritySupport: false,
    adFree: true,
    reportDownload: 3,
    description: '광고 없이 더 많은 AI 상담',
  },
  pro: {
    dailyConsultationLimit: 50,
    top5VisibleCount: 5,
    showTargetPrice: true,
    showTargetDate: true,
    showRealTimeDebate: true,
    dailyDebateLimit: 20,
    alertsPerDay: 10,
    backtestDays: 90,
    portfolioStockLimit: 30,
    dailyPortfolioAnalysis: 10,
    hasVipStocks: false,
    hasRealTimeSignal: true,
    hasPrioritySupport: false,
    adFree: true,
    reportDownload: 10,
    description: '실시간 알림 + 무제한에 가까운 사용',
  },
  vip: {
    dailyConsultationLimit: -1,  // 무제한
    top5VisibleCount: 5,
    showTargetPrice: true,
    showTargetDate: true,
    showRealTimeDebate: true,
    dailyDebateLimit: -1,  // 무제한
    alertsPerDay: -1,  // 무제한
    backtestDays: 365,
    portfolioStockLimit: -1,  // 무제한
    dailyPortfolioAnalysis: -1,  // 무제한
    hasVipStocks: true,
    hasRealTimeSignal: true,
    hasPrioritySupport: true,
    adFree: true,
    reportDownload: -1,  // 무제한
    description: '모든 기능 무제한 + 우선 지원 + VIP 전용 추천',
  },
};

/**
 * 플랜 가격 정보
 */
export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  basic: { monthly: 9900, yearly: 94800 },
  pro: { monthly: 29900, yearly: 298800 },
  vip: { monthly: 79900, yearly: 718800 },
} as const;

/**
 * 플랜 표시 이름
 */
export const PLAN_DISPLAY_NAMES = {
  free: '무료',
  basic: '베이직',
  pro: '프로',
  vip: 'VIP',
} as const;

/**
 * 플랜 순서 (업그레이드 비교용)
 */
export const PLAN_ORDER = ['free', 'basic', 'pro', 'vip'] as const;

/**
 * 플랜별 기능 설정 조회
 */
export function getPlanFeatures(planName: string): PlanFeatures {
  return PLAN_FEATURES[planName] || PLAN_FEATURES.free;
}

/**
 * 특정 기능 접근 가능 여부 체크
 */
export function checkFeatureAccess(userPlan: string, feature: FeatureType): boolean {
  const features = getPlanFeatures(userPlan);
  
  switch (feature) {
    case 'ai_consultations':
      return (features.dailyConsultationLimit as number) !== 0;
    case 'debates':
      return !!(features.showRealTimeDebate) || (features.dailyDebateLimit as number) > 0;
    case 'reports':
      return (features.reportDownload as number) !== 0;
    case 'portfolio_analyses':
      return (features.dailyPortfolioAnalysis as number) !== 0;
    case 'backtest':
      return (features.backtestDays as number) > 0;
    case 'realtime_alerts':
      return (features.alertsPerDay as number) !== 0;
    case 'vip_stocks':
      return !!(features.hasVipStocks);
    case 'realtime_signal':
      return !!(features.hasRealTimeSignal);
    case 'target_price':
      return !!(features.showTargetPrice);
    case 'target_date':
      return !!(features.showTargetDate);
    case 'full_top5':
      return (features.top5VisibleCount as number) === 5;
    default:
      return false;
  }
}

/**
 * 남은 사용량 계산
 */
export function getRemainingUsage(used: number, limit: number): number {
  if (limit === -1) return -1;  // 무제한
  return Math.max(0, limit - used);
}

/**
 * 사용량 제한 체크
 */
export function checkUsageLimitByPlan(
  planName: string,
  feature: FeatureType,
  currentUsage: number
): UsageLimitResult {
  const features = getPlanFeatures(planName);
  let limit: number;
  
  switch (feature) {
    case 'ai_consultations':
      limit = features.dailyConsultationLimit as number;
      break;
    case 'debates':
      limit = features.dailyDebateLimit as number;
      break;
    case 'reports':
      limit = features.reportDownload as number;
      break;
    case 'portfolio_analyses':
      limit = features.dailyPortfolioAnalysis as number;
      break;
    default:
      limit = 0;
  }
  
  const remaining = getRemainingUsage(currentUsage, limit);
  
  return {
    allowed: limit === -1 || currentUsage < limit,
    limit,
    used: currentUsage,
    remaining,
  };
}

/**
 * 플랜 비교 (현재 플랜 대비 더 높은지)
 */
export function isPlanHigherThan(planA: string, planB: string): boolean {
  const indexA = PLAN_ORDER.indexOf(planA as any);
  const indexB = PLAN_ORDER.indexOf(planB as any);
  return indexA > indexB;
}

/**
 * 특정 기능에 필요한 최소 플랜 조회
 */
export function getRequiredPlanForFeature(feature: FeatureType): string {
  for (const plan of PLAN_ORDER) {
    if (checkFeatureAccess(plan, feature)) {
      return plan;
    }
  }
  return 'vip';
}

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  if (price === 0) return '무료';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

/**
 * 연간 할인율 계산
 */
export function getYearlyDiscount(planName: string): number {
  const prices = PLAN_PRICES[planName as keyof typeof PLAN_PRICES];
  if (!prices || prices.monthly === 0) return 0;
  
  const monthlyTotal = prices.monthly * 12;
  const discount = ((monthlyTotal - prices.yearly) / monthlyTotal) * 100;
  return Math.round(discount);
}

/**
 * 플랜 업그레이드 메시지 생성
 */
export function getUpgradeMessage(feature: FeatureType): string {
  const messages: Record<FeatureType, string> = {
    ai_consultations: '더 많은 AI 상담을 이용하려면 업그레이드하세요',
    debates: '실시간 토론을 시청하려면 업그레이드하세요',
    reports: '리포트 다운로드를 이용하려면 업그레이드하세요',
    portfolio_analyses: '더 많은 포트폴리오 분석을 하려면 업그레이드하세요',
    backtest: '백테스트 기능을 이용하려면 업그레이드하세요',
    realtime_alerts: '실시간 알림을 받으려면 업그레이드하세요',
    vip_stocks: 'VIP 전용 추천 종목을 보려면 VIP로 업그레이드하세요',
    realtime_signal: '실시간 매매 신호를 받으려면 업그레이드하세요',
    target_price: '목표가를 확인하려면 업그레이드하세요',
    target_date: '목표 날짜를 확인하려면 업그레이드하세요',
    full_top5: '전체 Top 5를 보려면 업그레이드하세요',
  };
  
  return messages[feature] || '이 기능을 사용하려면 업그레이드하세요';
}

/**
 * 추천 플랜 계산
 */
export function getRecommendedPlan(feature: FeatureType): 'basic' | 'pro' | 'vip' {
  const requiredPlan = getRequiredPlanForFeature(feature);
  
  if (requiredPlan === 'vip') return 'vip';
  if (requiredPlan === 'pro') return 'pro';
  return 'basic';
}

/**
 * 기능별 아이콘
 */
export const FEATURE_ICONS: Record<string, string> = {
  ai_consultations: '💬',
  debates: '⚔️',
  reports: '📄',
  portfolio_analyses: '📊',
  backtest: '📈',
  realtime_alerts: '🔔',
  vip_stocks: '👑',
  realtime_signal: '⚡',
  target_price: '🎯',
  target_date: '📅',
  full_top5: '🏆',
  ad_free: '🚫',
  priority_support: '🎖️',
};

/**
 * 기능별 한글 이름
 */
export const FEATURE_NAMES: Record<string, string> = {
  ai_consultations: 'AI 상담',
  debates: '실시간 토론',
  reports: '리포트 다운로드',
  portfolio_analyses: '포트폴리오 분석',
  backtest: '백테스트',
  realtime_alerts: '실시간 알림',
  vip_stocks: 'VIP 전용 추천',
  realtime_signal: '실시간 매매 신호',
  target_price: '목표가',
  target_date: '목표 날짜',
  full_top5: '전체 Top 5',
  ad_free: '광고 제거',
  priority_support: '우선 지원',
};
