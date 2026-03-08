export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Enable caching for calendar data (revalidate every 5 minutes)
export const revalidate = 300;

// Supabase Client (singleton pattern)
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

// 종목명 매핑 (실시간 가격 조회용) - 확장된 종목 목록
const STOCK_NAMES: Record<string, { name: string; sector: string }> = {
  // 반도체/전자
  '005930': { name: '삼성전자', sector: '반도체' },
  '000660': { name: 'SK하이닉스', sector: '반도체' },
  '009150': { name: '삼성전기', sector: '전자부품' },
  '042700': { name: '한미반도체', sector: '반도체장비' },
  '058470': { name: '리노공업', sector: '반도체장비' },
  '039030': { name: '이오테크닉스', sector: '반도체장비' },
  
  // 2차전지/에너지
  '373220': { name: 'LG에너지솔루션', sector: '2차전지' },
  '006400': { name: '삼성SDI', sector: '2차전지' },
  '247540': { name: '에코프로비엠', sector: '2차전지' },
  '086520': { name: '에코프로', sector: '2차전지' },
  '051910': { name: 'LG화학', sector: '화학' },
  
  // 바이오/헬스케어
  '207940': { name: '삼성바이오로직스', sector: '바이오' },
  '068270': { name: '셀트리온', sector: '바이오' },
  '196170': { name: '알테오젠', sector: '바이오' },
  '145020': { name: '휴젤', sector: '바이오' },
  '326030': { name: 'SK바이오팜', sector: '바이오' },
  
  // 자동차
  '005380': { name: '현대차', sector: '자동차' },
  '000270': { name: '기아', sector: '자동차' },
  '012330': { name: '현대모비스', sector: '자동차부품' },
  
  // IT서비스/플랫폼
  '035720': { name: '카카오', sector: 'IT서비스' },
  '035420': { name: 'NAVER', sector: 'IT서비스' },
  '263750': { name: '펄어비스', sector: '게임' },
  '259960': { name: '크래프톤', sector: '게임' },
  
  // 금융
  '105560': { name: 'KB금융', sector: '금융' },
  '055550': { name: '신한지주', sector: '금융' },
  '086790': { name: '하나금융지주', sector: '금융' },
  '316140': { name: '우리금융지주', sector: '금융' },
  '032830': { name: '삼성생명', sector: '보험' },
  
  // 방산/우주항공
  '012450': { name: '한화에어로스페이스', sector: '방산' },
  '047810': { name: '한국항공우주', sector: '방산' },
  '000880': { name: '한화', sector: '방산' },
  '298040': { name: '효성중공업', sector: '중공업' },
  
  // AI/로봇
  '443060': { name: '레인보우로보틱스', sector: 'AI/로봇' },
  '454910': { name: '두산로보틱스', sector: 'AI/로봇' },
  
  // 통신/인프라
  '017670': { name: 'SK텔레콤', sector: '통신' },
  '030200': { name: 'KT', sector: '통신' },
  '066570': { name: 'LG전자', sector: '가전' },
  
  // 철강/소재
  '003670': { name: '포스코홀딩스', sector: '철강' },
  '005490': { name: 'POSCO', sector: '철강' },
  
  // 엔터/미디어
  '352820': { name: '하이브', sector: '엔터' },
  '041510': { name: 'SM', sector: '엔터' },
  '122870': { name: 'YG엔터', sector: '엔터' },
  
  // 인프라/리츠
  '395400': { name: '맥쿼리인프라', sector: '인프라' },
};

// Convert DB format to Calendar format (NO real-time price fetch for speed)
function convertDBVerdictToCalendarFormat(dbVerdict: any): any {
  const top5Items = dbVerdict.top5 || [];
  
  return {
    date: dbVerdict.date,
    top5: top5Items.map((item: any, idx: number) => {
      const stockInfo = STOCK_NAMES[item.symbol];
      
      return {
        rank: item.rank || idx + 1,
        symbolCode: item.symbol,
        symbolName: stockInfo?.name || item.name,
        sector: stockInfo?.sector || item.sector || '기타',
        avgScore: item.avgScore || 4.0,
        claudeScore: item.claudeScore || 0,
        geminiScore: item.geminiScore || 0,
        gptScore: item.gptScore || 0,
        currentPrice: item.currentPrice || 0,
        change: item.change || 0,
        changePercent: item.changePercent || 0,
        targetPrice: item.targetPrice || 0,
        targetDate: item.targetDate || '',
        // 추천일 가격 정보 (백테스트용)
        firstRecommendPrice: item.firstRecommendPrice || item.currentPrice || 0,
      };
    }),
    isGenerated: true,
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

    // DB에서 해당 월의 모든 verdict 조회 (실제 AI 분석 데이터만)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const supabase = getSupabase();
    
    interface DBVerdict {
      date: string;
      slot?: string;
      top5: any[];
      consensus_summary?: string;
    }

    // date + slot 별로 행 조회 (오전 8시·정오 두 시점). 마이그레이션 010 필요
    const { data, error } = await supabase
      .from('verdicts')
      .select('date, slot, top5, consensus_summary')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('slot', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'AI 분석 데이터가 없습니다. 오늘의 분석을 생성해주세요.',
      });
    }
    
    const dbVerdicts = (data || []) as DBVerdict[];

    // 요일별 테마 정보
    const DAY_THEMES: Record<number, { name: string; emoji: string }> = {
      0: { name: '종합 밸런스', emoji: '⚖️' },
      1: { name: '성장주 포커스', emoji: '🚀' },
      2: { name: '배당 투자', emoji: '💰' },
      3: { name: '가치 투자', emoji: '💎' },
      4: { name: '테마 & 트렌드', emoji: '🔥' },
      5: { name: '블루칩', emoji: '🏆' },
      6: { name: '히든 젬', emoji: '🌟' },
    };

    // Convert to calendar format (날짜당 최대 2건: morning, noon)
    const calendarVerdicts = dbVerdicts.map((dbVerdict: DBVerdict) => {
      const dateObj = new Date(dbVerdict.date);
      const dayOfWeek = dateObj.getDay();
      const theme = DAY_THEMES[dayOfWeek];
      const v = convertDBVerdictToCalendarFormat(dbVerdict);
      const slot = (dbVerdict as any).slot ?? 'morning';
      
      const top5Data = v.top5.map((item: any) => {
        const originalItem = (dbVerdict.top5 || []).find((t: any) => t.symbol === item.symbolCode);
        return {
          rank: item.rank,
          symbol: item.symbolCode,
          name: item.symbolName,
          avgScore: item.avgScore || originalItem?.avgScore || 4.0,
          isUnanimous: originalItem?.isUnanimous || originalItem?.votes >= 3 || false,
          claudeScore: item.claudeScore || 0,
          geminiScore: item.geminiScore || 0,
          gptScore: item.gptScore || 0,
          currentPrice: item.currentPrice || 0,
          reasons: originalItem?.reasons || [],
        };
      });
      
      return {
        date: v.date,
        slot,
        theme: theme,
        top5: top5Data,
        consensusSummary: (dbVerdict as any).consensus_summary || '',
      };
    });

    // 캐싱 헤더 추가 (5분)
    return NextResponse.json({
      success: true,
      verdicts: calendarVerdicts,
      dbCount: calendarVerdicts.length,
      todayHasData: calendarVerdicts.some(v => v.date === todayStr),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Calendar verdicts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar verdicts' },
      { status: 500 }
    );
  }
}
