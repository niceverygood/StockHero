// 구독 시스템 모듈 내보내기

// 설정 및 타입
export {
  SUBSCRIPTION_PLANS,
  FEATURE_LIMITS,
  getPlanById,
  canAccessFeature,
  getFeatureLimit,
  formatPrice,
  type SubscriptionTier,
  type SubscriptionPlan,
  type PlanFeature,
} from './config';

// 포트원 결제
export {
  calculatePaymentAmount,
  generateOrderId,
  getPaymentStatus,
  executePaymentWithBillingKey,
  cancelPayment,
  schedulePayment,
  cancelScheduledPayment,
  createPaymentConfig,
  createBillingKeyConfig,
} from './portone';

// 서비스 함수
export {
  getUserSubscription,
  getUserTier,
  createOrUpdateSubscription,
  cancelSubscription,
  recordPayment,
  checkFeatureUsage,
  incrementFeatureUsage,
  validateCoupon,
  redeemCoupon,
  syncSubscriptionStatus,
} from './service';

// React Hooks (클라이언트용)
export {
  useSubscription,
  useFeatureUsage,
  useAllFeatureUsage,
} from './hooks';






