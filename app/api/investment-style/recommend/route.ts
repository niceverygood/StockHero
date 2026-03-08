export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { INVESTOR_TYPES, TYPE_PREFERENCES } from '@/lib/investment-style/results';
import type { InvestorType } from '@/lib/investment-style/types';

// AI 캐릭터 정보 (2026년 1월 - 실제 존재하는 모델)
const AI_HEROES = {
  claude: {
    id: 'claude',
    name: '클로드 리',
    nameEn: 'Claude Lee',
    style: '밸류에이션 전문가',
    model: 'anthropic/claude-sonnet-4',
  },
  gemini: {
    id: 'gemini',
    name: '제미 나인',
    nameEn: 'Gemi Nine',
    style: '성장주 전문가',
    model: 'google/gemini-2.5-pro-preview',
  },
  gpt: {
    id: 'gpt',
    name: 'G.P. 테일러',
    nameEn: 'G.P. Taylor',
    style: '매크로 전문가',
    model: 'openai/gpt-4o',
  },
};

// 변동성 레벨 정의
type VolatilityLevel = 'extreme' | 'high' | 'medium' | 'low';

interface StockCandidate {
  symbol: string;
  name: string;
  sector: string;
  market: 'US' | 'KR';
  volatility: VolatilityLevel;
  beta?: number; // 시장 대비 변동성 (1.0 = 시장과 동일)
  avgDailyMove?: number; // 평균 일일 변동률 %
}

