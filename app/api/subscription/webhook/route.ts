// 포트원 웹훅 API - 결제 상태 변경 알림 수신

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPaymentStatus } from '@/lib/subscription/portone';
import { syncSubscriptionStatus } from '@/lib/subscription/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 웹훅 시크릿 검증
function verifyWebhookSignature(signature: string | null, body: string): boolean {
  // 실제 프로덕션에서는 포트원에서 제공하는 시크릿으로 검증해야 함
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('PORTONE_WEBHOOK_SECRET not configured');
    return true; // 개발 환경에서는 스킵
  }
  
  // TODO: HMAC 검증 구현
  return true;
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-portone-signature');
    const body = await request.text();
    
    // 시그니처 검증
    if (!verifyWebhookSignature(signature, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const webhook = JSON.parse(body);
    console.log('[Webhook] Received:', webhook.type);

    switch (webhook.type) {
      case 'Transaction.Paid':
        await handlePaymentPaid(webhook.data);
        break;
      
      case 'Transaction.Failed':
        await handlePaymentFailed(webhook.data);
        break;
      
      case 'Transaction.Cancelled':
        await handlePaymentCancelled(webhook.data);
        break;
      
      case 'BillingKey.Deleted':
        await handleBillingKeyDeleted(webhook.data);
        break;
      
      default:
        console.log('[Webhook] Unhandled event type:', webhook.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// 결제 완료 처리
async function handlePaymentPaid(data: any) {
  const { paymentId } = data;
  
  // 결제 정보 조회
  const { data: payment } = await supabase
    .from('payments')
    .select('user_id, subscription_id')
    .eq('portone_payment_id', paymentId)
    .single();

  if (payment) {
    // 결제 상태 업데이트
    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('portone_payment_id', paymentId);

    // 구독 상태 활성화
    await syncSubscriptionStatus(payment.user_id, 'active');
  }
}

// 결제 실패 처리
async function handlePaymentFailed(data: any) {
  const { paymentId, failureReason } = data;
  
  const { data: payment } = await supabase
    .from('payments')
    .select('user_id')
    .eq('portone_payment_id', paymentId)
    .single();

  if (payment) {
    // 결제 상태 업데이트
    await supabase
      .from('payments')
      .update({ 
        status: 'failed', 
        failure_reason: failureReason 
      })
      .eq('portone_payment_id', paymentId);

    // 구독 상태를 past_due로 변경
    await syncSubscriptionStatus(payment.user_id, 'past_due');
  }
}

// 결제 취소/환불 처리
async function handlePaymentCancelled(data: any) {
  const { paymentId } = data;
  
  await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('portone_payment_id', paymentId);
}

// 빌링키 삭제 처리
async function handleBillingKeyDeleted(data: any) {
  const { billingKey } = data;
  
  await supabase
    .from('subscriptions')
    .update({ 
      portone_billing_key: null,
      status: 'cancelled' 
    })
    .eq('portone_billing_key', billingKey);
}






