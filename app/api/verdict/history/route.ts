import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const month = searchParams.get('month') || (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // 해당 월의 시작/끝 날짜
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
  
  try {
    // DB에서 해당 월의 모든 verdict 조회
    const { data: verdicts, error } = await supabase
      .from('verdicts')
      .select('date, top5, consensus_summary')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    // 날짜별 맵으로 변환
    const verdictsByDate: Record<string, any> = {};
    
    for (const verdict of verdicts || []) {
      const top5 = (verdict.top5 as any[]).map((item: any, idx: number) => ({
        rank: item.rank || idx + 1,
        symbol: item.symbol,
        name: STOCK_NAMES[item.symbol] || item.name,
        avgScore: item.avgScore || 4.0,
        isUnanimous: item.isUnanimous || false,
      }));
      
      verdictsByDate[verdict.date] = {
        date: verdict.date,
        top5,
        consensusSummary: verdict.consensus_summary,
        isAIGenerated: true,
      };
    }
    
    return NextResponse.json({
      success: true,
      year,
      month,
      startDate,
      endDate,
      count: Object.keys(verdictsByDate).length,
      verdicts: verdictsByDate,
    });
    
  } catch (error: any) {
    console.error('Verdict history API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch verdict history' },
      { status: 500 }
    );
  }
}





