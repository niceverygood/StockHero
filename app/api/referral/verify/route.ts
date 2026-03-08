/**
 * 추천코드 검증 API
 * GET /api/referral/verify?code=XXXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '추천코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 추천코드로 운영자 조회
    const { data: operator, error } = await supabase
      .from('operators')
      .select('id, name, status, referral_code')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (error || !operator) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 추천코드입니다.', valid: false },
        { status: 404 }
      );
    }

    // 운영자 상태 확인 (active만 허용)
    if (operator.status !== 'active') {
      return NextResponse.json(
        { 
          success: false, 
          error: '현재 사용할 수 없는 추천코드입니다.',
          valid: false 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      operatorName: operator.name,
      referralCode: operator.referral_code,
    });

  } catch (error) {
    console.error('Referral verify error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