// 투자자 유형별 추천 종목 풀 (변동성 포함)
const STOCK_CANDIDATES: Record<string, StockCandidate[]> = {
  // ===========================================
  // 🔥 극고변동성 종목 (공격적 투자자 전용)
  // ===========================================
  extremeVolatility: [
    // 미국 - 레버리지 ETF & 밈스탁
    { symbol: 'TQQQ', name: 'ProShares 3x QQQ', sector: '레버리지 ETF', market: 'US', volatility: 'extreme', beta: 3.0, avgDailyMove: 4.5 },
    { symbol: 'SOXL', name: 'Direxion 3x 반도체', sector: '레버리지 ETF', market: 'US', volatility: 'extreme', beta: 3.0, avgDailyMove: 5.2 },
    { symbol: 'UPRO', name: 'ProShares 3x S&P500', sector: '레버리지 ETF', market: 'US', volatility: 'extreme', beta: 3.0, avgDailyMove: 3.5 },
    { symbol: 'FNGU', name: 'MicroSectors FANG+ 3x', sector: '레버리지 ETF', market: 'US', volatility: 'extreme', beta: 3.0, avgDailyMove: 5.0 },
    { symbol: 'GME', name: 'GameStop', sector: '밈스탁/리테일', market: 'US', volatility: 'extreme', beta: 2.5, avgDailyMove: 6.0 },
    { symbol: 'AMC', name: 'AMC Entertainment', sector: '밈스탁/엔터', market: 'US', volatility: 'extreme', beta: 2.3, avgDailyMove: 5.5 },
    { symbol: 'MSTR', name: 'MicroStrategy', sector: '비트코인/소프트웨어', market: 'US', volatility: 'extreme', beta: 2.8, avgDailyMove: 7.0 },
    { symbol: 'COIN', name: 'Coinbase', sector: '크립토', market: 'US', volatility: 'extreme', beta: 2.5, avgDailyMove: 5.5 },
    // 한국 - 고변동 소형주 & 테마주
    { symbol: '041510', name: '에스엠', sector: '엔터/K-POP', market: 'KR', volatility: 'extreme', beta: 2.2, avgDailyMove: 4.0 },
    { symbol: '293490', name: '카카오게임즈', sector: '게임', market: 'KR', volatility: 'extreme', beta: 2.0, avgDailyMove: 3.8 },
    { symbol: '112040', name: '위메이드', sector: '게임/블록체인', market: 'KR', volatility: 'extreme', beta: 2.5, avgDailyMove: 5.0 },
    { symbol: '263750', name: '펄어비스', sector: '게임', market: 'KR', volatility: 'extreme', beta: 2.3, avgDailyMove: 4.2 },
    { symbol: '095340', name: 'ISC', sector: '반도체장비', market: 'KR', volatility: 'extreme', beta: 2.4, avgDailyMove: 4.5 },
    { symbol: '039030', name: '이오테크닉스', sector: '레이저장비', market: 'KR', volatility: 'extreme', beta: 2.1, avgDailyMove: 3.9 },
  ],
  
  // ===========================================
  // 🚀 고변동성 성장주
  // ===========================================
  highVolatilityGrowth: [
    // 미국 - 고성장 테크
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI/반도체', market: 'US', volatility: 'high', beta: 1.8, avgDailyMove: 3.2 },
    { symbol: 'TSLA', name: 'Tesla', sector: '전기차', market: 'US', volatility: 'high', beta: 2.0, avgDailyMove: 3.5 },
    { symbol: 'PLTR', name: 'Palantir', sector: 'AI/데이터', market: 'US', volatility: 'high', beta: 1.9, avgDailyMove: 3.0 },
    { symbol: 'AMD', name: 'AMD', sector: '반도체', market: 'US', volatility: 'high', beta: 1.7, avgDailyMove: 2.8 },
    { symbol: 'SMCI', name: 'Super Micro Computer', sector: 'AI서버', market: 'US', volatility: 'high', beta: 2.2, avgDailyMove: 4.0 },
    { symbol: 'CRWD', name: 'CrowdStrike', sector: '사이버보안', market: 'US', volatility: 'high', beta: 1.6, avgDailyMove: 2.5 },
    { symbol: 'SNOW', name: 'Snowflake', sector: '클라우드/데이터', market: 'US', volatility: 'high', beta: 1.8, avgDailyMove: 3.0 },
    { symbol: 'DDOG', name: 'Datadog', sector: '클라우드', market: 'US', volatility: 'high', beta: 1.5, avgDailyMove: 2.4 },
    // 한국 - 성장 테마
    { symbol: '000660', name: 'SK하이닉스', sector: '반도체', market: 'KR', volatility: 'high', beta: 1.6, avgDailyMove: 2.5 },
    { symbol: '035720', name: '카카오', sector: '인터넷', market: 'KR', volatility: 'high', beta: 1.5, avgDailyMove: 2.3 },
    { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지', market: 'KR', volatility: 'high', beta: 1.7, avgDailyMove: 2.8 },
    { symbol: '006400', name: '삼성SDI', sector: '2차전지', market: 'KR', volatility: 'high', beta: 1.5, avgDailyMove: 2.2 },
    { symbol: '003670', name: '포스코퓨처엠', sector: '2차전지소재', market: 'KR', volatility: 'high', beta: 1.8, avgDailyMove: 3.0 },
    { symbol: '352820', name: '하이브', sector: '엔터', market: 'KR', volatility: 'high', beta: 1.6, avgDailyMove: 2.6 },
  ],
  
  // ===========================================
  // 📊 중변동성 우량주
  // ===========================================
  mediumVolatility: [
    // 미국 - 빅테크 & 대형주
    { symbol: 'MSFT', name: 'Microsoft', sector: '빅테크', market: 'US', volatility: 'medium', beta: 1.1, avgDailyMove: 1.5 },
    { symbol: 'GOOGL', name: 'Alphabet', sector: '빅테크', market: 'US', volatility: 'medium', beta: 1.2, avgDailyMove: 1.6 },
    { symbol: 'AMZN', name: 'Amazon', sector: 'e커머스/클라우드', market: 'US', volatility: 'medium', beta: 1.3, avgDailyMove: 1.8 },
    { symbol: 'META', name: 'Meta', sector: '소셜/AI', market: 'US', volatility: 'medium', beta: 1.4, avgDailyMove: 2.0 },
    { symbol: 'AAPL', name: 'Apple', sector: '빅테크', market: 'US', volatility: 'medium', beta: 1.2, avgDailyMove: 1.5 },
    { symbol: 'AVGO', name: 'Broadcom', sector: '반도체', market: 'US', volatility: 'medium', beta: 1.3, avgDailyMove: 1.8 },
    { symbol: 'CRM', name: 'Salesforce', sector: 'SaaS', market: 'US', volatility: 'medium', beta: 1.2, avgDailyMove: 1.7 },
    { symbol: 'NFLX', name: 'Netflix', sector: '스트리밍', market: 'US', volatility: 'medium', beta: 1.4, avgDailyMove: 2.0 },
    // 한국 - 대형 우량주
    { symbol: '005930', name: '삼성전자', sector: '반도체', market: 'KR', volatility: 'medium', beta: 1.1, avgDailyMove: 1.5 },
    { symbol: '035420', name: 'NAVER', sector: '인터넷', market: 'KR', volatility: 'medium', beta: 1.3, avgDailyMove: 1.8 },
    { symbol: '207940', name: '삼성바이오로직스', sector: '바이오', market: 'KR', volatility: 'medium', beta: 1.2, avgDailyMove: 1.6 },
    { symbol: '028260', name: '삼성물산', sector: '건설/무역', market: 'KR', volatility: 'medium', beta: 1.0, avgDailyMove: 1.4 },
    { symbol: '051910', name: 'LG화학', sector: '화학', market: 'KR', volatility: 'medium', beta: 1.3, avgDailyMove: 1.8 },
    { symbol: '066570', name: 'LG전자', sector: '전자', market: 'KR', volatility: 'medium', beta: 1.1, avgDailyMove: 1.5 },
  ],
  
  // ===========================================
  // 🛡️ 저변동성 안정주
  // ===========================================
  lowVolatility: [
    // 미국 - 배당/가치주
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: '복합기업', market: 'US', volatility: 'low', beta: 0.9, avgDailyMove: 0.9 },
    { symbol: 'JPM', name: 'JPMorgan', sector: '금융', market: 'US', volatility: 'low', beta: 1.0, avgDailyMove: 1.2 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: '헬스케어', market: 'US', volatility: 'low', beta: 0.6, avgDailyMove: 0.8 },
    { symbol: 'PG', name: 'P&G', sector: '필수소비재', market: 'US', volatility: 'low', beta: 0.5, avgDailyMove: 0.7 },
    { symbol: 'KO', name: 'Coca-Cola', sector: '음료', market: 'US', volatility: 'low', beta: 0.6, avgDailyMove: 0.8 },
    { symbol: 'VZ', name: 'Verizon', sector: '통신', market: 'US', volatility: 'low', beta: 0.4, avgDailyMove: 0.7 },
    { symbol: 'PEP', name: 'PepsiCo', sector: '음료/스낵', market: 'US', volatility: 'low', beta: 0.6, avgDailyMove: 0.8 },
    { symbol: 'ABBV', name: 'AbbVie', sector: '바이오', market: 'US', volatility: 'low', beta: 0.7, avgDailyMove: 1.0 },
    { symbol: 'UNH', name: 'UnitedHealth', sector: '헬스케어', market: 'US', volatility: 'low', beta: 0.8, avgDailyMove: 1.1 },
    { symbol: 'HD', name: 'Home Depot', sector: '리테일', market: 'US', volatility: 'low', beta: 1.0, avgDailyMove: 1.2 },
    // 한국 - 배당/금융주
    { symbol: '086790', name: '하나금융지주', sector: '금융', market: 'KR', volatility: 'low', beta: 0.9, avgDailyMove: 1.1 },
    { symbol: '055550', name: '신한지주', sector: '금융', market: 'KR', volatility: 'low', beta: 0.9, avgDailyMove: 1.0 },
    { symbol: '105560', name: 'KB금융', sector: '금융', market: 'KR', volatility: 'low', beta: 0.9, avgDailyMove: 1.1 },
    { symbol: '316140', name: '우리금융지주', sector: '금융', market: 'KR', volatility: 'low', beta: 0.8, avgDailyMove: 1.0 },
    { symbol: '017670', name: 'SK텔레콤', sector: '통신', market: 'KR', volatility: 'low', beta: 0.5, avgDailyMove: 0.8 },
    { symbol: '030200', name: 'KT', sector: '통신', market: 'KR', volatility: 'low', beta: 0.5, avgDailyMove: 0.7 },
    { symbol: '032830', name: '삼성생명', sector: '보험', market: 'KR', volatility: 'low', beta: 0.7, avgDailyMove: 0.9 },
    { symbol: '034730', name: 'SK', sector: '지주', market: 'KR', volatility: 'low', beta: 0.8, avgDailyMove: 1.0 },
  ],
};

