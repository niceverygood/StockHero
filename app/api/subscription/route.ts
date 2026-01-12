// 구독 정보 조회 API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // 토큰으로 사용자 조회
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 구독 정보 조회
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 구독이 없으면 free 플랜 반환
    if (error || !subscription) {
      const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free')!;
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        plan: freePlan,
        subscription: null,
      });
    }

    // 구독 기간 만료 체크
    let effectiveTier = subscription.tier;
    let effectiveStatus = subscription.status;
    
    if (subscription.current_period_end) {
      const endDate = new Date(subscription.current_period_end);
      if (endDate < new Date() && subscription.status === 'active') {
        effectiveTier = 'free';
        effectiveStatus = 'expired';
      }
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === effectiveTier)!;

    return NextResponse.json({
      tier: effectiveTier,
      status: effectiveStatus,
      plan,
      subscription: {
        id: subscription.id,
        billingCycle: subscription.billing_cycle,
        startedAt: subscription.started_at,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelledAt: subscription.cancelled_at,
      },
    });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






