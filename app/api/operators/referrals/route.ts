/**
 * 운영자 추천 유저 목록 API
 * GET /api/operators/referrals?page=1&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCurrentUser } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface ReferralUser {
  id: string;
  userId: string;
  userEmail: string | null;
  createdAt: string;
  subscriptionStatus: string | null;
  totalCommission: number;
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();

    // 운영자 확인
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (opError || !operator) {
      return NextResponse.json(
        { success: false, error: '운영자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 전체 개수 조회
    const { count: totalCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id);

    // 추천 유저 목록 조회 (페이지네이션)
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id, user_id, created_at')
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (refError) {
      console.error('Referrals fetch error:', refError);
      return NextResponse.json(
        { success: false, error: '데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    const referralList = referrals || [];
    const userIds = referralList.map(r => r.user_id);

    // 유저 이메일 조회
    const userEmails: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users?.users) {
        users.users.forEach(u => {
          if (userIds.includes(u.id)) {
            userEmails[u.id] = u.email || '';
          }
        });
      }
    }

    // 구독 상태 조회
    const subscriptionStatus: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: subs } = await supabase
        .from('user_subscriptions')
        .select('user_id, status')
        .in('user_id', userIds);

      (subs || []).forEach(s => {
        subscriptionStatus[s.user_id] = s.status;
      });
    }

    // 유저별 커미션 합계
    const { data: commissions } = await supabase
      .from('commissions')
      .select('user_id, commission_amount')
      .eq('operator_id', operator.id)
      .in('user_id', userIds);

    const commissionByUser: Record<string, number> = {};
    (commissions || []).forEach(c => {
      if (c.user_id) {
        commissionByUser[c.user_id] = (commissionByUser[c.user_id] || 0) + c.commission_amount;
      }
    });

    // 결과 조합
    const result: ReferralUser[] = referralList.map(r => {
      // 이메일 마스킹
      const email = userEmails[r.user_id] || '';
      const maskedEmail = email 
        ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : null;

      return {
        id: r.id,
        userId: r.user_id.substring(0, 8) + '***',
        userEmail: maskedEmail,
        createdAt: r.created_at,
        subscriptionStatus: subscriptionStatus[r.user_id] || null,
        totalCommission: commissionByUser[r.user_id] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      referrals: result,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Operator referrals error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