// 변동성 선호도별 종목 풀 매핑
const VOLATILITY_POOLS: Record<string, VolatilityLevel[]> = {
  high: ['extreme', 'high'],      // 공격형: 극고변동 + 고변동
  medium: ['high', 'medium'],     // 중립형: 고변동 + 중변동
  low: ['medium', 'low'],         // 안정형: 중변동 + 저변동
};

// 투자자 유형에 맞는 종목 후보 선택 (변동성 기반)
function getCandidatesForType(investorType: InvestorType): StockCandidate[] {
  const prefs = TYPE_PREFERENCES[investorType];
  const typeInfo = INVESTOR_TYPES[investorType];
  let candidates: StockCandidate[] = [];
  
  // 1. 변동성 선호도에 따른 기본 풀 선택
  const volatilityLevels = VOLATILITY_POOLS[prefs.volatilityPreference];
  
  // 공격형 투자자 (volatilityPreference: 'high')
  if (prefs.volatilityPreference === 'high') {
    // 극고변동성 종목 우선 포함
    candidates = [
      ...STOCK_CANDIDATES.extremeVolatility,
      ...STOCK_CANDIDATES.highVolatilityGrowth,
    ];
    
    // 성장주 선호가 높으면 극고변동 비중 높임
    if (prefs.growthWeight > 0.7) {
      // 레버리지 ETF, 밈스탁 추가 가중치
      const extremeStocks = STOCK_CANDIDATES.extremeVolatility;
      candidates = [...extremeStocks, ...extremeStocks.slice(0, 5), ...candidates];
    }
  } 
  // 중립형 투자자 (volatilityPreference: 'medium')
  else if (prefs.volatilityPreference === 'medium') {
    candidates = [
      ...STOCK_CANDIDATES.highVolatilityGrowth,
      ...STOCK_CANDIDATES.mediumVolatility,
    ];
    
    // 성장 vs 가치 비율에 따라 조정
    if (prefs.growthWeight > prefs.valueWeight) {
      candidates = [...STOCK_CANDIDATES.highVolatilityGrowth, ...candidates];
    } else {
      candidates = [...STOCK_CANDIDATES.mediumVolatility, ...candidates];
    }
  }
  // 안정형 투자자 (volatilityPreference: 'low')
  else {
    candidates = [
      ...STOCK_CANDIDATES.lowVolatility,
      ...STOCK_CANDIDATES.mediumVolatility.slice(0, 5),
    ];
    
    // 배당 선호가 높으면 저변동 배당주 비중 높임
    if (prefs.dividendWeight > 0.7) {
      const lowVolStocks = STOCK_CANDIDATES.lowVolatility;
      candidates = [...lowVolStocks, ...lowVolStocks.slice(0, 5), ...candidates];
    }
  }
  
  // 2. 추천 섹터 기반 가중치 적용
  const recommendedSectors = typeInfo.recommendedSectors || [];
  candidates = candidates.map(stock => {
    const sectorMatch = recommendedSectors.some(
      (sector: string) => stock.sector.includes(sector) || sector.includes(stock.sector)
    );
    return { ...stock, _sectorBoost: sectorMatch ? 1 : 0 };
  });
  
  // 3. 섹터 매칭 종목 우선 + 무작위 셔플
  candidates.sort((a, b) => {
    const aBoost = (a as any)._sectorBoost || 0;
    const bBoost = (b as any)._sectorBoost || 0;
    if (bBoost !== aBoost) return bBoost - aBoost;
    return Math.random() - 0.5;
  });
  
  // 4. 중복 제거
  const seen = new Set<string>();
  candidates = candidates.filter(stock => {
    if (seen.has(stock.symbol)) return false;
    seen.add(stock.symbol);
    return true;
  });
  
  return candidates;
}

