/**
 * 운영자 내 정보 API
 * GET /api/operators/me - 내 운영자 정보 조회
 * PUT /api/operators/me - 내 정보 수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCurrentUser, Operator } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

// GET: 현재 로그인 유저의 운영자 정보 반환
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

    const { data: operator, error } = await supabase
      .from('operators')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !operator) {
      return NextResponse.json(
        { success: false, error: 'Not an operator', isOperator: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isOperator: true,
      operator: operator as Operator,
    });

  } catch (error) {
    console.error('Operator me GET error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 운영자 정보 수정
interface UpdateBody {
  phone?: string;
  channelName?: string;
  channelUrl?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
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

    const body: UpdateBody = await request.json();
    const { phone, channelName, channelUrl, bankName, bankAccount, bankHolder } = body;

    const supabase = getSupabaseAdmin();

    // 운영자인지 확인
    const { data: operator, error: findError } = await supabase
      .from('operators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (findError || !operator) {
      return NextResponse.json(
        { success: false, error: '운영자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 필드만 추출
    const updateData: Record<string, any> = {};
    if (phone !== undefined) updateData.phone = phone || null;
    if (channelName !== undefined) updateData.channel_name = channelName || null;
    if (channelUrl !== undefined) updateData.channel_url = channelUrl || null;
    if (bankName !== undefined) updateData.bank_name = bankName;
    if (bankAccount !== undefined) updateData.bank_account = bankAccount;
    if (bankHolder !== undefined) updateData.bank_holder = bankHolder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 정보가 없습니다.' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('operators')
      .update(updateData)
      .eq('id', operator.id)
      .select()
      .single();

    if (updateError) {
      console.error('Operator update error:', updateError);
      return NextResponse.json(
        { success: false, error: '정보 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '정보가 수정되었습니다.',
      operator: updated as Operator,
    });

  } catch (error) {
    console.error('Operator me PUT error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
