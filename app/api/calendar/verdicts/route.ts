import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mock Korean stocks for generating fallback verdicts (대형주 + 중소형주 + 테마주)
const MOCK_STOCKS = [
  // 대형주
  { code: '005930', name: '삼성전자', sector: '반도체' },
  { code: '000660', name: 'SK하이닉스', sector: '반도체' },
  { code: '005380', name: '현대차', sector: '자동차' },
  { code: '035420', name: 'NAVER', sector: 'IT서비스' },
  { code: '105560', name: 'KB금융', sector: '금융' },
  { code: '017670', name: 'SK텔레콤', sector: '통신' },
  
  // 중형 성장주 (개인투자자 선호)
  { code: '247540', name: '에코프로비엠', sector: '2차전지' },
  { code: '086520', name: '에코프로', sector: '2차전지' },
  { code: '352820', name: '하이브', sector: '엔터' },
  { code: '196170', name: '알테오젠', sector: '바이오' },
  
  // AI/로봇 테마
  { code: '443060', name: '레인보우로보틱스', sector: 'AI/로봇' },
  { code: '042700', name: '한미반도체', sector: '반도체장비' },
  
  // 방산 테마
  { code: '012450', name: '한화에어로스페이스', sector: '방산' },
  { code: '047810', name: '한국항공우주', sector: '방산' },
  
  // 소형 고성장주
  { code: '058470', name: '리노공업', sector: '반도체장비' },
  { code: '145020', name: '휴젤', sector: '바이오' },
  { code: '039030', name: '이오테크닉스', sector: '반도체장비' },
  
  // 안정 대형주
  { code: '055550', name: '신한지주', sector: '금융' },
  { code: '032830', name: '삼성생명', sector: '보험' },
  { code: '395400', name: '맥쿼리인프라', sector: '인프라' },
];

// Sector lookup
const SECTOR_MAP: Record<string, string> = {
  '반도체': '반도체',
  '2차전지': '2차전지',
  '바이오': '바이오',
  '자동차': '자동차',
  '금융': '금융',
  'IT서비스': 'IT서비스',
};

// Seeded random function for consistent dummy data
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// 실제 주가 기준 더미 데이터용 기준가 (최신 시장가 반영)
const REAL_BASE_PRICES: Record<string, number> = {
  // 대형주
  '005930': 107000,  // 삼성전자
  '000660': 565000,  // SK하이닉스
  '005380': 210000,  // 현대차
  '035420': 195000,  // NAVER
  '105560': 124000,  // KB금융
  '017670': 58000,   // SK텔레콤
  
  // 중형 성장주
  '247540': 120000,  // 에코프로비엠
  '086520': 65000,   // 에코프로
  '352820': 265000,  // 하이브
  '196170': 350000,  // 알테오젠
  
  // AI/로봇 테마
  '443060': 145000,  // 레인보우로보틱스
  '042700': 125000,  // 한미반도체
  
  // 방산 테마
  '012450': 350000,  // 한화에어로스페이스
  '047810': 65000,   // 한국항공우주
  
  // 소형 고성장주
  '058470': 200000,  // 리노공업
  '145020': 180000,  // 휴젤
  '039030': 180000,  // 이오테크닉스
  
  // 안정 대형주
  '055550': 77000,   // 신한지주
  '032830': 85000,   // 삼성생명
  '395400': 12000,   // 맥쿼리인프라
};