// 변동성 레벨을 한글로 변환
function getVolatilityLabel(volatility: VolatilityLevel): string {
  const labels: Record<VolatilityLevel, string> = {
    extreme: '극고변동 🔥🔥🔥',
    high: '고변동 🔥🔥',
    medium: '중변동 📊',
    low: '저변동 🛡️',
  };
  return labels[volatility];
}

// 변동성 기반 위험 등급
function getVolatilityRiskLevel(volatility: VolatilityLevel): number {
  const levels: Record<VolatilityLevel, number> = {
    extreme: 5,
    high: 4,
    medium: 3,
    low: 2,
  };
  return levels[volatility];
}

// OpenRouter를 통한 AI 분석
async function callOpenRouterForRecommendation(
  heroId: 'claude' | 'gemini' | 'gpt',
  investorType: InvestorType,
  candidates: StockCandidate[],
  alreadyRecommended: string[]
): Promise<any> {
  const hero = AI_HEROES[heroId];
  const typeInfo = INVESTOR_TYPES[investorType];
  const prefs = TYPE_PREFERENCES[investorType];
  
  // 이미 추천된 종목 제외
  const availableCandidates = candidates.filter(c => !alreadyRecommended.includes(c.symbol));
  const candidateList = availableCandidates.slice(0, 12);
  
  // 변동성 선호도 설명
  const volatilityDescription = {
    high: '고변동성 종목을 선호합니다. 큰 수익을 위해 큰 리스크를 감수할 준비가 되어있습니다. 레버리지 ETF, 밈스탁, 고성장 테마주 등 일일 변동폭이 큰 종목이 적합합니다.',
    medium: '적당한 변동성의 종목을 선호합니다. 성장 가능성과 안정성의 균형을 추구합니다.',
    low: '낮은 변동성의 종목을 선호합니다. 원금 보존과 꾸준한 수익을 중시합니다. 배당주, 우량 대형주가 적합합니다.',
  };
  
  const systemPrompt = `당신은 "${hero.name}" - ${hero.style}입니다.
투자자 성향 분석 결과에 맞춰 최적의 종목 1개를 추천해야 합니다.

## 당신의 분석 스타일
${heroId === 'claude' ? '- 철저한 펀더멘털 분석, PER/PBR/ROE 중시, 저평가 우량주 선호\n- 하지만 공격적 투자자에게는 성장성과 모멘텀도 함께 고려' : ''}
${heroId === 'gemini' ? '- TAM(전체시장규모) 분석, 성장 모멘텀 중시, 혁신 기업 선호\n- 공격적 투자자에게는 고변동 고성장 종목 적극 추천' : ''}
${heroId === 'gpt' ? '- 매크로 경제 분석, 리스크 관리 중시\n- 투자자의 위험 성향에 맞는 포지션 사이징 조언 포함' : ''}

## 투자자 정보
- 투자자 유형: ${typeInfo.name} (${investorType})
- 설명: ${typeInfo.title}
- 위험 선호도: ${prefs.riskWeight > 0.8 ? '매우 높음 (공격적)' : prefs.riskWeight > 0.6 ? '높음' : prefs.riskWeight > 0.4 ? '중간' : '낮음 (안정적)'}
- 변동성 선호: ${prefs.volatilityPreference.toUpperCase()} - ${volatilityDescription[prefs.volatilityPreference]}
- 성장주 선호: ${prefs.growthWeight > 0.7 ? '매우 높음' : prefs.growthWeight > 0.5 ? '높음' : '보통'}
- 가치주 선호: ${prefs.valueWeight > 0.5 ? '높음' : '보통'}
- 배당 선호: ${prefs.dividendWeight > 0.5 ? '높음' : '보통'}
- 리스크 레벨: ${typeInfo.riskLevel}/5
- 추천 섹터: ${typeInfo.recommendedSectors.join(', ')}

## 추천 대상 종목 리스트 (변동성 정보 포함)
${candidateList.map((c, i) => {
  const volLabel = getVolatilityLabel(c.volatility);
  const betaStr = c.beta ? `베타 ${c.beta}` : '';
  const moveStr = c.avgDailyMove ? `일평균 ${c.avgDailyMove}% 변동` : '';
  return `${i + 1}. ${c.name} (${c.symbol}) - ${c.sector} | ${volLabel} | ${betaStr} ${moveStr}`;
}).join('\n')}

## 중요 지침
${prefs.volatilityPreference === 'high' ? `
- 이 투자자는 공격적 성향입니다! 고변동성 종목을 우선 추천하세요.
- 레버리지 ETF(TQQQ, SOXL 등)나 밈스탁도 적극 고려하세요.
- "안전한" 종목보다 "고수익 기회"가 있는 종목을 추천하세요.
- 변동성이 클수록 이 투자자에게 더 적합합니다.
` : prefs.volatilityPreference === 'low' ? `
- 이 투자자는 안정적 성향입니다. 저변동성 우량주를 추천하세요.
- 배당 수익률, 재무 안정성을 중시하세요.
- 변동성이 낮을수록 이 투자자에게 더 적합합니다.
` : `
- 이 투자자는 균형잡힌 성향입니다.
- 성장성과 안정성의 균형을 고려하세요.
`}

## 응답 형식 (JSON만 응답)
{
  "symbol": "선택한 종목 심볼",
  "name": "종목명",
  "sector": "섹터",
  "volatility": "extreme/high/medium/low 중 하나",
  "reason": "이 투자자 유형에게 이 종목을 추천하는 구체적인 이유 (2-3문장, 변동성 특성과 당신의 분석 스타일 반영)",
  "riskWarning": "이 종목의 주요 위험 요소 (1문장)",
  "matchScore": 70-98 사이의 적합도 점수
}`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    // API 키가 없으면 폴백 로직 사용
    return generateFallbackRecommendation(heroId, typeInfo, candidateList, prefs);
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
        'X-Title': 'StockHero Investment Style',
      },
      body: JSON.stringify({
        model: hero.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${typeInfo.name} 투자자에게 가장 적합한 종목 1개를 추천해주세요. JSON 형식으로만 응답하세요.` },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      console.error(`OpenRouter API error for ${heroId}:`, await response.text());
      return generateFallbackRecommendation(heroId, typeInfo, candidateList, prefs);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackRecommendation(heroId, typeInfo, candidateList, prefs);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // 응답 검증
    const validStock = candidateList.find(c => 
      c.symbol === parsed.symbol || c.name === parsed.name
    );
    
    if (!validStock) {
      return generateFallbackRecommendation(heroId, typeInfo, candidateList, prefs);
    }
    
    return {
      heroId,
      heroName: hero.name,
      heroStyle: hero.style,
      stockSymbol: validStock.symbol,
      stockName: validStock.name,
      sector: validStock.sector,
      market: validStock.market,
      // 변동성 정보 추가
      volatility: validStock.volatility,
      volatilityLabel: getVolatilityLabel(validStock.volatility),
      beta: validStock.beta,
      avgDailyMove: validStock.avgDailyMove,
      riskLevel: getVolatilityRiskLevel(validStock.volatility),
      reason: parsed.reason || `${typeInfo.name} 투자자에게 적합한 종목입니다.`,
      riskWarning: parsed.riskWarning || null,
      matchScore: Math.min(Math.max(parsed.matchScore || 75, 70), 98),
    };
    
  } catch (error) {
    console.error(`AI recommendation error for ${heroId}:`, error);
    return generateFallbackRecommendation(heroId, typeInfo, candidateList, prefs);
  }
}

// 폴백 추천 생성 (API 실패 시)
function generateFallbackRecommendation(
  heroId: 'claude' | 'gemini' | 'gpt',
  typeInfo: any,
  candidates: StockCandidate[],
  prefs: any
): any {
  const hero = AI_HEROES[heroId];
  
  // 변동성 선호도에 따른 우선순위 정렬
  let sortedCandidates = [...candidates];
  
  if (prefs.volatilityPreference === 'high') {
    // 공격형: 극고변동 > 고변동 순으로 우선
    sortedCandidates.sort((a, b) => {
      const volOrder: Record<VolatilityLevel, number> = { extreme: 4, high: 3, medium: 2, low: 1 };
      return volOrder[b.volatility] - volOrder[a.volatility];
    });
  } else if (prefs.volatilityPreference === 'low') {
    // 안정형: 저변동 > 중변동 순으로 우선
    sortedCandidates.sort((a, b) => {
      const volOrder: Record<VolatilityLevel, number> = { extreme: 1, high: 2, medium: 3, low: 4 };
      return volOrder[b.volatility] - volOrder[a.volatility];
    });
  }
  
  // 섹터 선호도에 따른 필터링
  const preferredSectors = typeInfo.recommendedSectors || [];
  const sectorMatched = sortedCandidates.filter(s => 
    preferredSectors.some((ps: string) => s.sector.includes(ps) || ps.includes(s.sector))
  );
  
  // 변동성 매칭된 종목 중 선택 (약간의 랜덤성 추가)
  const topCandidates = sectorMatched.length > 0 
    ? sectorMatched.slice(0, 5)
    : sortedCandidates.slice(0, 5);
  
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  
  // 변동성에 따른 추천 이유 생성
  const volatilityReasons: Record<VolatilityLevel, Record<string, string>> = {
    extreme: {
      claude: `${typeInfo.name} 투자자의 공격적 성향에 맞춰, ${selected.name}을 추천합니다. 일평균 ${selected.avgDailyMove || 5}%의 높은 변동성은 큰 수익 기회를 제공하지만, 펀더멘털 체크는 필수입니다.`,
      gemini: `${selected.name}은 ${selected.sector}에서 폭발적 성장 가능성을 보여주고 있어요! 베타 ${selected.beta || 2.0} 이상의 높은 변동성은 ${typeInfo.name} 유형에게 딱 맞습니다.`,
      gpt: `${typeInfo.name} 투자자님, ${selected.name}은 고위험 고수익 종목입니다. 포지션 사이징을 신중히 하시고, 전체 자산의 5-10% 내에서 투자를 권장합니다.`,
    },
    high: {
      claude: `${selected.name}은 ${selected.sector}의 성장성과 적절한 변동성(베타 ${selected.beta || 1.5})을 갖춘 종목입니다. ${typeInfo.name} 투자자에게 좋은 기회가 될 수 있습니다.`,
      gemini: `${selected.name}! ${selected.sector}에서 모멘텀이 살아있어요. 일평균 ${selected.avgDailyMove || 3}% 변동은 ${typeInfo.name} 유형의 적극적 매매에 적합합니다.`,
      gpt: `${selected.name}은 성장 잠재력과 관리 가능한 리스크를 갖춘 종목입니다. ${typeInfo.name} 투자자에게 균형 잡힌 선택이 될 것입니다.`,
    },
    medium: {
      claude: `${typeInfo.name} 유형에게 ${selected.name}을 추천합니다. ${selected.sector}의 안정적 성장과 적절한 변동성이 균형을 이룹니다.`,
      gemini: `${selected.name}은 ${selected.sector}에서 꾸준한 성장을 보여주고 있어요. 중간 수준의 변동성으로 안정적인 투자가 가능합니다.`,
      gpt: `${selected.name}은 성장성과 안정성의 균형을 갖춘 종목입니다. ${typeInfo.name} 투자자의 포트폴리오에 핵심 종목으로 적합합니다.`,
    },
    low: {
      claude: `${typeInfo.name} 유형의 안정 추구 성향을 고려해 ${selected.name}을 추천합니다. 베타 ${selected.beta || 0.8}의 낮은 변동성과 견고한 펀더멘털이 특징입니다.`,
      gemini: `${selected.name}은 ${selected.sector}에서 안정적인 흐름을 보여주고 있어요. 변동성 걱정 없이 장기 투자에 적합합니다.`,
      gpt: `${selected.name}은 방어적 포트폴리오의 핵심입니다. 낮은 변동성과 꾸준한 수익이 ${typeInfo.name} 투자자에게 적합합니다.`,
    },
  };
  
  const reason = volatilityReasons[selected.volatility][heroId];
  
  // 위험 경고 메시지
  const riskWarnings: Record<VolatilityLevel, string> = {
    extreme: '극심한 가격 변동으로 단기간 50% 이상 손실 가능성이 있습니다. 레버리지 상품은 장기 보유에 부적합합니다.',
    high: '시장 변동 시 큰 폭의 손실이 발생할 수 있습니다. 분할 매수/매도 전략을 권장합니다.',
    medium: '시장 상황에 따라 10-20% 수준의 조정이 있을 수 있습니다.',
    low: '저변동 종목이지만 시장 급락 시 손실이 발생할 수 있습니다.',
  };
  
  return {
    heroId,
    heroName: hero.name,
    heroStyle: hero.style,
    stockSymbol: selected.symbol,
    stockName: selected.name,
    sector: selected.sector,
    market: selected.market,
    // 변동성 정보 추가
    volatility: selected.volatility,
    volatilityLabel: getVolatilityLabel(selected.volatility),
    beta: selected.beta,
    avgDailyMove: selected.avgDailyMove,
    riskLevel: getVolatilityRiskLevel(selected.volatility),
    reason,
    riskWarning: riskWarnings[selected.volatility],
    matchScore: Math.floor(Math.random() * 15) + (prefs.volatilityPreference === 'high' && selected.volatility === 'extreme' ? 85 : 75),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { investorType } = await request.json();
    
    if (!investorType || !INVESTOR_TYPES[investorType as InvestorType]) {
      return NextResponse.json(
        { error: 'Invalid investor type' },
        { status: 400 }
      );
    }
    
    const typeInfo = INVESTOR_TYPES[investorType as InvestorType];
    const prefs = TYPE_PREFERENCES[investorType as InvestorType];
    
    // 투자자 유형에 맞는 종목 후보 선택
    const candidates = getCandidatesForType(investorType as InvestorType);
    
    // 중복 추천 방지를 위한 추적
    const alreadyRecommended: string[] = [];
    
    // 각 AI의 추천을 순차적으로 생성 (중복 방지)
    const recommendations = [];
    
    for (const heroId of ['claude', 'gemini', 'gpt'] as const) {
      const rec = await callOpenRouterForRecommendation(
        heroId,
        investorType as InvestorType,
        candidates,
        alreadyRecommended
      );
      recommendations.push(rec);
      alreadyRecommended.push(rec.stockSymbol);
    }
    
    // 변동성 선호도 정보 추가
    const volatilityInfo = {
      preference: prefs.volatilityPreference,
      description: {
        high: '공격적 투자 성향으로, 높은 변동성을 감수하고 큰 수익을 추구합니다.',
        medium: '균형 잡힌 투자 성향으로, 적절한 위험과 수익의 균형을 추구합니다.',
        low: '안정적 투자 성향으로, 원금 보존과 꾸준한 수익을 우선합니다.',
      }[prefs.volatilityPreference],
      recommendedBeta: {
        high: '1.5 이상 (시장 대비 1.5배 이상 변동)',
        medium: '0.8 ~ 1.5 (시장과 유사한 변동)',
        low: '0.8 미만 (시장 대비 낮은 변동)',
      }[prefs.volatilityPreference],
      riskLevel: typeInfo.riskLevel,
    };
    
    return NextResponse.json({
      investorType,
      typeName: typeInfo.name,
      typeEmoji: typeInfo.emoji,
      typeTitle: typeInfo.title,
      volatilityInfo,
      recommendations,
      disclaimer: prefs.volatilityPreference === 'high' 
        ? '⚠️ 공격적 투자 성향에 맞춰 고변동성 종목이 추천되었습니다. 투자 금액은 감당 가능한 범위 내에서 결정하시고, 분산 투자를 권장합니다.'
        : null,
      generatedAt: new Date().toISOString(),
      isAIGenerated: !!process.env.OPENROUTER_API_KEY,
    });
    
  } catch (error) {
    console.error('Investment style recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
