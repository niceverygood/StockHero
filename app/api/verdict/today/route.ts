export const dynamic = 'force-dynamic';
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

// AI별 상세 의견 생성
function generateDetailedSummary(top5: any[], claudeTop5: any[], geminiTop5: any[], gptTop5: any[], theme: any): string {
  const unanimousCount = top5.filter(t => t.isUnanimous).length;
  const topStock = top5[0];

  let summary = `${theme.emoji} 오늘의 테마: ${theme.name}\n\n`;

  // 전체 합의 현황
  if (unanimousCount === 0) {
    summary += `⚠️ 오늘은 만장일치 종목이 없습니다. AI들의 의견이 다양하게 갈렸습니다.\n\n`;
  } else if (unanimousCount === top5.length) {
    summary += `✅ 모든 종목이 만장일치! AI 3인이 완벽하게 의견을 모았습니다.\n\n`;
  } else {
    summary += `📊 ${unanimousCount}개 종목 만장일치, ${top5.length - unanimousCount}개 종목은 의견 차이가 있습니다.\n\n`;
  }

  // 1위 종목 상세 분석
  if (topStock) {
    summary += `🥇 1위 ${topStock.name}(${topStock.symbol}) - 평균 ${topStock.avgScore.toFixed(1)}점\n`;

    // 각 AI 점수 분석
    const scores = [
      { name: '클로드', score: topStock.claudeScore, emoji: '🔵' },
      { name: '제미나인', score: topStock.geminiScore, emoji: '🟣' },
      { name: '지피테일러', score: topStock.gptScore, emoji: '🟢' },
    ];

    scores.forEach(ai => {
      if (ai.score === 0) {
        summary += `${ai.emoji} ${ai.name}: 미선정 (Top 5에 포함시키지 않음)\n`;
      } else {
        summary += `${ai.emoji} ${ai.name}: ${ai.score.toFixed(1)}점\n`;
      }
    });

    // 의견 차이 분석
    const maxScore = Math.max(topStock.claudeScore, topStock.geminiScore, topStock.gptScore);
    const minScore = Math.min(
      topStock.claudeScore || 999,
      topStock.geminiScore || 999,
      topStock.gptScore || 999
    );

    if (minScore === 999 || minScore === 0) {
      const missingAIs = scores.filter(ai => ai.score === 0).map(ai => ai.name);
      summary += `\n💡 ${missingAIs.join(', ')}은(는) 오늘 테마인 "${theme.name}"에 더 적합한 다른 종목을 추천했습니다.`;
    } else if (maxScore - minScore > 1.5) {
      summary += `\n💡 AI들 간 점수 차이가 큽니다 (${minScore.toFixed(1)}~${maxScore.toFixed(1)}점). 신중한 판단이 필요합니다.`;
    }
  }

  return summary;
}

// AI별 개별 의견 추출
function extractAIReasons(top5: any[], claudeTop5: any[], geminiTop5: any[], gptTop5: any[]) {
  const aiReasons: Record<string, { claude: string | null; gemini: string | null; gpt: string | null }> = {};

  top5.forEach(stock => {
    const claudeItem = claudeTop5?.find((c: any) => c.symbol === stock.symbol);
    const geminiItem = geminiTop5?.find((g: any) => g.symbol === stock.symbol);
    const gptItem = gptTop5?.find((g: any) => g.symbol === stock.symbol);

    aiReasons[stock.symbol] = {
      claude: claudeItem?.reason || null,
      gemini: geminiItem?.reason || null,
      gpt: gptItem?.reason || null,
    };
  });

  return aiReasons;
}

export async function GET() {
  try {
    // 한국 시간 기준 오늘 날짜
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
    const today = kstTime.toISOString().split('T')[0];
    const dayOfWeek = kstTime.getDay();
    const theme = DAY_THEMES[dayOfWeek];

    // DB에서 오늘의 verdict 조회 (오전 8시·정오 모두, slot 컬럼 있으면 사용)
    const { data: verdictsRows, error } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false }); // 최신 먼저

    if (error || !verdictsRows?.length) {
      // 오늘 데이터가 없으면 어제 날짜로 시도
      const yesterday = new Date(kstTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: yesterdayRows } = await supabase
        .from('verdicts')
        .select('*')
        .eq('date', yesterday)
        .order('created_at', { ascending: false });

      if (!yesterdayRows?.length) {
        return NextResponse.json({
          success: true,
          verdict: null,
          message: '오늘의 추천이 아직 없습니다',
        });
      }

      // 어제 데이터 사용 (slot이 있는 레코드 우선)
      const validRows = yesterdayRows.filter(r => r.slot) || yesterdayRows;
      const verdict = validRows[0] || yesterdayRows[0];
      const slot = verdict.slot ?? 'morning';
      const claudeTop5 = verdict.claude_top5 || [];
      const geminiTop5 = verdict.gemini_top5 || [];
      const gptTop5 = verdict.gpt_top5 || [];

      const yesterdayTheme = DAY_THEMES[new Date(yesterday + 'T00:00:00+09:00').getDay()];
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
        reasons: item.reasons || [],
      }));

      const aiReasons = extractAIReasons(top5, claudeTop5, geminiTop5, gptTop5);
      const detailedSummary = generateDetailedSummary(top5, claudeTop5, geminiTop5, gptTop5, yesterdayTheme);

      return NextResponse.json({
        success: true,
        verdict: {
          date: yesterday,
          slot,
          slotsAvailable: yesterdayRows.map((r: any) => r.slot || 'morning'),
          theme: yesterdayTheme,
          top5,
          consensusSummary: detailedSummary,
          aiReasons,
          claudeTop5,
          geminiTop5,
          gptTop5,
        },
      });
    }

    // slot이 있는 레코드 우선, 없으면 최신순 (created_at DESC)
    const rowsWithSlot = verdictsRows.filter(r => r.slot);
    const verdict = rowsWithSlot[0] || verdictsRows[0];
    const slot = (verdict as any).slot ?? 'morning';
    const slotsAvailable = verdictsRows.filter(r => r.slot).map((r: any) => r.slot);

    const claudeTop5 = verdict.claude_top5 || [];
    const geminiTop5 = verdict.gemini_top5 || [];
    const gptTop5 = verdict.gpt_top5 || [];

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
      reasons: item.reasons || [],
    }));

    // AI별 상세 의견 추출
    const aiReasons = extractAIReasons(top5, claudeTop5, geminiTop5, gptTop5);

    // 상세 합의 의견 생성
    const detailedSummary = generateDetailedSummary(top5, claudeTop5, geminiTop5, gptTop5, theme);

    return NextResponse.json({
      success: true,
      verdict: {
        date: verdict.date,
        slot,
        slotsAvailable,
        theme: theme,
        top5: top5,
        consensusSummary: detailedSummary,
        aiReasons: aiReasons,
        claudeTop5: claudeTop5,
        geminiTop5: geminiTop5,
        gptTop5: gptTop5,
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
