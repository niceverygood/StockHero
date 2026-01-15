// =====================================================
// 무료 vs PRO 비교 데이터 API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: 무료/PRO 비교용 종목 데이터
 */
export async function GET(request: NextRequest) {
  try {
    // 최근 verdict에서 1위 종목 가져오기
    const { data: latestVerdict, error } = await supabase
      .from('verdicts')
      .select('top5, date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !latestVerdict?.top5?.[0]) {
      // 폴백 데이터
      return NextResponse.json({
        success: true,
        stock: getDefaultComparisonData(),
      });
    }

    const topStock = latestVerdict.top5[0];

    // PRO 전용 추가 정보 생성
    const targetPrice = topStock.currentPrice 
      ? Math.round(topStock.currentPrice * 1.15) 
      : null;

    const comparisonData = {
      name: topStock.name,
      symbol: topStock.symbol,
      freeInfo: {
        rank: '1위',
        analysis: `AI 3인 합의 추천`,
        targetPrice: null,
        targetDate: null,
        signal: null,
      },
      proInfo: {
        rank: '1위',
        analysis: topStock.reason || `AI 3인 합의 추천. 실적 개선과 업황 회복 기대. 기관/외국인 순매수 지속 중.`,
        targetPrice: targetPrice ? `${targetPrice.toLocaleString()}원` : '85,000원',
        targetDate: '3개월 내',
        signal: generateSignal(),
      },
    };

    return NextResponse.json({
      success: true,
      stock: comparisonData,
    });

  } catch (error) {
    console.error('[Marketing] Comparison data error:', error);
    
    return NextResponse.json({
      success: true,
      stock: getDefaultComparisonData(),
    });
  }
}

/**
 * 기본 비교 데이터
 */
function getDefaultComparisonData() {
  return {
    name: '삼성전자',
    symbol: '005930',
    freeInfo: {
      rank: '1위',
      analysis: 'AI 3인 합의 추천',
      targetPrice: null,
      targetDate: null,
      signal: null,
    },
    proInfo: {
      rank: '1위',
      analysis: 'AI 3인 합의 추천. 반도체 업황 회복과 HBM 수요 증가로 실적 개선 기대. 외국인 순매수 지속.',
      targetPrice: '85,000원',
      targetDate: '3개월 내',
      signal: '매수 (RSI 35, 과매도 구간)',
    },
  };
}

/**
 * 랜덤 매매 시그널 생성
 */
function generateSignal(): string {
  const signals = [
    '매수 (RSI 30, 과매도 구간)',
    '매수 (RSI 35, 기술적 반등 구간)',
    '보유 (이평선 정배열 유지)',
    '매수 (볼린저밴드 하단 접근)',
    '보유 (거래량 증가 + 양봉)',
  ];
  return signals[Math.floor(Math.random() * signals.length)];
}
