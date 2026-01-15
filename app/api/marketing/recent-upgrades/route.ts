// =====================================================
// 최근 업그레이드 데이터 API (소셜 프루프용)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 랜덤 한국 이름 생성
function generateMaskedName(): string {
  const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${lastName}**`;
}

/**
 * GET: 최근 업그레이드 이벤트 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 최근 24시간 내 업그레이드 조회
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentUpgrades, error } = await supabase
      .from('subscription_transactions')
      .select(`
        id,
        user_id,
        plan_id,
        amount,
        created_at,
        subscription_plans!inner(name)
      `)
      .eq('status', 'completed')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      // 테이블이 없거나 에러 시 시뮬레이션 데이터 반환
      return NextResponse.json({
        success: true,
        upgrades: generateSimulatedUpgrades(),
        isSimulated: true,
      });
    }

    // 실제 데이터가 있는 경우
    if (recentUpgrades && recentUpgrades.length > 0) {
      const upgrades = recentUpgrades.map((upgrade: any) => ({
        id: upgrade.id,
        maskedName: generateMaskedName(),
        plan: upgrade.subscription_plans?.name || 'pro',
        timestamp: upgrade.created_at,
      }));

      return NextResponse.json({
        success: true,
        upgrades,
        isSimulated: false,
      });
    }

    // 실제 데이터가 없으면 시뮬레이션
    return NextResponse.json({
      success: true,
      upgrades: generateSimulatedUpgrades(),
      isSimulated: true,
    });

  } catch (error) {
    console.error('[Marketing] Recent upgrades error:', error);
    
    return NextResponse.json({
      success: true,
      upgrades: generateSimulatedUpgrades(),
      isSimulated: true,
    });
  }
}

/**
 * 시뮬레이션 업그레이드 데이터 생성
 * - 실제 업그레이드 패턴을 기반으로 자연스럽게 생성
 */
function generateSimulatedUpgrades() {
  const plans = ['basic', 'pro', 'vip'];
  const weights = [0.3, 0.5, 0.2]; // PRO가 가장 많음
  
  // 랜덤하게 1-3개 생성
  const count = Math.floor(Math.random() * 3) + 1;
  const upgrades = [];

  for (let i = 0; i < count; i++) {
    // 가중치 기반 플랜 선택
    const random = Math.random();
    let plan = 'pro';
    let cumulative = 0;
    for (let j = 0; j < plans.length; j++) {
      cumulative += weights[j];
      if (random < cumulative) {
        plan = plans[j];
        break;
      }
    }

    // 최근 몇 분 전으로 설정
    const minutesAgo = Math.floor(Math.random() * 60) + 1;
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

    upgrades.push({
      id: `sim-${Date.now()}-${i}`,
      maskedName: generateMaskedName(),
      plan,
      timestamp: timestamp.toISOString(),
    });
  }

  return upgrades;
}
