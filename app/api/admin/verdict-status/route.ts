export const dynamic = 'force-dynamic';
/**
 * AI 3대장 verdict 최근 생성 이력 (관리자 전용)
 * - 크론이 매일 새로 생성하는지, 같은 결과만 나오는 원인 확인용
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 30, 100);

    // 공통 컬럼만 조회 (slot은 010 마이그레이션 후 있을 수 있음)
    const { data: rows, error } = await supabase
      .from('verdicts')
      .select('id, date, consensus_summary, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows || []).map((r: any) => ({
      ...r,
      slot: (r as any).slot ?? 'morning',
    }));
    const dates = Array.from(new Set(list.map((r: any) => r.date)));

    return NextResponse.json({
      success: true,
      verdicts: list,
      totalCount: list.length,
      uniqueDates: dates.length,
      dateRange: list.length
        ? { first: list[list.length - 1].date, last: list[0].date }
        : null,
      message:
        list.length === 0
          ? '저장된 verdict가 없습니다. 크론이 한 번도 성공하지 않았을 수 있습니다.'
          : dates.length <= 1 && list.length > 0
            ? '날짜가 하나뿐이면 크론이 매일 돌지 않거나, 같은 날짜만 계속 저장되고 있을 수 있습니다.'
            : undefined,
    });
  } catch (error: any) {
    console.error('Verdict status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch verdict status' },
      { status: 500 }
    );
  }
}
