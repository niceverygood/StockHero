// 구독 플랜 설정

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface PlanFeature {
  name: string;
  free: string | boolean | number;
  pro: string | boolean | number;
  premium: string | boolean | number;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  nameKo: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  color: string;
  gradient: string;
  icon: string;
  popular?: boolean;
  features: string[];
}

// 구독 플랜 정의
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    nameKo: '무료',
    description: 'AI 주식 분석 맛보기',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    color: 'text-dark-400',
    gradient: 'from-dark-600 to-dark-700',
    icon: '🆓',
    features: [
      'Top 5 추천 (한국) 1일 1회',
      'AI 상담 3회/일',
      '토론 시청 1회/일',
      '최근 7일 추천 성과',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    nameKo: '프로',
    description: '본격적인 AI 투자 분석',
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    yearlyDiscount: 17,
    color: 'text-brand-400',
    gradient: 'from-brand-500 to-brand-600',
    icon: '⭐',
    popular: true,
    features: [
      'Top 5 추천 (한국) 무제한',
      'Top 5 추천 (미국) 무제한',
      '핫 테마 분석 무제한',
      'AI 상담 20회/일',
      '토론 시청 무제한',
      '종목 토론 요청 5개/일',
      '주간 알림 (카톡/이메일)',
      '최근 30일 추천 성과',
      '광고 제거',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    nameKo: '프리미엄',
    description: '전문 투자자를 위한 모든 기능',
    monthlyPrice: 29900,
    yearlyPrice: 299000,
    yearlyDiscount: 17,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-amber-600',
    icon: '💎',
    features: [
      'Pro의 모든 기능',
      'AI 상담 무제한',
      '종목 토론 요청 무제한',
      '히든 젬 (소형주 발굴)',
      'AI 포트폴리오 진단',
      '실시간 알림',
      '전체 추천 성과 열람',
      '우선 고객 지원',
    ],
  },
];

// 기능별 접근 권한 정의
export const FEATURE_LIMITS: Record<string, PlanFeature> = {
  koreanTop5: {
    name: 'Top 5 추천 (한국)',
    free: 1,
    pro: -1, // -1 = 무제한
    premium: -1,
  },
  usTop5: {
    name: 'Top 5 추천 (미국)',
    free: 0,
    pro: -1,
    premium: -1,
  },
  themeAnalysis: {
    name: '핫 테마 분석',
    free: 2,
    pro: -1,
    premium: -1,
  },
  aiConsultation: {
    name: 'AI 상담',
    free: 3,
    pro: 20,
    premium: -1,
  },
  watchDebate: {
    name: '토론 시청',
    free: 1,
    pro: -1,
    premium: -1,
  },
  requestDebate: {
    name: '종목 토론 요청',
    free: 0,
    pro: 5,
    premium: -1,
  },
  hiddenGems: {
    name: '히든 젬',
    free: false,
    pro: false,
    premium: true,
  },
  portfolioDiagnosis: {
    name: '포트폴리오 진단',
    free: false,
    pro: false,
    premium: true,
  },
  alertType: {
    name: '알림',
    free: 'none',
    pro: 'weekly',
    premium: 'realtime',
  },
  historyDays: {
    name: '추천 성과 열람',
    free: 7,
    pro: 30,
    premium: -1, // 전체
  },
  adFree: {
    name: '광고 제거',
    free: false,
    pro: true,
    premium: true,
  },
};

// 플랜 ID로 플랜 정보 가져오기
export const getPlanById = (id: SubscriptionTier): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id);
};

// 기능 접근 가능 여부 확인
export const canAccessFeature = (
  tier: SubscriptionTier,
  feature: keyof typeof FEATURE_LIMITS
): boolean => {
  const limit = FEATURE_LIMITS[feature];
  if (!limit) return false;
  
  const value = limit[tier];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value !== 'none';
  return false;
};

// 기능 사용 가능 횟수 확인
export const getFeatureLimit = (
  tier: SubscriptionTier,
  feature: keyof typeof FEATURE_LIMITS
): number => {
  const limit = FEATURE_LIMITS[feature];
  if (!limit) return 0;
  
  const value = limit[tier];
  if (typeof value === 'number') return value;
  return 0;
};

// 가격 포맷팅
export const formatPrice = (price: number): string => {
  if (price === 0) return '무료';
  return `₩${price.toLocaleString()}`;
};

