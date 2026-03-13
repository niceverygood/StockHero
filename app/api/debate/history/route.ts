export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  '012450': '한화에어로스페이스',
  '047810': '한국항공우주',
  '042700': '한미반도체',
  '443060': '레인보우로보틱스',
  '352820': '하이브',
  '298040': '효성중공업',
  '267260': '현대일렉트릭',
  '454910': '두산로보틱스',
  '326030': 'SK바이오팜',
  '259960': '크래프톤',
  '086790': '하나금융지주',
  '079550': 'LIG넥스원',
  '058470': '리노공업',
  '039030': '이오테크닉스',
};

// AI 캐릭터별 이름
const CHARACTER_NAMES: Record<string, string> = {
  claude: '클로드 리',
  gemini: '제미 나인',
  gpt: 'G.P. 테일러',
};

// 토론 내용에서 특정 종목 관련 분석 추출
function extractStockAnalysis(content: string, symbol: string, stockName: string): string {
  // JSON 응답에서 reasons 부분 추출 시도
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // reasons 필드에서 해당 종목 이유 가져오기
      if (parsed.reasons && parsed.reasons[symbol]) {
        return parsed.reasons[symbol];
      }

      // consensusPicks에서 해당 종목 reason 가져오기
      if (parsed.consensusPicks) {
        const pick = parsed.consensusPicks.find((p: any) => p.symbol === symbol);
        if (pick?.reason) return pick.reason;
      }

      // disagreements 에서 해당 종목 찾기
      if (parsed.disagreements && parsed.disagreements[symbol]) {
        return `[반대 의견] ${parsed.disagreements[symbol]}`;
      }

      // analysis/reaction/finalThoughts 반환
      return parsed.reaction || parsed.analysis || parsed.finalThoughts || '';
    }
  } catch (e) {
    // JSON 파싱 실패 시 본문 그대로 반환
  }

  // JSON이 아니면 전체 텍스트 중 종목 관련 문장만 추출
  const sentences = content.split(/[.\n]/);
  const relevant = sentences.filter(s =>
    s.includes(symbol) || s.includes(stockName)
  );

  return relevant.length > 0 ? relevant.join('. ').trim() : content.substring(0, 300);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');

  if (!symbol || !date) {
    return NextResponse.json(
      { success: false, error: 'Symbol and date are required' },
      { status: 400 }
    );
  }

  try {
    // DB에서 해당 날짜의 verdict(토론 로그 포함) 조회
    const { data: verdictRows, error } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB query error:', error);
    }

    const verdict = verdictRows?.[0];
    const stockName = STOCK_NAMES[symbol] || symbol;

    // debate_log가 있으면 실제 토론 데이터 반환
    if (verdict?.debate_log?.rounds) {
      const rounds = verdict.debate_log.rounds.map((round: any) => ({
        round: round.round,
        messages: round.messages.map((msg: any) => {
          const picked = msg.picks?.includes(symbol) || false;
          const analysis = extractStockAnalysis(msg.content, symbol, stockName);

          return {
            character: msg.character,
            characterName: CHARACTER_NAMES[msg.character] || msg.character,
            picked,
            picks: msg.picks || [],
            analysis,
            fullContent: msg.content?.substring(0, 1000) || '',
          };
        }),
      }));

      return NextResponse.json({
        success: true,
        data: {
          symbol,
          stockName,
          date,
          rounds,
          source: 'db',
        },
      });
    }

    // debate_log가 없으면 기본 분석 데이터 반환
    // (top5에서 해당 종목의 정보를 추출)
    const top5 = verdict?.top5 || [];
    const stockData = top5.find((t: any) => t.symbol === symbol);

    if (stockData) {
      // 간단한 분석 요약 생성
      const rounds = [
        {
          round: 1,
          messages: [
            {
              character: 'claude',
              characterName: '클로드 리',
              picked: (stockData.claudeScore || 0) > 0,
              picks: [],
              analysis: stockData.claudeScore > 0
                ? `${stockName}에 ${stockData.claudeScore}점을 부여했습니다. 펀더멘털 관점에서 긍정적 평가입니다.`
                : `${stockName}은 이번 라운드에서 추천 목록에 포함하지 않았습니다.`,
              fullContent: '',
            },
            {
              character: 'gemini',
              characterName: '제미 나인',
              picked: (stockData.geminiScore || 0) > 0,
              picks: [],
              analysis: stockData.geminiScore > 0
                ? `${stockName}에 ${stockData.geminiScore}점을 부여했습니다. 성장 잠재력이 높은 종목으로 평가합니다.`
                : `${stockName}보다 성장 잠재력이 더 높은 종목에 집중했습니다.`,
              fullContent: '',
            },
            {
              character: 'gpt',
              characterName: 'G.P. 테일러',
              picked: (stockData.gptScore || 0) > 0,
              picks: [],
              analysis: stockData.gptScore > 0
                ? `${stockName}에 ${stockData.gptScore}점을 부여했습니다. 거시경제 환경을 고려한 종합 판단입니다.`
                : `현재 거시 환경을 고려하여 ${stockName}을 추천 목록에서 제외했습니다.`,
              fullContent: '',
            },
          ],
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          symbol,
          stockName,
          date,
          rounds,
          source: 'summary',
          note: '상세 토론 로그가 없어 요약 정보를 표시합니다.',
        },
      });
    }

    // 데이터 자체가 없는 경우
    return NextResponse.json({
      success: false,
      error: '해당 날짜의 토론 데이터가 없습니다.',
    }, { status: 404 });

  } catch (error) {
    console.error('Failed to fetch debate history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debate history' },
      { status: 500 }
    );
  }
}
