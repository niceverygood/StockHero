// =====================================================
// VIP 실시간 매매 시그널 API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSubscriptionInfo } from '@/lib/subscription/guard';
import { sendBuySignal, sendSellSignal } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 시그널 타입
export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'TAKE_PROFIT' | 'STOP_LOSS';

// 시그널 강도
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK';

// 기술적 지표 기반 시그널 판단
interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; price: number };
  movingAverages: { ma5: number; ma20: number; ma60: number; price: number };
  volume: { current: number; average: number; ratio: number };
}

/**
 * 네이버 금융에서 기술적 지표 조회 (간소화)
 */
async function fetchTechnicalData(symbol: string): Promise<{
  price: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
} | null> {
  try {
    const response = await fetch(
      `https://finance.naver.com/item/main.naver?code=${symbol}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const html = await response.text();

    const priceMatch = html.match(/현재가.*?(\d{1,3}(,\d{3})*)/);
    const changeMatch = html.match(/전일대비.*?([+-]?\d+\.\d+)%/);
    const volumeMatch = html.match(/거래량.*?(\d{1,3}(,\d{3})*)/);
    const highMatch = html.match(/고가.*?(\d{1,3}(,\d{3})*)/);
    const lowMatch = html.match(/저가.*?(\d{1,3}(,\d{3})*)/);

    if (priceMatch) {
      return {
        price: parseInt(priceMatch[1].replace(/,/g, '')),
        changePercent: changeMatch ? parseFloat(changeMatch[1]) : 0,
        volume: volumeMatch ? parseInt(volumeMatch[1].replace(/,/g, '')) : 0,
        high: highMatch ? parseInt(highMatch[1].replace(/,/g, '')) : 0,
        low: lowMatch ? parseInt(lowMatch[1].replace(/,/g, '')) : 0,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * RSI 계산 (간이 버전 - 일중 변동 기반)
 */
function calculateSimpleRSI(changePercent: number, high: number, low: number, price: number): number {
  // 일중 변동폭 기반 RSI 추정
  const range = high - low;
  if (range === 0) return 50;
  
  const position = (price - low) / range;
  const baseRSI = position * 100;
  
  // 전일 대비 변동 반영
  const momentum = changePercent > 0 ? 10 : -10;
  
  return Math.min(100, Math.max(0, baseRSI + momentum));
}

/**
 * 볼린저 밴드 계산 (간이 버전)
 */
function calculateSimpleBB(price: number, high: number, low: number): {
  upper: number;
  middle: number;
  lower: number;
  position: string;
} {
  // 일중 고가/저가 기반 추정
  const range = high - low;
  const middle = (high + low) / 2;
  const upper = high + range * 0.5;
  const lower = low - range * 0.5;
  
  let position = 'MIDDLE';
  if (price >= upper) position = 'ABOVE_UPPER';
  else if (price >= middle + range * 0.3) position = 'UPPER';
  else if (price <= lower) position = 'BELOW_LOWER';
  else if (price <= middle - range * 0.3) position = 'LOWER';
  
  return { upper, middle, lower, position };
}

/**
 * 시그널 생성
 */
function generateSignal(
  price: number,
  changePercent: number,
  high: number,
  low: number,
  volume: number,
  avgVolume: number
): {
  type: SignalType;
  strength: SignalStrength;
  reason: string;
  indicators: any;
} {
  const rsi = calculateSimpleRSI(changePercent, high, low, price);
  const bb = calculateSimpleBB(price, high, low);
  const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
  
  // 시그널 판단 로직
  let type: SignalType = 'HOLD';
  let strength: SignalStrength = 'WEAK';
  let reason = '';
  
  // 매수 시그널 조건
  if (rsi <= 30 && bb.position === 'LOWER') {
    type = 'BUY';
    strength = volumeRatio > 1.5 ? 'STRONG' : 'MODERATE';
    reason = `RSI ${rsi.toFixed(0)} 과매도 + 볼린저밴드 하단 접근. ${volumeRatio > 1.5 ? '거래량 증가로 반등 가능성 높음.' : ''}`;
  } else if (rsi <= 35 && changePercent <= -3) {
    type = 'BUY';
    strength = 'MODERATE';
    reason = `RSI ${rsi.toFixed(0)} 과매도 구간 진입, 단기 반등 기대.`;
  } else if (bb.position === 'BELOW_LOWER') {
    type = 'BUY';
    strength = 'WEAK';
    reason = `볼린저밴드 하단 이탈. 기술적 반등 구간.`;
  }
  
  // 매도 시그널 조건
  if (rsi >= 70 && bb.position === 'UPPER') {
    type = 'SELL';
    strength = volumeRatio > 1.5 ? 'STRONG' : 'MODERATE';
    reason = `RSI ${rsi.toFixed(0)} 과매수 + 볼린저밴드 상단 접근. ${volumeRatio > 1.5 ? '차익 실현 매물 출회 가능.' : ''}`;
  } else if (rsi >= 75) {
    type = 'SELL';
    strength = 'MODERATE';
    reason = `RSI ${rsi.toFixed(0)} 과매수 구간. 단기 조정 가능성.`;
  } else if (bb.position === 'ABOVE_UPPER') {
    type = 'SELL';
    strength = 'WEAK';
    reason = `볼린저밴드 상단 이탈. 단기 조정 예상.`;
  }
  
  // 익절/손절 시그널
  if (changePercent >= 10) {
    type = 'TAKE_PROFIT';
    strength = 'STRONG';
    reason = `일중 +${changePercent.toFixed(1)}% 급등. 부분 익절 권장.`;
  } else if (changePercent <= -7) {
    type = 'STOP_LOSS';
    strength = 'STRONG';
    reason = `일중 ${changePercent.toFixed(1)}% 급락. 손절 검토 필요.`;
  }
  
  return {
    type,
    strength,
    reason: reason || '뚜렷한 시그널 없음. 관망 권장.',
    indicators: {
      rsi: Math.round(rsi),
      bollingerPosition: bb.position,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
    },
  };
}

/**
 * GET: 실시간 시그널 조회
 */
export async function GET(request: NextRequest) {
  try {
    // VIP 권한 체크
    const subInfo = await getSubscriptionInfo(request);
    const isVIP = subInfo?.planName === 'vip';

    if (!isVIP) {
      return NextResponse.json({
        success: false,
        error: 'VIP 전용 기능입니다.',
        upgradeUrl: '/pricing',
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const signalType = searchParams.get('type'); // BUY, SELL, ALL

    // 최근 시그널 조회
    let query = supabase
      .from('vip_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (signalType && signalType !== 'ALL') {
      query = query.eq('signal_type', signalType);
    }

    const { data: signals, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      signals: signals || [],
      count: signals?.length || 0,
    });

  } catch (error) {
    console.error('[VIP Signals] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}

/**
 * POST: 시그널 생성 (Cron 또는 수동)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 체크
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const subInfo = await getSubscriptionInfo(request);
      if (subInfo?.planName !== 'vip') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 모니터링 대상 종목 (최근 추천 종목 + VIP 종목)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: recentVerdicts } = await supabase
      .from('verdicts')
      .select('top5')
      .gte('date', weekStart.toISOString().split('T')[0]);

    const { data: vipStocks } = await supabase
      .from('vip_stocks')
      .select('symbol, name')
      .gte('week_start', weekStart.toISOString().split('T')[0]);

    // 종목 수집 (중복 제거)
    const stockMap = new Map<string, string>();
    
    recentVerdicts?.forEach((v: any) => {
      v.top5?.forEach((s: any) => stockMap.set(s.symbol, s.name));
    });
    
    vipStocks?.forEach((s: any) => {
      stockMap.set(s.symbol, s.name);
    });

    // 각 종목 분석
    const generatedSignals = [];
    const avgVolume = 1000000; // 기본 평균 거래량 (실제로는 DB에서 조회)

    for (const [symbol, name] of Array.from(stockMap.entries())) {
      const techData = await fetchTechnicalData(symbol);
      if (!techData) continue;

      const signal = generateSignal(
        techData.price,
        techData.changePercent,
        techData.high,
        techData.low,
        techData.volume,
        avgVolume
      );

      // HOLD가 아닌 시그널만 저장
      if (signal.type !== 'HOLD') {
        const signalData = {
          symbol,
          name,
          signal_type: signal.type,
          strength: signal.strength,
          current_price: techData.price,
          change_percent: techData.changePercent,
          reason: signal.reason,
          indicators: signal.indicators,
        };

        // 중복 체크 (30분 이내 동일 종목/시그널 방지)
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const { data: existing } = await supabase
          .from('vip_signals')
          .select('id')
          .eq('symbol', symbol)
          .eq('signal_type', signal.type)
          .gte('created_at', thirtyMinutesAgo.toISOString())
          .limit(1);

        if (!existing || existing.length === 0) {
          // DB 저장
          const { error: insertError } = await supabase
            .from('vip_signals')
            .insert(signalData);

          if (!insertError) {
            generatedSignals.push(signalData);

            // 알림 발송
            if (signal.type === 'BUY' && signal.strength !== 'WEAK') {
              await sendBuySignal({
                name,
                symbol,
                currentPrice: techData.price,
                targetPrice: Math.round(techData.price * 1.1),
                reason: signal.reason,
              });
            } else if (signal.type === 'SELL' && signal.strength !== 'WEAK') {
              await sendSellSignal({
                name,
                symbol,
                currentPrice: techData.price,
                entryPrice: techData.price,
                returnPercent: techData.changePercent,
                reason: signal.reason,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated: generatedSignals.length,
      signals: generatedSignals,
    });

  } catch (error) {
    console.error('[VIP Signals] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate signals' },
      { status: 500 }
    );
  }
}