function generateDummyVerdict(dateStr: string) {
  const dateSeed = dateStr.split('-').map(Number).reduce((a, b) => a * 100 + b, 0);
  
  // Shuffle stocks based on date seed
  const shuffled = [...MOCK_STOCKS].sort((a, b) => {
    const seedA = dateSeed + a.code.charCodeAt(0);
    const seedB = dateSeed + b.code.charCodeAt(0);
    return seededRandom(seedA) - seededRandom(seedB);
  });

  const top5 = shuffled.slice(0, 5).map((stock, i) => {
    const baseSeed = dateSeed + i + stock.code.charCodeAt(0);
    
    // Generate individual AI scores with some variation
    const claudeScore = Number((3.0 + seededRandom(baseSeed + 1) * 2.0).toFixed(1));
    const geminiScore = Number((3.0 + seededRandom(baseSeed + 2) * 2.0).toFixed(1));
    const gptScore = Number((3.0 + seededRandom(baseSeed + 3) * 2.0).toFixed(1));
    const avgScore = Number(((claudeScore + geminiScore + gptScore) / 3).toFixed(1));
    
    // 실제 주가 기준으로 목표가 계산 (10-25% 상승 목표)
    const realBasePrice = REAL_BASE_PRICES[stock.code] || 100000;
    const priceVariation = 0.95 + seededRandom(baseSeed) * 0.1; // ±5% 변동
    const currentPrice = Math.round(realBasePrice * priceVariation / 100) * 100;
    const targetMultiplier = 1.10 + seededRandom(baseSeed + 4) * 0.15; // 10-25% 목표 상승
    const targetPrice = Math.round(currentPrice * targetMultiplier / 100) * 100;
    
    // Target date (1-6 months from the date)
    const dateObj = new Date(dateStr);
    const monthsAhead = 1 + Math.floor(seededRandom(baseSeed + 5) * 5);
    dateObj.setMonth(dateObj.getMonth() + monthsAhead);
    const targetDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;

    return {
      rank: i + 1,
      symbolCode: stock.code,
      symbolName: stock.name,
      sector: stock.sector,
      avgScore,
      claudeScore,
      geminiScore,
      gptScore,
      currentPrice,
      targetPrice,
      targetDate,
    };
  });

  return {
    date: dateStr,
    top5,
    isGenerated: false, // Historical dummy data
  };
}

// Convert DB format to Calendar format
function convertDBVerdictToCalendarFormat(dbVerdict: any): any {
  const top5Items = dbVerdict.top5 || [];
  
  return {
    date: dbVerdict.date,
    top5: top5Items.map((item: any, idx: number) => {
      const stockInfo = MOCK_STOCKS.find(s => s.code === item.symbol);
      return {
        rank: item.rank || idx + 1,
        symbolCode: item.symbol,
        symbolName: stockInfo?.name || item.name,
        sector: stockInfo?.sector || '기타',
        avgScore: item.avgScore || 4.0,
        claudeScore: item.claudeScore || 0,
        geminiScore: item.geminiScore || 0,
        gptScore: item.gptScore || 0,
        targetPrice: item.targetPrice || item.currentPrice || 0,
        targetDate: item.targetDate || '',
      };
    }),
    isGenerated: true, // AI generated data
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // 한국 시간 기준 오늘 날짜
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
    const todayStr = kstTime.toISOString().split('T')[0];
    const today = new Date(todayStr);

    // 1. DB에서 해당 월의 모든 verdict 조회
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: dbVerdicts, error } = await supabase
      .from('verdicts')
      .select('date, top5, consensus_summary')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    // DB 데이터를 Map으로 변환
    const dbVerdictMap: Record<string, any> = {};
    if (dbVerdicts) {
      for (const v of dbVerdicts) {
        dbVerdictMap[v.date] = convertDBVerdictToCalendarFormat(v);
      }
    }

    // 2. Generate verdicts for each day of the month
    const verdicts = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      // Skip future dates
      if (date > today) {
        continue;
      }

      // DB에 데이터가 있으면 그것을 사용 (오늘 포함)
      if (dbVerdictMap[dateStr]) {
        verdicts.push(dbVerdictMap[dateStr]);
        continue;
      }

      // 오늘인데 DB 데이터가 없으면 스킵 (아직 생성 안됨)
      if (dateStr === todayStr) {
        continue;
      }

      // 과거 날짜인데 DB 데이터가 없으면 Mock 데이터 생성
      const verdict = generateDummyVerdict(dateStr);
      verdicts.push(verdict);
    }

    return NextResponse.json({
      success: true,
      data: verdicts,
      dbCount: Object.keys(dbVerdictMap).length,
    });
  } catch (error) {
    console.error('Calendar verdicts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar verdicts' },
      { status: 500 }
    );
  }
}
