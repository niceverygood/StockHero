// 구독 등급 타입 (간소화)
export type SubscriptionTier = 'free' | 'premium' | 'pro';

export interface UserSubscription {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
}

// 등급별 기능 제한
export const TIER_LIMITS = {
  free: {
    top5Visible: 1,           // Top 1만 보임
    historyDays: 0,           // 과거 이력 없음 (오늘만)
    showAIScores: false,      // AI별 점수 숨김
    showAIReasoning: false,   // AI 토론 내용 숨김
    showBacktest: false,      // 백테스트 숨김
    alertDelay: 'after_close', // 장 마감 후 공개
  },
  premium: {
    top5Visible: 5,           // Top 5 전체
    historyDays: 7,           // 7일 이력
    showAIScores: true,       // AI별 점수 공개
    showAIReasoning: false,   // AI 토론 내용 숨김
    showBacktest: false,      // 백테스트 숨김
    alertDelay: '1hour',      // 장 시작 1시간 후
  },
  pro: {
    top5Visible: 5,           // Top 5 전체
    historyDays: -1,          // 무제한
    showAIScores: true,       // AI별 점수 공개
    showAIReasoning: true,    // AI 토론 전문 공개
    showBacktest: true,       // 백테스트 공개
    alertDelay: 'realtime',   // 실시간
  },
} as const;

export type TierLimits = typeof TIER_LIMITS[SubscriptionTier];

// 가격 정보
export const TIER_PRICES = {
  free: { monthly: 0, yearly: 0 },
  premium: { monthly: 9900, yearly: 99000 },
  pro: { monthly: 29900, yearly: 299000 },
} as const;

// 표시 이름
export const TIER_NAMES = {
  free: 'Free',
  premium: 'Premium',
  pro: 'Pro',
} as const;

// 기능 타입 (구독 관련 기능들) - 모든 사용처 포함
export type FeatureType = 
  | 'ai_consultations'
  | 'debates'
  | 'reports'
  | 'portfolio_analyses'
  | 'backtest'
  | 'backtest_full'
  | 'realtime_alerts'
  | 'realtime_debate'
  | 'vip_stocks'
  | 'realtime_signal'
  | 'target_price'
  | 'target_date'
  | 'full_top5'
  | 'top5_full'
  | 'koreanTop5'
  | 'usTop5'
  | 'themeAnalysis'
  | 'aiConsultation'
  | 'watchDebate'
  | 'requestDebate'
  | 'hiddenGems'
  | 'portfolioDiagnosis'
  | 'alertType'
  | 'historyDays'
  | 'adFree'
  | string; // 확장성을 위해 string 허용

// 플랜 기능 정의 - 유연한 타입으로 정의
export interface PlanFeatures {
  // 모든 필드는 옵셔널 또는 인덱스 서명 허용
  [key: string]: number | boolean | string | undefined;
}

// 구독 플랜 정보
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 구독 상태
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'expired';

// 결제 제공자
export type PaymentProvider = 'portone' | 'toss' | 'none';

// 사용량 정보
export interface SubscriptionUsage {
  userId: string;
  featureType: FeatureType;
  usageDate: string;
  usageCount: number;
  // 상세 사용량 필드들
  aiConsultationsUsed: number;
  debatesWatched: number;
  reportsGenerated: number;
  reportsDownloaded: number;
  portfolioAnalysesRun: number;
  portfolioAnalyses: number;
}

// 사용량 제한 결과
export interface UsageLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  resetTime?: Date;
}

// 구독 트랜잭션
export interface SubscriptionTransaction {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider: PaymentProvider;
  paymentId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// 업그레이드 모달 상태
export interface UpgradeModalState {
  isOpen: boolean;
  feature?: FeatureType;
  message?: string;
  recommendedPlan?: 'basic' | 'pro' | 'vip';
}

// 구독 컨텍스트 값
export interface SubscriptionContextValue {
  currentPlan: SubscriptionPlan | null;
  subscription: any | null;
  usage: SubscriptionUsage | null;
  isLoading: boolean;
  error: Error | null;
  upgradeModal: UpgradeModalState;
  refreshSubscription: () => Promise<void>;
  openUpgradeModal: (feature?: FeatureType, message?: string) => void;
  closeUpgradeModal: () => void;
  hasAccess: (feature: FeatureType) => boolean;
  checkAccess: (feature: FeatureType) => boolean;
  checkUsageLimit: (feature: FeatureType) => UsageLimitResult;
  incrementUsage: (feature: FeatureType) => Promise<boolean>;
  isPro: boolean;
  isPremium: boolean;
}

// 플랜 비교
export interface PlanComparison {
  feature: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
  vip: string | boolean;
}
