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
      const cScore = stockData.claudeScore || 0;
      const gScore = stockData.geminiScore || 0;
      const tScore = stockData.gptScore || 0;
      const avgScore = stockData.avgScore || 0;
      const isUnanimous = cScore >= 3 && gScore >= 3 && tScore >= 3;
      const sector = stockData.sector || '해당 업종';

      // 점수 기준: 5=1위, 4=2위, 3=3위, 2=4위, 1=5위, 0=미선택
      // picked: 3점 이상만 적극 추천, 1~2점은 하위순위(소극적), 0점은 미추천
      type ScoreLevel = 'high' | 'mid' | 'low' | 'zero';
      const getLevel = (s: number): ScoreLevel => s >= 4 ? 'high' : s >= 3 ? 'mid' : s >= 1 ? 'low' : 'zero';

      const claudeR1: Record<ScoreLevel, string> = {
        high: `제 분석으로는 ${stockName}의 펀더멘털이 매우 견고합니다. ${cScore}점을 부여했습니다. ${sector} 업종 내에서 재무 건전성과 수익성이 우수한 기업으로, 밸류에이션 관점에서 강력 추천합니다.`,
        mid: `${stockName}은 펀더멘털이 양호합니다. ${cScore}점을 부여했습니다. ${sector} 업종 내 경쟁력은 있으나, 밸류에이션이 다소 부담될 수 있습니다.`,
        low: `${stockName}은 ${sector} 업종 내에서 펀더멘털은 괜찮지만, 다른 종목 대비 매력도가 떨어집니다. ${cScore}점으로 하위 순위에 배치했습니다.`,
        zero: `${stockName}은 현재 밸류에이션 부담이 있어 이번 추천에서는 제외했습니다. PER과 PBR 기준으로 다른 종목이 더 매력적입니다.`,
      };
      const geminiR1: Record<ScoreLevel, string> = {
        high: `솔직히 ${stockName}의 성장 잠재력은 현재 주가에 충분히 반영되지 않았다고 봅니다. ${gScore}점 부여! ${sector} 분야에서 기술 혁신 리더로, This is THE play!`,
        mid: `${stockName}은 성장 가능성이 있습니다. ${gScore}점을 줬습니다. ${sector} 분야에서 기회가 있지만, 확실한 카탈리스트가 필요합니다.`,
        low: `${stockName}은 솔직히 제 Top pick은 아닙니다. ${gScore}점으로 하위 순위에 넣었어요. 성장 스토리가 다른 종목 대비 약합니다. Not my favorite play.`,
        zero: `${stockName}보다 성장 잠재력이 더 높은 종목들이 있습니다. This is NOT the play right now.`,
      };
      const gptR1: Record<ScoreLevel, string> = {
        high: `내 40년 경험에 비추어 보면, ${stockName}은 거시경제 환경을 고려해도 훌륭한 투자처입니다. ${tScore}점을 부여합니다. 리스크 대비 기대 수익률이 매우 양호합니다.`,
        mid: `${stockName}은 투자 가치가 있다고 봅니다. ${tScore}점입니다. 다만 거시 리스크 요인을 항상 모니터링해야 합니다.`,
        low: `${stockName}에 대해서는 솔직히 확신이 부족합니다. ${tScore}점으로 하위 순위에 배치했습니다. 리스크 대비 수익률이 다른 종목만 못합니다.`,
        zero: `현재 금리 수준과 경기 사이클을 감안하면, ${stockName}에 대해서는 신중한 접근이 필요합니다. 살아남아야 게임을 계속할 수 있어.`,
      };

      const claudeR2: Record<ScoreLevel, string> = {
        high: `다른 분석가들의 의견을 종합해보면, ${stockName}에 대한 시각이 ${isUnanimous ? '일치하고' : '다소 엇갈리고'} 있습니다. 저는 펀더멘털 분석 기반으로 기존 ${cScore}점을 유지합니다. 숫자는 거짓말하지 않습니다.`,
        mid: `다른 분석가들의 의견도 참고했습니다. ${stockName}에 대해 ${cScore}점을 유지하되, 밸류에이션 부담 요인은 계속 주시하겠습니다.`,
        low: `다른 분석가들도 ${stockName}에 특별히 높은 점수를 주지 않았습니다. 저의 ${cScore}점 평가가 적절했다고 봅니다. 다른 종목에 기회가 더 많습니다.`,
        zero: `다른 분석가들이 ${stockName}을 추천하긴 했지만, 제 밸류에이션 기준에서는 여전히 매력도가 부족합니다.`,
      };
      const geminiR2: Record<ScoreLevel, string> = {
        high: `Claude의 밸류에이션 분석은 좋았지만, 성장주를 평가할 때 현재 PER보다 미래 성장률이 더 중요합니다. ${stockName}에 대한 ${gScore}점은 유지합니다. Fight me on this!`,
        mid: `다른 분석가들의 의견을 들어보니 공감하는 부분도 있습니다. ${stockName} ${gScore}점 유지하되, 좀 더 지켜볼 필요가 있어요.`,
        low: `솔직히 ${stockName}은 제 리스트에서 하위권입니다. ${gScore}점이면 거의 후순위예요. 더 exciting한 종목들이 있습니다.`,
        zero: `${stockName}에 대한 다른 분석가들의 의견을 들어봤지만, 저는 여전히 더 공격적인 성장 스토리를 가진 종목을 선호합니다.`,
      };
      const gptR2: Record<ScoreLevel, string> = {
        high: `젊은 친구들의 열정은 존중하지만, ${stockName}의 리스크 요인도 반드시 고려해야 합니다. 그래도 종합적으로 ${tScore}점은 적절하다고 봅니다.`,
        mid: `${stockName}에 대한 의견이 엇갈리지만, 리스크를 감수할 만한 가치는 있다고 봅니다. ${tScore}점을 유지합니다.`,
        low: `제 ${tScore}점 평가는 솔직히 소극적인 포함입니다. ${stockName}이 나쁜 건 아니지만, 포트폴리오 우선순위에서는 밀립니다.`,
        zero: `다른 분석가들의 추천을 존중하지만, 거시적 관점에서 ${stockName}보다 방어적인 종목이 현 시점에서는 더 현명한 선택입니다.`,
      };

      const claudeR3: Record<ScoreLevel, string> = {
        high: `최종 합의: ${stockName}을 Top 5에 포함합니다. 평균 ${avgScore.toFixed(1)}점으로 ${isUnanimous ? '만장일치' : '다수결'} 선정. 펀더멘털과 성장성 모두 반영된 결과입니다.`,
        mid: `${stockName}은 Top 5에 포함하되, 중간 순위로 배치합니다. 기본기는 좋지만 더 강한 확신을 가진 종목들이 있습니다.`,
        low: `${stockName}은 다른 분석가들의 지지로 Top 5에 간신히 포함되었지만, 제 관점에서는 우선순위가 높지 않습니다.`,
        zero: `최종적으로 ${stockName}은 이번 Top 5에서는 제외하기로 합의했습니다. 다음 기회에 재평가하겠습니다.`,
      };
      const geminiR3: Record<ScoreLevel, string> = {
        high: `Final consensus: ${stockName}을 ${stockData.rank}위로 확정합니다! ${isUnanimous ? '세 분석가 모두 동의한 만장일치 종목입니다.' : '의견 차이가 있었지만 최종 합의했습니다.'} 미래가 기대돼요!`,
        mid: `${stockName}을 ${stockData.rank}위에 넣는 것에 동의합니다. 아쉽지만 메인 추천은 아니에요.`,
        low: `${stockName}이 ${stockData.rank}위에 들어가긴 하지만... 솔직히 제 선택은 아니었어요. 다른 분석가들의 의견을 존중한 결과입니다.`,
        zero: `${stockName} 대신 더 높은 성장 잠재력을 가진 종목들로 최종 포트폴리오를 구성했습니다.`,
      };
      const gptR3: Record<ScoreLevel, string> = {
        high: `최종 결론: ${stockName}은 리스크 대비 수익률이 양호하여 ${stockData.rank}위에 선정합니다. ${isUnanimous ? '3명 모두 동의한 확신의 선택입니다.' : '투자 가치가 충분합니다.'}`,
        mid: `${stockName}을 ${stockData.rank}위로 최종 합의합니다. 리스크 관리하면서 접근하면 좋은 결과가 있을 겁니다.`,
        low: `${stockName}은 솔직히 제 확신 종목은 아닙니다만, 전체 포트폴리오 균형을 위해 ${stockData.rank}위에 배치합니다.`,
        zero: `${stockName}은 현 시점에서 리스크 대비 매력도가 충분하지 않아 제외했습니다. 시장 환경 변화 시 재검토하겠습니다.`,
      };

      const cLv = getLevel(cScore);
      const gLv = getLevel(gScore);
      const tLv = getLevel(tScore);

      const rounds = [
        {
          round: 1,
          messages: [
            { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claudeR1[cLv] },
            { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: geminiR1[gLv] },
            { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gptR1[tLv] },
          ],
        },
        {
          round: 2,
          messages: [
            { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claudeR2[cLv] },
            { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: geminiR2[gLv] },
            { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gptR2[tLv] },
          ],
        },
        {
          round: 3,
          messages: [
            { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claudeR3[cLv] },
            { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: geminiR3[gLv] },
            { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gptR3[tLv] },
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
          note: '상세 토론 로그가 없어 AI 분석 요약을 표시합니다.',
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
