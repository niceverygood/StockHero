/**
 * 관리자: 운영자 목록 및 관리 API
 * GET /api/admin/operators - 전체 운영자 목록
 * PUT /api/admin/operators - 운영자 승인/정지/배분율 조정
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getSupabaseAdmin, 
  getCurrentUser, 
  isAdmin, 
  Operator 
} from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

// GET: 전체 운영자 목록 (관리자만)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, active, suspended
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();

    // 쿼리 빌드
    let query = supabase
      .from('operators')
      .select('*', { count: 'exact' });

    if (status && ['pending', 'active', 'suspended'].includes(status)) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: operators, count, error } = await query;

    if (error) {
      console.error('Admin operators fetch error:', error);
      return NextResponse.json(
        { success: false, error: '데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 통계
    const { data: stats } = await supabase
      .from('operators')
      .select('status');

    const statusCounts = {
      total: stats?.length || 0,
      pending: stats?.filter(o => o.status === 'pending').length || 0,
      active: stats?.filter(o => o.status === 'active').length || 0,
      suspended: stats?.filter(o => o.status === 'suspended').length || 0,
    };

    return NextResponse.json({
      success: true,
      operators: operators as Operator[],
      statusCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Admin operators GET error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 운영자 승인/정지/배분율 조정
interface UpdateOperatorBody {
  operatorId: string;
  status?: 'pending' | 'active' | 'suspended';
  commissionRate?: number;
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body: UpdateOperatorBody = await request.json();
    const { operatorId, status, commissionRate } = body;

    if (!operatorId) {
      return NextResponse.json(
        { success: false, error: 'operatorId가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 운영자 존재 확인
    const { data: existing, error: findError } = await supabase
      .from('operators')
      .select('id, name, status')
      .eq('id', operatorId)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { success: false, error: '운영자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status && ['pending', 'active', 'suspended'].includes(status)) {
      updateData.status = status;
    }

    if (commissionRate !== undefined) {
      if (commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json(
          { success: false, error: '커미션 비율은 0~100 사이여야 합니다.' },
          { status: 400 }
        );
      }
      updateData.commission_rate = commissionRate;
    }

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json(
        { success: false, error: '변경할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('operators')
      .update(updateData)
      .eq('id', operatorId)
      .select()
      .single();

    if (updateError) {
      console.error('Operator update error:', updateError);
      return NextResponse.json(
        { success: false, error: '운영자 정보 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 상태 변경 로깅
    if (status) {
      console.log(`[Admin] Operator ${existing.name} (${operatorId}) status changed: ${existing.status} -> ${status}`);
    }

    return NextResponse.json({
      success: true,
      message: '운영자 정보가 수정되었습니다.',
      operator: updated as Operator,
    });

  } catch (error) {
    console.error('Admin operators PUT error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
