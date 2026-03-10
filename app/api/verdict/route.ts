export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchMultipleStockPrices } from '@/lib/market-data/kis';

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 종목명 매핑
const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '373220': 'LG에너지솔루션',
  '207940': '삼성바이오로직스',
  '005380': '현대차',
  '006400': '삼성SDI',
  '035720': '카카오',
  '035420': 'NAVER',
  '051910': 'LG화학',
  '000270': '기아',
  '105560': 'KB금융',
  '055550': '신한지주',
  '068270': '셀트리온',
  '003670': '포스코홀딩스',
  '066570': 'LG전자',
  '017670': 'SK텔레콤',
  '030200': 'KT',
  '032830': '삼성생명',
  '086790': '하나금융지주',
  '009150': '삼성전기',
  '247540': '에코프로비엠',
  '086520': '에코프로',
  '352820': '하이브',
  '196170': '알테오젠',
  '443060': '레인보우로보틱스',
  '042700': '한미반도체',
  '012450': '한화에어로스페이스',
  '047810': '한국항공우주',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // 날짜 파라미터가 있으면 해당 날짜, 없으면 KST 기준 오늘
  let targetDate: string;
  if (dateParam) {
    targetDate = dateParam;
  } else {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
    targetDate = kstTime.toISOString().split('T')[0];
  }

  try {
    // 1. DB에서 해당 날짜의 verdict 조회 (여러 슬롯 가능)
    const { data: verdictRows, error } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', targetDate)
      .order('created_at', { ascending: false });

    // slot이 있는 레코드 우선 (null slot = 레거시 데이터)
    const validRows = verdictRows?.filter(r => r.slot) || [];
    const verdict = validRows[0] || verdictRows?.[0];

    // DB에 데이터가 없으면 에러 반환 (더미 데이터 없음)
    if (error || !verdict?.top5 || verdict.top5.length === 0) {
      return NextResponse.json({
        success: false,
        error: '해당 날짜의 AI 분석 데이터가 없습니다.',
        message: 'AI 분석을 먼저 실행해주세요.',
        targetDate,
        top5: [],
      }, { status: 404 });
    }

    const top5 = verdict.top5;

    // 2. 실시간 가격 조회
    const symbols = top5.map((item: any) => item.symbol);
    let realTimePrices: Map<string, any> = new Map();

    try {
      realTimePrices = await fetchMultipleStockPrices(symbols);
    } catch (error) {
      console.error('Failed to fetch real-time prices:', error);
    }

    // 3. 실시간 가격 병합
    const top5WithPrices = top5.map((item: any, idx: number) => {
      const realPrice = realTimePrices.get(item.symbol);
      const stockName = STOCK_NAMES[item.symbol] || item.name;

      return {
        rank: item.rank || idx + 1,
        symbolId: String(idx + 1),
        symbol: item.symbol,
        name: stockName,
        avgScore: item.avgScore || 4.0,
        claudeScore: item.claudeScore || 0,
        geminiScore: item.geminiScore || 0,
        gptScore: item.gptScore || 0,
        unanimous: item.isUnanimous || false,
        rationale: item.reasons?.[0] || `${stockName}은(는) AI 분석가들의 추천을 받았습니다.`,
        currentPrice: realPrice?.price || item.currentPrice || 0,
        change: realPrice?.change || item.change || 0,
        changePercent: realPrice?.changePercent || item.changePercent || 0,
      };
    });

    const targetDateObj = new Date(targetDate + 'T00:00:00');
    const dateStr = targetDateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return NextResponse.json({
      success: true,
      isRealTime: realTimePrices.size > 0,
      isFromDB: true,
      date: dateStr,
      time: timeStr,
      targetDate,
      unanimousCount: top5WithPrices.filter((item: any) => item.unanimous).length,
      rationale: verdict?.consensus_summary || 'AI 분석가들이 선정한 오늘의 Top 5 종목입니다.',
      top5: top5WithPrices,
    });

  } catch (error: any) {
    console.error('Verdict API error:', error);

    return NextResponse.json({
      success: false,
      error: 'AI 분석 데이터를 가져오는데 실패했습니다.',
      message: error.message || 'Internal server error',
      targetDate,
      top5: [],
    }, { status: 500 });
  }
}
