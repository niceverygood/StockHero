import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 🎯 AI 3대장 토론 기반 Top 5 추천 시스템
 * 
 * 매일 오전 8시(KST)에 실행:
 * 1. 후보 종목 40개 중 섹터별 대표주 선정
 * 2. AI 3대장(Claude, Gemini, GPT)이 3라운드 토론
 * 3. 합의를 통해 최종 Top 5 선정
 * 4. 토론 로그와 함께 DB에 저장
 */

// Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OpenRouter API 호출
async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
      'X-Title': 'StockHero Daily Top5 Debate',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.8,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`OpenRouter API error (${model}):`, error);
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 모델 매핑
const MODELS = {
  claude: 'anthropic/claude-sonnet-4',
  gemini: 'google/gemini-2.5-pro-preview',
  gpt: 'openai/gpt-4o',
};

// 분석 대상 종목 (확장)
const CANDIDATE_STOCKS = [
  // 방산/우주항공
  { symbol: '012450', name: '한화에어로스페이스', sector: '방산', tags: ['방산', '우주', '엔진', 'AI'] },
  { symbol: '047810', name: '한국항공우주', sector: '방산', tags: ['방산', '항공기', 'KF-21'] },
  { symbol: '079550', name: 'LIG넥스원', sector: '방산', tags: ['방산', '미사일', '무기'] },
  // 반도체/AI
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체', tags: ['반도체', 'AI', 'HBM'] },
  { symbol: '005930', name: '삼성전자', sector: '반도체', tags: ['반도체', 'AI', '파운드리'] },
  { symbol: '042700', name: '한미반도체', sector: '반도체장비', tags: ['반도체장비', 'HBM', 'AI'] },
  { symbol: '058470', name: '리노공업', sector: '반도체장비', tags: ['반도체장비', '테스트'] },
  { symbol: '039030', name: '이오테크닉스', sector: '반도체장비', tags: ['반도체장비', '레이저', 'HBM'] },
  // 전력기기
  { symbol: '298040', name: '효성중공업', sector: '전력기기', tags: ['전력기기', '변압기', 'AI'] },
  { symbol: '267260', name: '현대일렉트릭', sector: '전력기기', tags: ['전력기기', '변압기'] },
  // AI/로봇
  { symbol: '443060', name: '레인보우로보틱스', sector: 'AI/로봇', tags: ['로봇', '휴머노이드', 'AI'] },
  { symbol: '454910', name: '두산로보틱스', sector: 'AI/로봇', tags: ['로봇', '협동로봇', 'AI'] },
  // 바이오
  { symbol: '207940', name: '삼성바이오로직스', sector: '바이오', tags: ['바이오', 'CMO', 'ADC'] },
  { symbol: '068270', name: '셀트리온', sector: '바이오', tags: ['바이오', '바이오시밀러'] },
  { symbol: '326030', name: 'SK바이오팜', sector: '바이오', tags: ['바이오', '신약', 'CNS'] },
  // 자동차
  { symbol: '005380', name: '현대차', sector: '자동차', tags: ['자동차', '전기차', '수소차'] },
  { symbol: '000270', name: '기아', sector: '자동차', tags: ['자동차', '전기차', 'EV9'] },
  // IT/플랫폼
  { symbol: '035420', name: 'NAVER', sector: 'IT서비스', tags: ['플랫폼', 'AI', '클라우드'] },
  { symbol: '035720', name: '카카오', sector: 'IT서비스', tags: ['플랫폼', 'AI', '콘텐츠'] },
  { symbol: '259960', name: '크래프톤', sector: '게임', tags: ['게임', 'PUBG', 'AI'] },
  // 2차전지
  { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지', tags: ['2차전지', '전기차', 'ESS'] },
  { symbol: '006400', name: '삼성SDI', sector: '2차전지', tags: ['2차전지', '전기차', '전고체'] },
  // 금융
  { symbol: '105560', name: 'KB금융', sector: '금융', tags: ['금융', '배당', '밸류업'] },
  { symbol: '086790', name: '하나금융지주', sector: '금융', tags: ['금융', '배당', '밸류업'] },
  // 엔터
  { symbol: '352820', name: '하이브', sector: '엔터', tags: ['엔터', 'K-POP', 'AI'] },
  // 조선
  { symbol: '010140', name: 'HD한국조선해양', sector: '조선', tags: ['조선', 'LNG선'] },
  { symbol: '329180', name: 'HD현대중공업', sector: '조선', tags: ['조선', '해양플랜트'] },
  // 화장품
  { symbol: '051900', name: 'LG생활건강', sector: '화장품', tags: ['화장품', '중국', '리오프닝'] },
  // 소재
  { symbol: '003670', name: '포스코홀딩스', sector: '소재', tags: ['철강', '2차전지소재', '리튬'] },
  { symbol: '357780', name: '솔브레인', sector: '반도체소재', tags: ['반도체소재', '전해질'] },
];

// AI 캐릭터 시스템 프롬프트
const SYSTEM_PROMPTS = {
  claude: `당신은 "클로드 리(Claude Lee)" - 월가 15년차 펀더멘털 분석가입니다.

## 성격과 말투
- 차분하고 논리적, 데이터 기반 분석
- "제 분석으로는...", "숫자는 거짓말하지 않습니다", "펀더멘털 관점에서..."
- 가치투자 철학 (워런 버핏, 벤저민 그레이엄 신봉)

## 분석 기준
1. PER, PBR, ROE 등 밸류에이션
2. 현금흐름과 재무건전성
3. 업종 내 경쟁력과 해자
4. 적정가치 대비 현재가 괴리

## 토론 스타일
- 제미나인의 과도한 낙관에 브레이크
- 테일러의 보수적 관점을 존중하되 기회 강조
- 숫자로 반박, 감정 배제`,

  gemini: `당신은 "제미 나인(Gemi Nine)" - 실리콘밸리 출신 성장주 전문가입니다.

## 성격과 말투  
- 에너지 넘치고 자신감 있음
- 영어 표현 자연스럽게 섞음 ("This is THE play!", "Huge TAM", "Fight me on this")
- "솔직히 말해서...", "미래를 사는 거예요"

## 분석 기준
1. 기술 트렌드와 혁신성 (AI, 반도체, 로봇)
2. TAM(Total Addressable Market) 성장성
3. 경쟁우위와 네트워크 효과
4. 3년 후 시장 지배력

## 토론 스타일
- 클로드의 보수적 밸류에이션에 반박 (테슬라 예시)
- 테일러에게 "꼰대" 취급하지만 내심 존경
- 공격적 목표가 제시`,

  gpt: `당신은 "G.P. 테일러(G.P. Taylor)" - 40년 경력 매크로 전략가입니다.

## 성격과 말투
- 노련하고 차분, 따뜻한 냉소
- "내가 40년간 본 바로는...", "젊은 친구...", "살아남아야 게임을 계속할 수 있어"
- 케인스, 마크 트웨인 명언 인용

## 분석 기준
1. 거시경제 환경 (금리, 환율, 인플레이션)
2. 시장 사이클과 변동성 (VIX)
3. 리스크 대비 수익률
4. 최악의 시나리오 대비

## 토론 스타일
- 젊은 분석가들의 열정을 존중하되 경고
- 최종 결론 도출 역할 (의장)
- 2008년 금융위기 경험 언급`,
};

// 토론 라운드 실행
interface DebateRound {
  round: number;
  messages: Array<{
    character: 'claude' | 'gemini' | 'gpt';
    content: string;
    picks: string[];
  }>;
}

async function runDebateRound(
  roundNumber: number,
  candidates: typeof CANDIDATE_STOCKS,
  previousRounds: DebateRound[],
  today: string
): Promise<DebateRound> {
  const messages: DebateRound['messages'] = [];
  const candidateList = candidates.map(s => `${s.name}(${s.symbol}) - ${s.sector}, 테마: ${s.tags.join(', ')}`).join('\n');
  
  // 이전 토론 요약
  let previousContext = '';
  if (previousRounds.length > 0) {
    previousContext = '\n\n## 이전 토론 내용\n';
    for (const round of previousRounds) {
      previousContext += `\n### ${round.round}라운드\n`;
      for (const msg of round.messages) {
        previousContext += `**${msg.character === 'claude' ? '클로드' : msg.character === 'gemini' ? '제미나인' : '테일러'}**: ${msg.content.substring(0, 300)}...\n선택: ${msg.picks.join(', ')}\n\n`;
      }
    }
  }
  
  const roundPrompts: Record<number, string> = {
    1: `오늘(${today})의 추천 종목을 선정하기 위한 토론 1라운드입니다.

## 후보 종목
${candidateList}

## 1라운드 미션
위 후보 중에서 당신의 투자 철학에 맞는 **Top 7 종목**을 선택하고 이유를 설명하세요.
다른 분석가들이 다른 선택을 할 수 있으니, 당신만의 관점을 명확히 하세요.

## 응답 형식 (반드시 JSON으로)
{
  "analysis": "2-3문장의 시장 현황 분석과 선정 기준",
  "picks": ["종목코드1", "종목코드2", ...],
  "reasons": {
    "종목코드1": "선정 이유 1-2문장",
    "종목코드2": "선정 이유 1-2문장"
  }
}`,

    2: `토론 2라운드입니다. 다른 분석가들의 의견을 참고하여 의견을 조율하세요.
${previousContext}

## 2라운드 미션
- 다른 분석가들의 선택을 분석하고 동의/반박하세요
- 의견이 일치하는 종목과 이견이 있는 종목을 구분하세요
- **Top 5 종목**으로 압축하세요

## 응답 형식 (반드시 JSON으로)
{
  "reaction": "다른 분석가 의견에 대한 반응 (2-3문장)",
  "agreements": ["동의하는 종목 코드들"],
  "disagreements": {"종목코드": "반박 이유"},
  "picks": ["최종 선택 5개 종목코드"],
  "reasons": {"종목코드": "이유"}
}`,

    3: `최종 토론 3라운드입니다. 합의를 도출해야 합니다.
${previousContext}

## 3라운드 미션
- 세 분석가가 모두 동의할 수 있는 **Top 5 종목**을 선정하세요
- 각 종목에 대해 점수(1-5)를 부여하세요
- 최종 합의안을 제시하세요

## 응답 형식 (반드시 JSON으로)
{
  "finalThoughts": "최종 의견 정리 (2-3문장)",
  "consensusPicks": [
    {"symbol": "종목코드", "name": "종목명", "score": 4.5, "reason": "선정 이유"}
  ],
  "overallRisk": "전체 포트폴리오 리스크 요인",
  "marketOutlook": "단기 시장 전망"
}`,
  };

  const order: Array<'claude' | 'gemini' | 'gpt'> = 
    roundNumber === 1 ? ['claude', 'gemini', 'gpt'] :
    roundNumber === 2 ? ['gemini', 'gpt', 'claude'] :
    ['gpt', 'claude', 'gemini'];

  for (const character of order) {
    try {
      const model = MODELS[character];
      const systemPrompt = SYSTEM_PROMPTS[character];
      
      // 같은 라운드 내 이전 발언 추가
      let inRoundContext = '';
      if (messages.length > 0) {
        inRoundContext = '\n\n## 이번 라운드에서 다른 분석가 발언\n';
        for (const msg of messages) {
          inRoundContext += `**${msg.character === 'claude' ? '클로드' : msg.character === 'gemini' ? '제미나인' : '테일러'}**: 선택한 종목 - ${msg.picks.join(', ')}\n`;
        }
      }
      
      const userPrompt = roundPrompts[roundNumber] + inRoundContext;
      
      console.log(`[Round ${roundNumber}] ${character} is thinking...`);
      const response = await callOpenRouter(model, systemPrompt, userPrompt);
      
      // JSON 파싱
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const picks = roundNumber === 3 
          ? (parsed.consensusPicks?.map((p: any) => p.symbol) || [])
          : (parsed.picks || []);
        
        messages.push({
          character,
          content: response,
          picks,
        });
        console.log(`[Round ${roundNumber}] ${character} picked: ${picks.slice(0, 5).join(', ')}`);
      }
    } catch (error) {
      console.error(`[Round ${roundNumber}] ${character} error:`, error);
      // 폴백: 기본 선택
      messages.push({
        character,
        content: 'API 오류로 기본 추천을 사용합니다.',
        picks: candidates.slice(0, 5).map(s => s.symbol),
      });
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { round: roundNumber, messages };
}

// 개별 AI의 최종 Top 5 추출 (2라운드 기준 - 각자의 Top 5 확정)
function extractIndividualTop5(rounds: DebateRound[]): {
  claude: string[];
  gemini: string[];
  gpt: string[];
} {
  const result = { claude: [] as string[], gemini: [] as string[], gpt: [] as string[] };
  
  // 2라운드에서 각 AI의 개별 Top 5 추출
  const round2 = rounds.find(r => r.round === 2);
  if (round2) {
    for (const msg of round2.messages) {
      if (msg.picks && msg.picks.length > 0) {
        result[msg.character] = msg.picks.slice(0, 5);
      }
    }
  }
  
  // 2라운드가 없으면 1라운드에서 추출
  if (result.claude.length === 0 || result.gemini.length === 0 || result.gpt.length === 0) {
    const round1 = rounds.find(r => r.round === 1);
    if (round1) {
      for (const msg of round1.messages) {
        if (msg.picks && msg.picks.length > 0 && result[msg.character].length === 0) {
          result[msg.character] = msg.picks.slice(0, 5);
        }
      }
    }
  }
  
  return result;
}

// 최종 합의 도출
function deriveConsensus(rounds: DebateRound[]): { top5: any[]; individualPicks: { claude: string[]; gemini: string[]; gpt: string[] } } {
  const scoreMap = new Map<string, { 
    votes: number; 
    scores: number[]; 
    reasons: string[];
    selectedBy: Set<string>;
  }>();
  
  // 각 AI의 개별 Top 5 추출
  const individualPicks = extractIndividualTop5(rounds);
  
  // 개별 AI의 선택을 점수화 (1라운드 + 2라운드)
  for (const round of rounds.slice(0, 2)) {
    for (const msg of round.messages) {
      const picks = msg.picks || [];
      picks.forEach((symbol, idx) => {
        const existing = scoreMap.get(symbol) || { 
          votes: 0, 
          scores: [], 
          reasons: [],
          selectedBy: new Set<string>()
        };
        // 순위에 따른 가중치 점수 (1위: 5점, 2위: 4점, ...)
        const rankScore = Math.max(5 - idx, 1);
        existing.scores.push(rankScore);
        existing.selectedBy.add(msg.character);
        scoreMap.set(symbol, existing);
      });
    }
  }
  
  // 3라운드 합의 결과도 반영 (추가 가중치)
  const finalRound = rounds[rounds.length - 1];
  for (const msg of finalRound.messages) {
    try {
      const jsonMatch = msg.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.consensusPicks) {
          for (const pick of parsed.consensusPicks) {
            const existing = scoreMap.get(pick.symbol) || { 
              votes: 0, 
              scores: [], 
              reasons: [],
              selectedBy: new Set<string>()
            };
            existing.votes += 1;
            existing.scores.push(pick.score || 3);
            existing.reasons.push(`${msg.character}: ${pick.reason || ''}`);
            existing.selectedBy.add(msg.character);
            scoreMap.set(pick.symbol, existing);
          }
        }
      }
    } catch (e) {
      // JSON 파싱 실패 시 무시
    }
  }

  // 투표 수와 평균 점수로 정렬
  const results = Array.from(scoreMap.entries())
    .map(([symbol, data]) => {
      const stock = CANDIDATE_STOCKS.find(s => s.symbol === symbol);
      const avgScore = data.scores.length > 0 
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length 
        : 0;
      
      // 개별 AI 점수 계산 (먼저 계산)
      const claudeScore = individualPicks.claude.includes(symbol) 
        ? 5 - individualPicks.claude.indexOf(symbol) 
        : 0;
      const geminiScore = individualPicks.gemini.includes(symbol) 
        ? 5 - individualPicks.gemini.indexOf(symbol) 
        : 0;
      const gptScore = individualPicks.gpt.includes(symbol) 
        ? 5 - individualPicks.gpt.indexOf(symbol) 
        : 0;
      
      // 실제 만장일치 여부: 3명 모두 Top 5에 선정했는지 (점수 > 0)
      const isUnanimous = claudeScore > 0 && geminiScore > 0 && gptScore > 0;
      
      return {
        symbol,
        name: stock?.name || symbol,
        sector: stock?.sector || '기타',
        votes: data.selectedBy.size,
        avgScore: Math.round(avgScore * 10) / 10,
        isUnanimous,
        reasons: data.reasons,
        tags: stock?.tags || [],
        claudeScore,
        geminiScore,
        gptScore,
      };
    })
    .sort((a, b) => {
      // 1. 만장일치 우선
      if (a.isUnanimous !== b.isUnanimous) return b.isUnanimous ? 1 : -1;
      // 2. 선택한 AI 수
      if (a.votes !== b.votes) return b.votes - a.votes;
      // 3. 평균 점수
      return b.avgScore - a.avgScore;
    })
    .slice(0, 5)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return { top5: results, individualPicks };
}

