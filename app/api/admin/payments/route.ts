export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin/config';

// Supabase Admin 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
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

    // 결제 트랜잭션 조회
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('subscription_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      // 테이블이 없을 수 있음
      return NextResponse.json({
        success: true,
        payments: [],
        total: 0,
        message: '결제 내역 테이블이 없거나 비어있습니다.',
      });
    }

    // 사용자 정보와 매핑
    const userIds = Array.from(new Set(transactions?.map(t => t.user_id) || []));
    
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      if (authUsers?.users) {
        authUsers.users.forEach(u => {
          userMap[u.id] = u.email || 'Unknown';
        });
      }
    }

    const payments = (transactions || []).map(t => ({
      id: t.id,
      user_id: t.user_id,
      user_email: userMap[t.user_id] || 'Unknown',
      order_id: t.order_id,
      amount: t.amount,
      plan: t.plan_id || t.tier,
      status: t.status,
      payment_method: t.payment_method,
      created_at: t.created_at,
      completed_at: t.completed_at,
    }));

    // 통계 계산
    const stats = {
      totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      pendingTransactions: payments.filter(p => p.status === 'pending').length,
      failedTransactions: payments.filter(p => p.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      payments,
      stats,
      total: payments.length,
    });
  } catch (error) {
    console.error('Admin payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
