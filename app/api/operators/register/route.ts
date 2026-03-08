/**
 * 운영자 가입 신청 API
 * POST /api/operators/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getSupabaseAdmin, 
  generateReferralCode, 
  getCurrentUser 
} from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  name: string;
  email: string;
  phone?: string;
  channelName?: string;
  channelUrl?: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 로그인 확인
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: RegisterBody = await request.json();
    const { name, email, phone, channelName, channelUrl, bankName, bankAccount, bankHolder } = body;

    // 2. 필수 필드 검증
    if (!name || !email || !bankName || !bankAccount || !bankHolder) {
      return NextResponse.json(
        { success: false, error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 3. 이미 운영자로 등록되어 있는지 확인 (user_id 또는 email)
    const { data: existingByUserId } = await supabase
      .from('operators')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (existingByUserId) {
      const statusMsg = existingByUserId.status === 'pending' 
        ? '이미 가입 신청 중입니다. 관리자 승인을 기다려주세요.'
        : '이미 운영자로 등록되어 있습니다.';
      return NextResponse.json(
        { success: false, error: statusMsg },
        { status: 400 }
      );
    }

    const { data: existingByEmail } = await supabase
      .from('operators')
      .select('id')
      .eq('email', email)
      .single();

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      );
    }

    // 4. 추천코드 생성 (중복 방지)
    let referralCode = generateReferralCode(name);
    let attempts = 0;
    
    while (attempts < 10) {
      const { data: codeExists } = await supabase
        .from('operators')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!codeExists) break;
      
      referralCode = generateReferralCode(name);
      attempts++;
    }

    // 5. 운영자 정보 삽입
    const { data: newOperator, error: insertError } = await supabase
      .from('operators')
      .insert({
        user_id: user.id,
        name,
        email,
        phone: phone || null,
        referral_code: referralCode,
        commission_rate: 20.00, // 초기 브론즈 등급
        tier: 'bronze',
        channel_name: channelName || null,
        channel_url: channelUrl || null,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        status: 'pending',
        total_referrals: 0,
        total_active_subscribers: 0,
        total_earnings: 0,
        pending_payout: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Operator insert error:', insertError);
      return NextResponse.json(
        { success: false, error: '운영자 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '운영자 가입 신청이 완료되었습니다. 관리자 승인 후 활동이 가능합니다.',
      operator: {
        id: newOperator.id,
        name: newOperator.name,
        referralCode: newOperator.referral_code,
        status: newOperator.status,
      },
    });

  } catch (error) {
    console.error('Operator register error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
