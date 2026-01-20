// =====================================================
// StockHero 구독 시스템 - 메인 Export
// =====================================================

// 타입
export type {
  PlanFeatures,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentProvider,
  UserSubscription,
  SubscriptionUsage,
  UsageLimitResult,
  FeatureType,
  SubscriptionTransaction,
  UpgradeModalState,
  SubscriptionContextValue,
  PlanComparison,
} from '@/types/subscription';

// 유틸리티
export {
  getPlanFeatures,
  checkFeatureAccess,
  getRemainingUsage,
  checkUsageLimitByPlan,
  isPlanHigherThan,
  getRequiredPlanForFeature,
  formatPrice,
  getYearlyDiscount,
  getUpgradeMessage,
  getRecommendedPlan,
  PLAN_FEATURES,
  PLAN_PRICES,
  PLAN_DISPLAY_NAMES,
  PLAN_ORDER,
  FEATURE_ICONS,
  FEATURE_NAMES,
} from './utils';

// React 훅
export {
  SubscriptionProvider,
  useSubscription,
  useCanAccess,
  useUsageLimit,
  useUpgradeModal,
  useCurrentPlan,
  usePlans,
} from './hooks';

// 서버사이드 가드
export {
  PLAN_LIMITS,
  getSubscriptionInfo,
  isPlanSufficient,
  getDailyUsage,
  incrementDailyUsage,
  withSubscription,
  checkPlanAccess,
  type PlanName,
} from './guard';

// 결제 관련
export {
  SUBSCRIPTION_PLANS,
  generateOrderId,
  calculatePaymentAmount,
} from './config';

// 포트원 결제 설정
export { createPaymentConfig } from './portone';