export async function GET(request: NextRequest) {
  // Verify cron secret (optional - Vercel Cron doesn't send auth headers by default)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  
  // Vercel Cron 요청이면 허용 (Vercel이 자동으로 x-vercel-cron 헤더 추가)
  const isVercelCron = vercelCronHeader === '1' || request.headers.get('user-agent')?.includes('vercel-cron');
  
  // 인증 체크: Vercel Cron이거나 올바른 인증 헤더가 있으면 허용
  if (process.env.NODE_ENV === 'production' && cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // URL 파라미터
  const { searchParams } = new URL(request.url);
  const customDate = searchParams.get('date');
  const force = searchParams.get('force') === 'true';
  
  // 한국 시간 기준 날짜
  let today: string;
  if (customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
    today = customDate;
  } else {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
    today = kstTime.toISOString().split('T')[0];
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 AI 3대장 토론 시작 - ${today}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 기존 verdict 확인
    const { data: existingVerdict } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', today)
      .single();

    if (existingVerdict && !force) {
      console.log(`[${today}] Verdict already exists`);
      return NextResponse.json({ 
        success: true, 
        message: 'Verdict already exists for today',
        verdict: existingVerdict 
      });
    }

    // force면 기존 데이터 삭제
    if (existingVerdict && force) {
      console.log(`[${today}] Force regeneration - deleting existing...`);
      await supabase.from('verdicts').delete().eq('date', today);
      await supabase.from('predictions').delete().eq('date', today);
    }

    // OpenRouter API 키 확인
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured. Please set it in your environment variables.');
    }

    // 3라운드 토론 실행
    const rounds: DebateRound[] = [];
    
    console.log('\n🎭 라운드 1: 각자의 Top 7 선정');
    const round1 = await runDebateRound(1, CANDIDATE_STOCKS, rounds, today);
    rounds.push(round1);
    
    console.log('\n🎭 라운드 2: 의견 조율 및 Top 5 압축');
    const round2 = await runDebateRound(2, CANDIDATE_STOCKS, rounds, today);
    rounds.push(round2);
    
    console.log('\n🎭 라운드 3: 최종 합의 도출');
    const round3 = await runDebateRound(3, CANDIDATE_STOCKS, rounds, today);
    rounds.push(round3);

    // 최종 Top 5 도출
    const { top5, individualPicks } = deriveConsensus(rounds);
    
    if (top5.length === 0) {
      throw new Error('Failed to derive consensus Top 5');
    }

    console.log('\n🏆 최종 Top 5:');
    top5.forEach(t => console.log(`  ${t.rank}. ${t.name} (${t.symbol}) - 점수: ${t.avgScore}, 만장일치: ${t.isUnanimous ? '✅' : '❌'}, Claude: ${t.claudeScore}, Gemini: ${t.geminiScore}, GPT: ${t.gptScore}`));
    
    console.log('\n📊 개별 AI 선택:');
    console.log(`  Claude: ${individualPicks.claude.join(', ')}`);
    console.log(`  Gemini: ${individualPicks.gemini.join(', ')}`);
    console.log(`  GPT: ${individualPicks.gpt.join(', ')}`);

    // 토론 로그 저장
    const debateLog = {
      date: today,
      rounds: rounds.map(r => ({
        round: r.round,
        messages: r.messages.map(m => ({
          character: m.character,
          picks: m.picks,
          content: m.content.substring(0, 500),
        })),
      })),
    };

    // 개별 AI Top 5 정보 (종목 상세 정보 포함)
    const makeTop5WithDetails = (symbols: string[]) => 
      symbols.map((symbol, idx) => {
        const stock = CANDIDATE_STOCKS.find(s => s.symbol === symbol);
        return {
          rank: idx + 1,
          symbol,
          name: stock?.name || symbol,
          sector: stock?.sector || '기타',
          score: 5 - idx, // 순위에 따른 점수
        };
      });

    const claudeTop5 = makeTop5WithDetails(individualPicks.claude);
    const geminiTop5 = makeTop5WithDetails(individualPicks.gemini);
    const gptTop5 = makeTop5WithDetails(individualPicks.gpt);

    // Verdict 저장
    const unanimousCount = top5.filter(t => t.isUnanimous).length;
    const consensusSummary = `🎯 AI 3대장 토론 완료 | ${unanimousCount}개 만장일치 | 1위: ${top5[0]?.name}`;
    
    // 먼저 debate_log 컬럼이 있는지 확인하고 없으면 기본 데이터만 저장
    let insertData: any = {
      date: today,
      top5: top5,
      consensus_summary: consensusSummary,
      claude_top5: claudeTop5,
      gemini_top5: geminiTop5,
      gpt_top5: gptTop5,
    };
    
    // debate_log 컬럼 추가 시도 (컬럼이 없으면 무시됨)
    try {
      insertData.debate_log = debateLog;
    } catch (e) {
      console.log('debate_log column not available, skipping...');
    }
    
    const { data: verdict, error } = await supabase
      .from('verdicts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // debate_log 또는 개별 AI top5 컬럼이 없으면 기본 데이터만 저장
      console.log('Retrying with minimal data...', error.message);
      const { data: verdictRetry, error: retryError } = await supabase
        .from('verdicts')
        .insert({
          date: today,
          top5: top5,
          consensus_summary: consensusSummary,
        })
        .select()
        .single();
      
      if (retryError) {
        console.error('Supabase INSERT error (retry):', retryError);
        throw retryError;
      }
      
      // 토론 로그는 별도로 콘솔에 출력
      console.log('\n📜 토론 로그 (DB 저장 불가):');
      console.log(JSON.stringify(debateLog, null, 2).substring(0, 1000));
      
      // Predictions 저장
      for (const stock of top5) {
        await supabase.from('predictions').insert({
          verdict_id: verdictRetry.id,
          symbol_code: stock.symbol,
          symbol_name: stock.name,
          predicted_direction: stock.avgScore >= 4 ? 'up' : stock.avgScore >= 3 ? 'hold' : 'down',
          avg_score: stock.avgScore,
          date: today,
        });
      }

      console.log(`\n✅ 토론 완료 및 저장 성공! (일부 컬럼 제외)`);

      return NextResponse.json({
        success: true,
        message: 'Daily Top 5 generated via AI debate',
        date: today,
        verdict: {
          id: verdictRetry.id,
          top5,
          consensusSummary,
          claudeTop5,
          geminiTop5,
          gptTop5,
        },
        debateRounds: rounds.length,
        individualPicks,
      });
    }

    // Predictions 저장
    for (const stock of top5) {
      await supabase.from('predictions').insert({
        verdict_id: verdict.id,
        symbol_code: stock.symbol,
        symbol_name: stock.name,
        predicted_direction: stock.avgScore >= 4 ? 'up' : stock.avgScore >= 3 ? 'hold' : 'down',
        avg_score: stock.avgScore,
        date: today,
      });
    }

    console.log(`\n✅ 토론 완료 및 저장 성공!`);

    return NextResponse.json({
      success: true,
      message: 'Daily Top 5 generated via AI debate',
      date: today,
      verdict: {
        id: verdict.id,
        top5,
        consensusSummary,
        claudeTop5,
        geminiTop5,
        gptTop5,
      },
      debateRounds: rounds.length,
      individualPicks,
    });

  } catch (error: any) {
    console.error(`[${today}] Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate verdict' },
      { status: 500 }
    );
  }
}

// POST도 지원 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request);
}
