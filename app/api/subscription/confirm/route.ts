// 결제 확인 API - 결제 완료 후 구독 활성화

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionTier } from '@/lib/subscription/config';
import { getPaymentStatus } from '@/lib/subscription/portone';
import { 
  createOrUpdateSubscription, 
  recordPayment,
  redeemCoupon 
} from '@/lib/subscription/service';

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
    const { paymentId, planId, billingCycle, couponCode } = body as {
      paymentId: string;
      planId: SubscriptionTier;
      billingCycle: 'monthly' | 'yearly';
      couponCode?: string;
    };

    // 포트원에서 결제 상태 확인
    const paymentStatus = await getPaymentStatus(paymentId);

    if (paymentStatus.status !== 'PAID') {
      return NextResponse.json(
        { error: '결제가 완료되지 않았습니다.', status: paymentStatus.status },
        { status: 400 }
      );
    }

    // 구독 생성/업데이트
    const subscription = await createOrUpdateSubscription(
      user.id,
      planId,
      billingCycle
    );

    if (!subscription) {
      return NextResponse.json(
        { error: '구독 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 결제 기록 저장
    await recordPayment(
      user.id,
      subscription.id,
      paymentStatus.amount?.total || 0,
      planId,
      billingCycle,
      paymentId,
      paymentStatus.txId || ''
    );

    // 쿠폰 사용 처리
    if (couponCode) {
      await redeemCoupon(couponCode, user.id);
    }

    return NextResponse.json({
      success: true,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}




