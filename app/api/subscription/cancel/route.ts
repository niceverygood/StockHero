// 구독 취소 API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelSubscription } from '@/lib/subscription/service';
import { cancelScheduledPayment } from '@/lib/subscription/portone';

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

    // 현재 구독 정보 조회
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: '활성화된 구독이 없습니다.' },
        { status: 400 }
      );
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: '이미 취소된 구독입니다.' },
        { status: 400 }
      );
    }

    // 정기결제 예약이 있으면 취소
    if (subscription.portone_subscription_id) {
      await cancelScheduledPayment(subscription.portone_subscription_id);
    }

    // 구독 취소 (기간 종료까지는 사용 가능)
    const cancelled = await cancelSubscription(user.id);

    if (!cancelled) {
      return NextResponse.json(
        { error: '구독 취소에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다. 현재 결제 기간이 종료될 때까지 서비스를 이용하실 수 있습니다.',
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}




