// =====================================================
// 놓친 기회 데이터 API (FOMO 마케팅용)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 네이버 금융에서 현재가 조회
 */
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://finance.naver.com/item/main.naver?code=${symbol}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const html = await response.text();
    const priceMatch = html.match(/현재가.*?(\d{1,3}(,\d{3})*)/);
    if (priceMatch) {
      return parseInt(priceMatch[1].replace(/,/g, ''));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * GET: 놓친 기회 데이터 조회
 * - 최근 알림 중 급등한 종목들
 */
export async function GET(request: NextRequest) {
  try {
    // 최근 7일간의 급등/매수 알림 조회
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 최근 verdicts에서 급등 종목 찾기
    const { data: recentVerdicts, error } = await supabase
      .from('verdicts')
      .select('top5, date')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(7);

    if (error) throw error;

    // 추천 종목들의 현재가 조회 및 수익률 계산
    const missedStocks = [];

    for (const verdict of recentVerdicts || []) {
      for (const stock of verdict.top5 || []) {
        const currentPrice = await fetchCurrentPrice(stock.symbol);
        if (!currentPrice) continue;

        // 추천 당시 가격 (firstRecommendPrice가 있으면 사용)
        const alertPrice = stock.firstRecommendPrice || stock.currentPrice || currentPrice;
        const changePercent = ((currentPrice - alertPrice) / alertPrice) * 100;

        // +5% 이상 상승한 종목만 포함
        if (changePercent >= 5) {
          missedStocks.push({
            name: stock.name,
            symbol: stock.symbol,
            alertPrice,
            currentPrice,
            changePercent: Math.round(changePercent * 10) / 10,
            alertTime: formatAlertTime(verdict.date),
            alertType: changePercent >= 10 ? 'PRICE_SURGE' : 'BUY_SIGNAL',
          });
        }
      }
    }

    // 수익률 높은 순으로 정렬, 상위 5개
    const sortedStocks = missedStocks
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    // 데이터가 없으면 폴백 데이터 생성
    if (sortedStocks.length === 0) {
      return NextResponse.json({
        success: true,
        stocks: [
          {
            name: 'HD현대일렉트릭',
            symbol: '267260',
            alertPrice: 285000,
            currentPrice: 312000,
            changePercent: 9.5,
            alertTime: '어제 오전 10:45',
            alertType: 'BUY_SIGNAL',
          },
        ],
        isFallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      stocks: sortedStocks,
    });
  } catch (error) {
    console.error('[Marketing] Missed opportunities error:', error);
    
    // 폴백 데이터 반환
    return NextResponse.json({
      success: true,
      stocks: [
        {
          name: '두산에너빌리티',
          symbol: '034020',
          alertPrice: 18500,
          currentPrice: 21200,
          changePercent: 14.6,
          alertTime: '어제 오후 2:30',
          alertType: 'PRICE_SURGE',
        },
      ],
      isFallback: true,
    });
  }
}

/**
 * 알림 시간 포맷팅
 */
function formatAlertTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘 오전 9:00';
  if (diffDays === 1) return '어제 오전 9:00';
  if (diffDays < 7) return `${diffDays}일 전 오전 9:00`;
  
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
