/**
 * 운영자 대시보드 API
 * GET /api/operators/dashboard
 * 운영자의 대시보드 데이터를 한 번에 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCurrentUser, Operator } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalReferrals: number;
  activeSubscribers: number;
  thisMonthNew: number;
  conversionRate: number;
}

interface DashboardEarnings {
  thisMonth: number;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
}

interface RecentReferral {
  userId: string;
  createdAt: string;
  hasSubscription: boolean;
  email?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. 운영자 정보 조회
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (opError || !operator) {
      return NextResponse.json(
        { success: false, error: '운영자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 이번 달 시작/끝 계산 (KST)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // 3. 전체 추천 유저 조회
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id, user_id, created_at')
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: false });

    if (refError) {
      console.error('Referrals fetch error:', refError);
    }

    const allReferrals = referrals || [];
    const totalReferrals = allReferrals.length;

    // 이번 달 신규 추천
    const thisMonthNew = allReferrals.filter(
      r => new Date(r.created_at) >= startOfMonth
    ).length;

    // 4. 구독 중인 유저 수 (referrals의 user_id와 subscriptions 조인)
    let activeSubscribers = 0;
    const referralUserIds = allReferrals.map(r => r.user_id);

    if (referralUserIds.length > 0) {
      // subscriptions 또는 user_subscriptions 테이블 확인
      const { data: subs, error: subError } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .in('user_id', referralUserIds)
        .in('status', ['active', 'trial']);

      if (!subError && subs) {
        activeSubscribers = subs.length;
      } else {
        // fallback: subscriptions 테이블 시도
        const { data: fallbackSubs } = await supabase
          .from('subscriptions')
          .select('user_id')
          .in('user_id', referralUserIds)
          .eq('status', 'active');
        
        if (fallbackSubs) {
          activeSubscribers = fallbackSubs.length;
        }
      }
    }

    // 전환율 계산
    const conversionRate = totalReferrals > 0 
      ? Math.round((activeSubscribers / totalReferrals) * 1000) / 10 
      : 0;

    // 5. 커미션 정보 조회
    const { data: commissions, error: commError } = await supabase
      .from('commissions')
      .select('*')
      .eq('operator_id', operator.id);

    if (commError) {
      console.error('Commissions fetch error:', commError);
    }

    const allCommissions = commissions || [];

    // 이번 달 커미션
    const thisMonthCommissions = allCommissions.filter(
      c => new Date(c.created_at) >= startOfMonth && c.status !== 'cancelled'
    );
    const thisMonthEarnings = thisMonthCommissions.reduce(
      (sum, c) => sum + (c.commission_amount || 0), 0
    );

    // 전체 수익 (paid만)
    const paidCommissions = allCommissions.filter(c => c.status === 'paid');
    const paidOut = paidCommissions.reduce(
      (sum, c) => sum + (c.commission_amount || 0), 0
    );

    // 대기 중 (pending)
    const pendingCommissions = allCommissions.filter(c => c.status === 'pending');
    const pendingPayout = pendingCommissions.reduce(
      (sum, c) => sum + (c.commission_amount || 0), 0
    );

    // 6. 최근 추천 유저 (최대 10명)
    const recentReferrals: RecentReferral[] = allReferrals.slice(0, 10).map(r => ({
      userId: r.user_id,
      createdAt: r.created_at,
      hasSubscription: false, // 아래에서 업데이트
    }));

    // 구독 여부 체크
    if (recentReferrals.length > 0) {
      const recentUserIds = recentReferrals.map(r => r.userId);
      const { data: recentSubs } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .in('user_id', recentUserIds)
        .in('status', ['active', 'trial']);

      const activeUserIds = new Set((recentSubs || []).map(s => s.user_id));
      recentReferrals.forEach(r => {
        r.hasSubscription = activeUserIds.has(r.userId);
      });
    }

    // 7. 응답 구성
    const stats: DashboardStats = {
      totalReferrals,
      activeSubscribers,
      thisMonthNew,
      conversionRate,
    };

    const earnings: DashboardEarnings = {
      thisMonth: thisMonthEarnings,
      totalEarnings: operator.total_earnings || (paidOut + pendingPayout),
      pendingPayout: operator.pending_payout || pendingPayout,
      paidOut,
    };

    return NextResponse.json({
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        referral_code: operator.referral_code,
        tier: operator.tier,
        commission_rate: operator.commission_rate,
        status: operator.status,
      },
      stats,
      earnings,
      recentReferrals,
    });

  } catch (error) {
    console.error('Operator dashboard error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
