import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSubscriptionInfo, PLAN_LIMITS, type PlanName } from '@/lib/subscription/guard';
import { BACKTEST_DAYS_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 네이버 금융에서 현재가 조회
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
    
    // 대체 패턴
    const altMatch = html.match(/"now_val"[^>]*>(\d{1,3}(,\d{3})*)/);
    if (altMatch) {
      return parseInt(altMatch[1].replace(/,/g, ''));
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

interface BacktestResult {
  symbol: string;
  name: string;
  firstRecommendDate: string;
  firstRecommendPrice: number;  // 최초 추천가
  currentPrice: number;         // 현재가
  returnPercent: number;        // 수익률 (최초 추천가 vs 현재가)
  totalRecommendations: number;
  avgRank: number;
  unanimousCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ==================== 구독 기반 기간 제한 ====================
    const subInfo = await getSubscriptionInfo(request);
    const planName = (subInfo?.planName || 'free') as PlanName;
    const maxDays = BACKTEST_DAYS_LIMITS[planName as keyof typeof BACKTEST_DAYS_LIMITS] || 7;

    // 최대 조회 가능 기간 계산
    const today = new Date();
    const maxStartDate = new Date(today);
    maxStartDate.setDate(maxStartDate.getDate() - maxDays);
    
    let requestedStartDate = searchParams.get('startDate') || maxStartDate.toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || today.toISOString().split('T')[0];

    // 요청된 기간이 제한을 초과하면 제한 적용
    const requestedStart = new Date(requestedStartDate);
    if (requestedStart < maxStartDate) {
      requestedStartDate = maxStartDate.toISOString().split('T')[0];
    }

    const startDate = requestedStartDate;
    const isLimited = planName !== 'vip';
    // ============================================================

    // DB에서 해당 기간의 모든 verdict 조회
    const { data: verdicts, error } = await supabase
      .from('verdicts')
      .select('date, top5')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!verdicts || verdicts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No data found for the specified period',
        results: [],
        summary: null,
      });
    }

    // 종목별 추천 이력 집계 - 최초 추천일의 가격만 저장
    const stockStats = new Map<string, {
      symbol: string;
      name: string;
      firstDate: string;
      firstPrice: number;  // 최초 추천일의 가격
      recommendations: { date: string; rank: number; isUnanimous: boolean }[];
    }>();

    verdicts.forEach((verdict: any) => {
      const top5 = verdict.top5 || [];
      top5.forEach((stock: any) => {
        const symbol = stock.symbol;
        const price = stock.currentPrice || 0;
        const isUnanimous = stock.isUnanimous || (stock.claudeScore > 0 && stock.geminiScore > 0 && stock.gptScore > 0);

        if (!stockStats.has(symbol)) {
          // 최초 추천 시점의 데이터만 저장
          stockStats.set(symbol, {
            symbol,
            name: stock.name,
            firstDate: verdict.date,
            firstPrice: price,  // 최초 추천가
            recommendations: [],
          });
        }
        
        stockStats.get(symbol)!.recommendations.push({
          date: verdict.date,
          rank: stock.rank,
          isUnanimous,
        });
      });
    });

    // 현재가 조회 및 수익률 계산
    const results: BacktestResult[] = [];
    const symbols = Array.from(stockStats.keys());

    // 현재가 일괄 조회 (병렬)
    const pricePromises = symbols.map(async (symbol) => {
      const price = await fetchCurrentPrice(symbol);
      return { symbol, price };
    });

    const prices = await Promise.all(pricePromises);
    const priceMap = new Map(prices.map(p => [p.symbol, p.price]));

    for (const symbol of Array.from(stockStats.keys())) {
      const stats = stockStats.get(symbol)!;
      const currentPrice = priceMap.get(symbol);
      
      if (!currentPrice || !stats.firstPrice || stats.firstPrice === 0) continue;

      // 단순 수익률 계산: (현재가 - 최초추천가) / 최초추천가 * 100
      const returnPercent = ((currentPrice - stats.firstPrice) / stats.firstPrice) * 100;
      const avgRank = stats.recommendations.reduce((sum, r) => sum + r.rank, 0) / stats.recommendations.length;
      const unanimousCount = stats.recommendations.filter(r => r.isUnanimous).length;

      results.push({
        symbol,
        name: stats.name,
        firstRecommendDate: stats.firstDate,
        firstRecommendPrice: stats.firstPrice,
        currentPrice,
        returnPercent: Math.round(returnPercent * 100) / 100,
        totalRecommendations: stats.recommendations.length,
        avgRank: Math.round(avgRank * 10) / 10,
        unanimousCount,
      });
    }

    // 수익률 순으로 정렬
    results.sort((a, b) => b.returnPercent - a.returnPercent);

    // 요약 통계
    const positiveReturns = results.filter(r => r.returnPercent > 0);
    const negativeReturns = results.filter(r => r.returnPercent < 0);
    const avgReturn = results.length > 0 
      ? results.reduce((sum, r) => sum + r.returnPercent, 0) / results.length 
      : 0;

    // 만장일치 종목만 필터링한 수익률
    const unanimousResults = results.filter(r => r.unanimousCount > 0);
    const avgUnanimousReturn = unanimousResults.length > 0
      ? unanimousResults.reduce((sum, r) => sum + r.returnPercent, 0) / unanimousResults.length
      : 0;

    // Top 1 종목만 투자했을 때
    const top1Results = results.filter(r => r.avgRank <= 1.5);
    const avgTop1Return = top1Results.length > 0
      ? top1Results.reduce((sum, r) => sum + r.returnPercent, 0) / top1Results.length
      : 0;

    const summary = {
      period: { start: startDate, end: endDate },
      totalDays: verdicts.length,
      totalStocks: results.length,
      avgReturn: Math.round(avgReturn * 100) / 100,
      positiveCount: positiveReturns.length,
      negativeCount: negativeReturns.length,
      winRate: results.length > 0 ? Math.round((positiveReturns.length / results.length) * 100) : 0,
      bestReturn: results.length > 0 ? {
        symbol: results[0].symbol,
        name: results[0].name,
        returnPercent: results[0].returnPercent,
      } : null,
      worstReturn: results.length > 0 ? {
        symbol: results[results.length - 1].symbol,
        name: results[results.length - 1].name,
        returnPercent: results[results.length - 1].returnPercent,
      } : null,
      strategies: {
        allStocks: {
          avgReturn: Math.round(avgReturn * 100) / 100,
          stockCount: results.length,
        },
        unanimousOnly: {
          avgReturn: Math.round(avgUnanimousReturn * 100) / 100,
          stockCount: unanimousResults.length,
        },
        top1Only: {
          avgReturn: Math.round(avgTop1Return * 100) / 100,
          stockCount: top1Results.length,
        },
      },
    };

    return NextResponse.json({
      success: true,
      summary,
      results: results.slice(0, 50), // Top 50
      subscription: {
        plan: planName,
        maxDays,
        isLimited,
        message: isLimited 
          ? `${planName === 'free' ? '무료' : planName} 플랜은 최대 ${maxDays}일까지 조회 가능합니다.`
          : null,
        upgradeUrl: isLimited ? '/pricing' : null,
      },
    });
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run backtest' },
      { status: 500 }
    );
  }
}
