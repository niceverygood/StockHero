export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin, SubscriptionTier } from '@/lib/admin/config';

// Supabase Admin 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    // 현재 사용자 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 요청 바디에서 tier 추출
    const body = await request.json();
    const { tier } = body as { tier: SubscriptionTier };

    if (!tier || !['free', 'premium', 'pro', 'vip'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // 구독 정보 upsert
    const expiresAt = tier === 'free' ? null : '2099-12-31T23:59:59Z';
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier,
        is_active: true,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // 대상 사용자 이메일 조회
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    return NextResponse.json({
      success: true,
      message: `${targetUser?.user?.email}을(를) ${tier.toUpperCase()}로 변경했습니다.`,
      subscription: data,
    });
  } catch (error) {
    console.error('Admin upgrade API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
