/**
 * 추천코드 적용 API
 * POST /api/referral/apply
 * body: { userId, referralCode }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface ApplyReferralBody {
  userId: string;
  referralCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApplyReferralBody = await request.json();
    const { userId, referralCode } = body;

    if (!userId || !referralCode) {
      return NextResponse.json(
        { success: false, error: 'userId와 referralCode가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. 이미 추천 관계가 있는지 확인
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingReferral) {
      return NextResponse.json(
        { success: false, error: '이미 추천코드가 적용된 계정입니다.' },
        { status: 400 }
      );
    }

    // 2. 추천코드로 운영자 조회
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id, status, total_referrals')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (opError || !operator) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 추천코드입니다.' },
        { status: 404 }
      );
    }

    if (operator.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '현재 사용할 수 없는 추천코드입니다.' },
        { status: 400 }
      );
    }

    // 3. referrals 테이블에 관계 기록
    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        operator_id: operator.id,
        user_id: userId,
        referral_code: referralCode.toUpperCase(),
      });

    if (refError) {
      console.error('Referral insert error:', refError);
      return NextResponse.json(
        { success: false, error: '추천 관계 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 4. operators.total_referrals +1 증가
    const { error: updateError } = await supabase
      .from('operators')
      .update({ 
        total_referrals: (operator.total_referrals || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', operator.id);

    if (updateError) {
      console.error('Operator update error:', updateError);
      // 롤백은 하지 않음 (referral 관계는 유지)
    }

    return NextResponse.json({
      success: true,
      message: '추천코드가 성공적으로 적용되었습니다.',
    });

  } catch (error) {
    console.error('Referral apply error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
