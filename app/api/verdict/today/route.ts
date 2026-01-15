import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET() {
  try {
    // 한국 시간 기준 오늘 날짜
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
    const today = kstTime.toISOString().split('T')[0];
    const dayOfWeek = kstTime.getDay();
    const theme = DAY_THEMES[dayOfWeek];

    // DB에서 오늘의 verdict 조회
    const { data: verdict, error } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', today)
      .single();

    if (error || !verdict) {
      return NextResponse.json({
        success: true,
        verdict: null,
        message: '오늘의 추천이 아직 없습니다',
      });
    }

    // 데이터 포맷팅
    const top5 = (verdict.top5 || []).map((item: any, idx: number) => ({
      rank: item.rank || idx + 1,
      symbol: item.symbol,
      name: item.name,
      avgScore: item.avgScore || 0,
      claudeScore: item.claudeScore || 0,
      geminiScore: item.geminiScore || 0,
      gptScore: item.gptScore || 0,
      isUnanimous: item.isUnanimous || false,
      reason: item.reason || '',
    }));

    return NextResponse.json({
      success: true,
      verdict: {
        date: verdict.date,
        theme: theme,
        top5: top5,
        consensusSummary: verdict.consensus_summary || '',
      },
    });

  } catch (error) {
    console.error('Today verdict error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today verdict' },
      { status: 500 }
    );
  }
}
