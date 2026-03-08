/**
 * 구독 결제 웹훅 (커미션 자동 생성)
 * POST /api/webhooks/subscription
 * 결제 완료 시 PG사 웹훅 또는 내부 호출로 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface SubscriptionWebhookBody {
  userId: string;
  subscriptionId?: string;
  amount: number;
  plan: string;
  event?: 'subscription.created' | 'subscription.renewed' | 'payment.completed';
}

export async function POST(request: NextRequest) {
  try {
    // 웹훅 시크릿 검증 (선택적)
    const webhookSecret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn('Invalid webhook secret');
      return NextResponse.json(
        { success: false, error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    const body: SubscriptionWebhookBody = await request.json();
    const { userId, subscriptionId, amount, plan, event } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { success: false, error: 'userId와 amount가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Processing subscription event: ${event || 'unknown'}`, {
      userId,
      amount,
      plan,
    });

    const supabase = getSupabaseAdmin();

    // 1. 해당 userId의 referral 조회
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('operator_id, referral_code')
      .eq('user_id', userId)
      .single();

    if (refError || !referral) {
      console.log(`[Webhook] No referral found for user ${userId}`);
      return NextResponse.json({
        success: true,
        message: '추천인이 없는 사용자입니다.',
        commissionCreated: false,
      });
    }

    // 2. 운영자 정보 조회
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id, commission_rate, status, pending_payout, total_active_subscribers')
      .eq('id', referral.operator_id)
      .single();

    if (opError || !operator) {
      console.error(`[Webhook] Operator not found: ${referral.operator_id}`);
      return NextResponse.json(
        { success: false, error: '운영자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 운영자가 active 상태인지 확인
    if (operator.status !== 'active') {
      console.log(`[Webhook] Operator ${operator.id} is not active`);
      return NextResponse.json({
        success: true,
        message: '운영자가 활성 상태가 아닙니다.',
        commissionCreated: false,
      });
    }

    // 3. 커미션 계산
    const commissionRate = operator.commission_rate || 20;
    const commissionAmount = Math.floor(amount * (commissionRate / 100));

    console.log(`[Webhook] Calculating commission:`, {
      amount,
      commissionRate,
      commissionAmount,
    });

    // 4. commissions 테이블에 insert
    const { data: commission, error: commError } = await supabase
      .from('commissions')
      .insert({
        operator_id: operator.id,
        subscription_id: subscriptionId || null,
        user_id: userId,
        amount,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        status: 'pending',
      })
      .select()
      .single();

    if (commError) {
      console.error('[Webhook] Commission insert error:', commError);
      return NextResponse.json(
        { success: false, error: '커미션 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 5. operators.pending_payout += commission_amount
    const newPendingPayout = (operator.pending_payout || 0) + commissionAmount;
    
    // 6. total_active_subscribers 재계산
    // 이 유저가 처음 구독하는 경우만 +1
    const { count: existingCommissions } = await supabase
      .from('commissions')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .eq('user_id', userId);

    const isFirstSubscription = (existingCommissions || 0) <= 1;
    const newActiveSubscribers = isFirstSubscription
      ? (operator.total_active_subscribers || 0) + 1
      : operator.total_active_subscribers || 0;

    const { error: updateError } = await supabase
      .from('operators')
      .update({
        pending_payout: newPendingPayout,
        total_active_subscribers: newActiveSubscribers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', operator.id);

    if (updateError) {
      console.error('[Webhook] Operator update error:', updateError);
      // 롤백하지 않음 - 커미션은 이미 생성됨
    }

    console.log(`[Webhook] Commission created successfully:`, {
      commissionId: commission.id,
      commissionAmount,
      operatorId: operator.id,
    });

    return NextResponse.json({
      success: true,
      message: '커미션이 생성되었습니다.',
      commissionCreated: true,
      commission: {
        id: commission.id,
        amount: commissionAmount,
        rate: commissionRate,
      },
    });

  } catch (error) {
    console.error('[Webhook] Subscription webhook error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
