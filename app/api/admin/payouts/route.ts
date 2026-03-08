/**
 * 관리자: 정산 API
 * GET /api/admin/payouts - 정산 현황 조회
 * POST /api/admin/payouts - 일괄 정산 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCurrentUser, isAdmin } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

// GET: 정산 현황 요약
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 전체 커미션 통계
    const { data: allCommissions, error: commError } = await supabase
      .from('commissions')
      .select('operator_id, commission_amount, status, created_at');

    if (commError) {
      console.error('Commissions fetch error:', commError);
      return NextResponse.json(
        { success: false, error: '데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    const commissions = allCommissions || [];

    // 전체 통계
    const totalPending = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const totalPaid = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const totalCancelled = commissions
      .filter(c => c.status === 'cancelled')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    // 이번 달 통계
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCommissions = commissions.filter(
      c => new Date(c.created_at) >= startOfMonth
    );

    const thisMonthTotal = thisMonthCommissions
      .filter(c => c.status !== 'cancelled')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    // 운영자별 대기 금액
    const { data: operators, error: opError } = await supabase
      .from('operators')
      .select('id, name, email, pending_payout, status')
      .gt('pending_payout', 0)
      .order('pending_payout', { ascending: false });

    if (opError) {
      console.error('Operators fetch error:', opError);
    }

    const pendingByOperator = (operators || []).map(op => ({
      operatorId: op.id,
      operatorName: op.name,
      operatorEmail: op.email,
      operatorStatus: op.status,
      pendingAmount: op.pending_payout || 0,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalPending,
        totalPaid,
        totalCancelled,
        totalAll: totalPending + totalPaid,
        thisMonth: thisMonthTotal,
        pendingCount: commissions.filter(c => c.status === 'pending').length,
        paidCount: commissions.filter(c => c.status === 'paid').length,
      },
      pendingByOperator,
    });

  } catch (error) {
    console.error('Admin payouts GET error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 일괄 정산 처리
interface PayoutBody {
  operatorIds?: string[]; // 특정 운영자만 정산, 없으면 전체
  confirm: boolean; // 확인 플래그
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body: PayoutBody = await request.json();
    const { operatorIds, confirm } = body;

    if (!confirm) {
      return NextResponse.json(
        { success: false, error: '정산 확인이 필요합니다. confirm: true를 전달해주세요.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. 대기 중인 커미션 조회
    let query = supabase
      .from('commissions')
      .select('id, operator_id, commission_amount')
      .eq('status', 'pending');

    if (operatorIds && operatorIds.length > 0) {
      query = query.in('operator_id', operatorIds);
    }

    const { data: pendingCommissions, error: pendError } = await query;

    if (pendError) {
      console.error('Pending commissions fetch error:', pendError);
      return NextResponse.json(
        { success: false, error: '대기 커미션 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '정산할 커미션이 없습니다.',
        processed: 0,
      });
    }

    // 2. 운영자별로 그룹화
    const byOperator: Record<string, { ids: string[]; total: number }> = {};
    
    pendingCommissions.forEach(c => {
      if (!byOperator[c.operator_id]) {
        byOperator[c.operator_id] = { ids: [], total: 0 };
      }
      byOperator[c.operator_id].ids.push(c.id);
      byOperator[c.operator_id].total += c.commission_amount || 0;
    });

    const now = new Date().toISOString();
    let totalProcessed = 0;
    let totalAmount = 0;
    const errors: string[] = [];

    // 3. 각 운영자별 처리
    for (const [operatorId, data] of Object.entries(byOperator)) {
      try {
        // 커미션 상태 변경: pending -> paid
        const { error: updateCommError } = await supabase
          .from('commissions')
          .update({ status: 'paid', paid_at: now })
          .in('id', data.ids);

        if (updateCommError) {
          errors.push(`Operator ${operatorId}: 커미션 업데이트 실패`);
          continue;
        }

        // 운영자 정보 업데이트
        const { data: operator } = await supabase
          .from('operators')
          .select('pending_payout, total_earnings')
          .eq('id', operatorId)
          .single();

        if (operator) {
          const newTotalEarnings = (operator.total_earnings || 0) + data.total;
          const newPendingPayout = Math.max(0, (operator.pending_payout || 0) - data.total);

          await supabase
            .from('operators')
            .update({
              total_earnings: newTotalEarnings,
              pending_payout: newPendingPayout,
              updated_at: now,
            })
            .eq('id', operatorId);
        }

        totalProcessed += data.ids.length;
        totalAmount += data.total;

      } catch (err) {
        console.error(`Payout error for operator ${operatorId}:`, err);
        errors.push(`Operator ${operatorId}: 처리 중 오류`);
      }
    }

    console.log(`[Admin] Payout processed by ${user.email}:`, {
      totalProcessed,
      totalAmount,
      operatorCount: Object.keys(byOperator).length,
    });

    return NextResponse.json({
      success: true,
      message: '정산이 완료되었습니다.',
      processed: totalProcessed,
      totalAmount,
      operatorCount: Object.keys(byOperator).length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Admin payouts POST error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
