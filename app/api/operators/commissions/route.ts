/**
 * 운영자 커미션 내역 API
 * GET /api/operators/commissions?page=1&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCurrentUser, Commission } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface CommissionItem {
  id: string;
  amount: number;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt: string | null;
  userId: string | null;
}

interface MonthlyGroup {
  month: string; // YYYY-MM 형식
  total: number;
  items: CommissionItem[];
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
    const groupByMonth = searchParams.get('groupByMonth') === 'true';

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

    // 전체 개수
    const { count: totalCount } = await supabase
      .from('commissions')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id);

    // 커미션 목록 조회
    const { data: commissions, error: commError } = await supabase
      .from('commissions')
      .select('*')
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (commError) {
      console.error('Commissions fetch error:', commError);
      return NextResponse.json(
        { success: false, error: '데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    const commissionList = (commissions || []) as Commission[];

    // 결과 변환
    const items: CommissionItem[] = commissionList.map(c => ({
      id: c.id,
      amount: c.amount,
      commissionAmount: c.commission_amount,
      commissionRate: c.commission_rate,
      status: c.status,
      createdAt: c.created_at,
      paidAt: c.paid_at,
      userId: c.user_id ? c.user_id.substring(0, 8) + '***' : null,
    }));

    // 월별 그룹화 옵션
    if (groupByMonth) {
      const grouped: Record<string, MonthlyGroup> = {};

      items.forEach(item => {
        const month = item.createdAt.substring(0, 7); // YYYY-MM
        if (!grouped[month]) {
          grouped[month] = { month, total: 0, items: [] };
        }
        grouped[month].items.push(item);
        if (item.status !== 'cancelled') {
          grouped[month].total += item.commissionAmount;
        }
      });

      const monthlyGroups = Object.values(grouped).sort(
        (a, b) => b.month.localeCompare(a.month)
      );

      return NextResponse.json({
        success: true,
        monthlyGroups,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      });
    }

    // 통계 정보
    const stats = {
      totalCommissions: totalCount || 0,
      pendingAmount: commissionList
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commission_amount, 0),
      paidAmount: commissionList
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commission_amount, 0),
    };

    return NextResponse.json({
      success: true,
      commissions: items,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Operator commissions error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
