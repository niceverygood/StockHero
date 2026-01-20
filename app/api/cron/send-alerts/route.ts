// =====================================================
// 알림 발송 Cron Job (Vercel Cron)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendMorningBriefing,
  sendPriceSurgeAlert,
  sendPriceDropAlert,
  sendBuySignal,
  sendSellSignal,
  sendVIPStockAlert,
  cleanupOldNotifications,
} from '@/lib/notification-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vercel Cron 설정 (vercel.json에 추가 필요)
// {
//   "crons": [
//     { "path": "/api/cron/send-alerts?type=morning", "schedule": "0 23 * * *" }, // UTC 23:00 = KST 08:00
//     { "path": "/api/cron/send-alerts?type=realtime", "schedule": "*/5 9-15 * * 1-5" }, // 평일 장중 5분마다
//     { "path": "/api/cron/send-alerts?type=cleanup", "schedule": "0 0 * * 0" } // 매주 일요일 자정
//   ]
// }

/**
 * 네이버 금융에서 현재가 조회
 */
async function fetchCurrentPrice(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const response = await fetch(
      `https://finance.naver.com/item/main.naver?code=${symbol}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const html = await response.text();

    const priceMatch = html.match(/현재가.*?(\d{1,3}(,\d{3})*)/);
    const changeMatch = html.match(/전일대비.*?([+-]?\d+\.\d+)%/);

    if (priceMatch) {
      return {
        price: parseInt(priceMatch[1].replace(/,/g, '')),
        changePercent: changeMatch ? parseFloat(changeMatch[1]) : 0,
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

/**
 * 모닝 브리핑 발송 (매일 오전 8시 KST)
 */
async function sendMorningBriefingAlert(): Promise<{ success: boolean; count: number }> {
  try {
    // 오늘의 추천 종목 조회
    const today = new Date().toISOString().split('T')[0];
    const { data: verdict } = await supabase
      .from('verdicts')
      .select('top5')
      .eq('date', today)
      .single();

    if (!verdict?.top5 || verdict.top5.length === 0) {
      console.log('[MorningBriefing] No recommendations for today');
      return { success: false, count: 0 };
    }

    // 현재가 업데이트
    const stocksWithPrices = await Promise.all(
      verdict.top5.slice(0, 5).map(async (stock: any) => {
        const priceData = await fetchCurrentPrice(stock.symbol);
        return {
          name: stock.name,
          symbol: stock.symbol,
          returnPercent: priceData?.changePercent || 0,
        };
      })
    );

    const result = await sendMorningBriefing(stocksWithPrices);
    console.log(`[MorningBriefing] Sent to ${result.success} users, ${result.failed} failed`);

    return { success: true, count: result.success };
  } catch (error) {
    console.error('[MorningBriefing] Error:', error);
    return { success: false, count: 0 };
  }
}

/**
 * 실시간 가격 알림 (장중 5분마다)
 */
async function sendRealtimePriceAlerts(): Promise<{ surges: number; drops: number }> {
  let surges = 0;
  let drops = 0;

  try {
    // 최근 7일 추천 종목 조회
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: verdicts } = await supabase
      .from('verdicts')
      .select('top5')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    if (!verdicts) return { surges: 0, drops: 0 };

    // 추천 종목 중복 제거
    const stockMap = new Map<string, { name: string; symbol: string }>();
    verdicts.forEach((v: any) => {
      v.top5?.forEach((stock: any) => {
        stockMap.set(stock.symbol, { name: stock.name, symbol: stock.symbol });
      });
    });

    // 최근 알림 발송 기록 확인 (30분 내 중복 방지)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const { data: recentAlerts } = await supabase
      .from('notifications')
      .select('data')
      .in('type', ['PRICE_SURGE', 'PRICE_DROP'])
      .gte('created_at', thirtyMinutesAgo.toISOString());

    const recentAlertedSymbols = new Set(
      recentAlerts?.map((a: any) => a.data?.symbol).filter(Boolean) || []
    );

    // 각 종목 가격 확인
    for (const [symbol, stock] of Array.from(stockMap.entries())) {
      // 30분 내 이미 알림 발송한 종목 스킵
      if (recentAlertedSymbols.has(symbol)) continue;

      const priceData = await fetchCurrentPrice(symbol);
      if (!priceData) continue;

      // 급등 알림 (+5% 이상)
      if (priceData.changePercent >= 5) {
        await sendPriceSurgeAlert({
          ...stock,
          changePercent: priceData.changePercent,
          currentPrice: priceData.price,
        });
        surges++;
      }
      // 급락 알림 (-5% 이하)
      else if (priceData.changePercent <= -5) {
        await sendPriceDropAlert({
          ...stock,
          changePercent: priceData.changePercent,
          currentPrice: priceData.price,
        });
        drops++;
      }
    }

    console.log(`[RealtimeAlerts] Surges: ${surges}, Drops: ${drops}`);
    return { surges, drops };
  } catch (error) {
    console.error('[RealtimeAlerts] Error:', error);
    return { surges: 0, drops: 0 };
  }
}

/**
 * VIP 매매 시그널 생성 (AI 기반)
 */
async function generateVIPSignals(): Promise<{ buySignals: number; sellSignals: number }> {
  let buySignals = 0;
  let sellSignals = 0;

  try {
    // 최근 추천 종목 중 매매 시그널 후보 선정
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: verdicts } = await supabase
      .from('verdicts')
      .select('top5, date')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!verdicts || verdicts.length === 0) return { buySignals: 0, sellSignals: 0 };

    // 각 종목 분석
    for (const verdict of verdicts) {
      for (const stock of verdict.top5 || []) {
        const priceData = await fetchCurrentPrice(stock.symbol);
        if (!priceData) continue;

        const recommendPrice = stock.currentPrice || priceData.price;
        const returnPercent = ((priceData.price - recommendPrice) / recommendPrice) * 100;

        // 매수 시그널: 추천가 대비 -3% 이상 하락 (저가 매수 기회)
        if (returnPercent <= -3 && returnPercent >= -10) {
          await sendBuySignal({
            name: stock.name,
            symbol: stock.symbol,
            currentPrice: priceData.price,
            targetPrice: Math.round(recommendPrice * 1.15), // 15% 상승 목표
            reason: `추천가 대비 ${Math.abs(returnPercent).toFixed(1)}% 하락하여 저점 매수 기회입니다.`,
          });
          buySignals++;
        }

        // 매도 시그널: 추천가 대비 +10% 이상 상승 (차익 실현)
        if (returnPercent >= 10) {
          await sendSellSignal({
            name: stock.name,
            symbol: stock.symbol,
            currentPrice: priceData.price,
            entryPrice: recommendPrice,
            returnPercent,
            reason: `목표 수익률 10%를 달성했습니다. 일부 또는 전량 매도를 고려하세요.`,
          });
          sellSignals++;
        }
      }
    }

    console.log(`[VIPSignals] Buy: ${buySignals}, Sell: ${sellSignals}`);
    return { buySignals, sellSignals };
  } catch (error) {
    console.error('[VIPSignals] Error:', error);
    return { buySignals: 0, sellSignals: 0 };
  }
}

/**
 * 오래된 알림 정리
 */
async function cleanupAlerts(): Promise<number> {
  const deleted = await cleanupOldNotifications();
  console.log(`[Cleanup] Deleted ${deleted} old notifications`);
  return deleted;
}

/**
 * Cron Job 핸들러
 */
export async function GET(request: NextRequest) {
  // Cron 인증 확인 (Vercel Cron은 자동으로 CRON_SECRET 헤더 추가)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 개발 환경이 아니고 시크릿이 설정된 경우 검증
  if (process.env.NODE_ENV !== 'development' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'morning';

  let result: any = {};

  switch (type) {
    case 'morning':
      // 모닝 브리핑 (매일 오전 8시 KST)
      result = await sendMorningBriefingAlert();
      break;

    case 'realtime':
      // 실시간 가격 알림 (장중 5분마다)
      result.priceAlerts = await sendRealtimePriceAlerts();
      // VIP 매매 시그널도 함께 생성
      result.vipSignals = await generateVIPSignals();
      break;

    case 'cleanup':
      // 오래된 알림 정리 (매주 일요일)
      result.deletedCount = await cleanupAlerts();
      break;

    default:
      return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    type,
    timestamp: new Date().toISOString(),
    result,
  });
}

/**
 * POST: 수동 알림 발송 (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // 관리자 인증 (간단한 시크릿 체크)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result: any = {};

    switch (type) {
      case 'vip_stock':
        // VIP 전용 종목 공개
        if (data.stock) {
          result = await sendVIPStockAlert(data.stock);
        }
        break;

      case 'buy_signal':
        if (data.stock) {
          result = await sendBuySignal(data.stock);
        }
        break;

      case 'sell_signal':
        if (data.stock) {
          result = await sendSellSignal(data.stock);
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      result,
    });

  } catch (error) {
    console.error('Manual alert error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}
