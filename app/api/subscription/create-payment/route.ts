// 결제 생성 API - 포트원 결제를 위한 설정 생성

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  SubscriptionTier, 
  SUBSCRIPTION_PLANS 
} from '@/lib/subscription/config';
import { 
  calculatePaymentAmount, 
  generateOrderId,
  createPaymentConfig 
} from '@/lib/subscription/portone';
import { validateCoupon } from '@/lib/subscription/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Authorization 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 요청 바디 파싱
    const body = await request.json();
    const { planId, billingCycle, couponCode } = body as {
      planId: SubscriptionTier;
      billingCycle: 'monthly' | 'yearly';
      couponCode?: string;
    };

    // 플랜 검증
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // 무료 플랜은 결제 불필요
    if (planId === 'free') {
      return NextResponse.json({ error: 'Free plan does not require payment' }, { status: 400 });
    }

    // 쿠폰 검증
    let discountPercent = 0;
    if (couponCode) {
      const couponResult = await validateCoupon(couponCode, planId);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      }
      discountPercent = couponResult.discountPercent || 0;
    }

    // 결제 금액 계산
    const amount = calculatePaymentAmount(planId, billingCycle, discountPercent);

    // 주문 ID 생성
    const orderId = generateOrderId(user.id, planId);

    // 결제 설정 생성
    const paymentConfig = createPaymentConfig(orderId, planId, billingCycle, discountPercent);

    // 사용자 정보 추가
    const customerConfig = {
      ...paymentConfig,
      customer: {
        customerId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
    };

    return NextResponse.json({
      success: true,
      paymentConfig: customerConfig,
      orderInfo: {
        orderId,
        planId,
        planName: plan.nameKo,
        billingCycle,
        originalAmount: billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice,
        discountPercent,
        finalAmount: amount,
        couponCode: couponCode || null,
      },
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}






