// 포트원 (PortOne) 결제 연동
// V2 API 사용

import { SubscriptionTier, SUBSCRIPTION_PLANS } from './config';

// 포트원 설정
const PORTONE_CONFIG = {
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '',
  apiSecret: process.env.PORTONE_API_SECRET || '',
};

// 결제 요청 타입
export interface PaymentRequest {
  userId: string;
  userEmail: string;
  userName: string;
  planId: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  couponCode?: string;
}

// 결제 응답 타입
export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  txId?: string;
  error?: string;
}

// 빌링키 발급 요청 타입
export interface BillingKeyRequest {
  userId: string;
  userEmail: string;
  userName: string;
}

// 정기결제 예약 타입
export interface SchedulePaymentRequest {
  userId: string;
  billingKey: string;
  planId: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  scheduledAt: Date;
}

// 결제 금액 계산
export function calculatePaymentAmount(
  planId: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  discountPercent: number = 0
): number {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) return 0;

  const baseAmount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const discount = Math.floor(baseAmount * (discountPercent / 100));
  
  return baseAmount - discount;
}

// 주문 ID 생성
export function generateOrderId(userId: string, planId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ORDER_${planId.toUpperCase()}_${timestamp}_${random}`;
}

// 포트원 액세스 토큰 발급
async function getPortoneAccessToken(): Promise<string> {
  const response = await fetch('https://api.portone.io/login/api-secret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiSecret: PORTONE_CONFIG.apiSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get PortOne access token');
  }

  const data = await response.json();
  return data.accessToken;
}

// 결제 상태 조회
export async function getPaymentStatus(paymentId: string): Promise<any> {
  const accessToken = await getPortoneAccessToken();
  
  const response = await fetch(`https://api.portone.io/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get payment status');
  }

  return response.json();
}

// 빌링키로 결제 실행 (정기결제)
export async function executePaymentWithBillingKey(
  billingKey: string,
  orderId: string,
  amount: number,
  orderName: string,
  customerEmail: string,
  customerName: string
): Promise<PaymentResponse> {
  const accessToken = await getPortoneAccessToken();

  const response = await fetch('https://api.portone.io/payments/billing-key', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      billingKey,
      orderName,
      amount: {
        total: amount,
        currency: 'KRW',
      },
      customer: {
        email: customerEmail,
        name: customerName,
      },
      merchantPaymentId: orderId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.message || 'Payment failed',
    };
  }

  return {
    success: true,
    paymentId: data.paymentId,
    txId: data.txId,
  };
}

// 결제 취소 (환불)
export async function cancelPayment(
  paymentId: string,
  reason: string,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getPortoneAccessToken();

  const body: any = {
    reason,
  };

  if (amount) {
    body.amount = {
      total: amount,
      currency: 'KRW',
    };
  }

  const response = await fetch(`https://api.portone.io/payments/${paymentId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      success: false,
      error: data.message || 'Cancellation failed',
    };
  }

  return { success: true };
}

// 정기결제 예약
export async function schedulePayment(
  billingKey: string,
  scheduleId: string,
  scheduledAt: Date,
  amount: number,
  orderName: string,
  customerEmail: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getPortoneAccessToken();

  const response = await fetch('https://api.portone.io/payments/schedule', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      billingKey,
      scheduleId,
      scheduledAt: scheduledAt.toISOString(),
      orderName,
      amount: {
        total: amount,
        currency: 'KRW',
      },
      customer: {
        email: customerEmail,
        name: customerName,
      },
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      success: false,
      error: data.message || 'Schedule failed',
    };
  }

  return { success: true };
}

// 정기결제 예약 취소
export async function cancelScheduledPayment(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getPortoneAccessToken();

  const response = await fetch(`https://api.portone.io/payments/schedule/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      success: false,
      error: data.message || 'Cancel schedule failed',
    };
  }

  return { success: true };
}

// 클라이언트용 결제 설정 생성
export function createPaymentConfig(
  orderId: string,
  planId: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  discountPercent: number = 0
) {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  const amount = calculatePaymentAmount(planId, billingCycle, discountPercent);
  const cycleName = billingCycle === 'monthly' ? '월간' : '연간';

  return {
    storeId: PORTONE_CONFIG.storeId,
    channelKey: PORTONE_CONFIG.channelKey,
    paymentId: orderId,
    orderName: `StockHero ${plan.nameKo} ${cycleName} 구독`,
    totalAmount: amount,
    currency: 'KRW',
    payMethod: 'CARD',
    windowType: {
      pc: 'IFRAME',
      mobile: 'REDIRECTION',
    },
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/callback`,
    appScheme: 'stockhero',
  };
}

// 빌링키 발급용 설정 생성
export function createBillingKeyConfig(
  customerId: string,
  customerEmail: string,
  customerName: string
) {
  return {
    storeId: PORTONE_CONFIG.storeId,
    channelKey: PORTONE_CONFIG.channelKey,
    billingKeyMethod: 'CARD',
    customer: {
      customerId,
      email: customerEmail,
      name: customerName,
    },
    windowType: {
      pc: 'IFRAME',
      mobile: 'REDIRECTION',
    },
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/billing-callback`,
  };
}

