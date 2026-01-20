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

// 투자자 유형별 추천 종목 풀 (AI 분석 대상)
const STOCK_CANDIDATES = {
  // 미국 성장주
  usGrowth: [
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI/반도체', market: 'US' },
    { symbol: 'TSLA', name: 'Tesla', sector: '전기차', market: 'US' },
    { symbol: 'PLTR', name: 'Palantir', sector: 'AI/데이터', market: 'US' },
    { symbol: 'MSFT', name: 'Microsoft', sector: '빅테크', market: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet', sector: '빅테크', market: 'US' },
    { symbol: 'AMZN', name: 'Amazon', sector: 'e커머스/클라우드', market: 'US' },
    { symbol: 'META', name: 'Meta', sector: '소셜/AI', market: 'US' },
    { symbol: 'AMD', name: 'AMD', sector: '반도체', market: 'US' },
    { symbol: 'AVGO', name: 'Broadcom', sector: '반도체', market: 'US' },
    { symbol: 'CRM', name: 'Salesforce', sector: 'SaaS', market: 'US' },
  ],
  // 미국 가치/배당주
  usValue: [
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: '복합기업', market: 'US' },
    { symbol: 'JPM', name: 'JPMorgan', sector: '금융', market: 'US' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: '헬스케어', market: 'US' },
    { symbol: 'PG', name: 'P&G', sector: '필수소비재', market: 'US' },
    { symbol: 'KO', name: 'Coca-Cola', sector: '음료', market: 'US' },
    { symbol: 'VZ', name: 'Verizon', sector: '통신', market: 'US' },
    { symbol: 'PEP', name: 'PepsiCo', sector: '음료/스낵', market: 'US' },
    { symbol: 'ABBV', name: 'AbbVie', sector: '바이오', market: 'US' },
    { symbol: 'UNH', name: 'UnitedHealth', sector: '헬스케어', market: 'US' },
    { symbol: 'HD', name: 'Home Depot', sector: '리테일', market: 'US' },
  ],
  // 한국 성장주
  koreaGrowth: [
    { symbol: '005930', name: '삼성전자', sector: '반도체', market: 'KR' },
    { symbol: '000660', name: 'SK하이닉스', sector: '반도체', market: 'KR' },
    { symbol: '035420', name: 'NAVER', sector: '인터넷', market: 'KR' },
    { symbol: '035720', name: '카카오', sector: '인터넷', market: 'KR' },
    { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지', market: 'KR' },
    { symbol: '006400', name: '삼성SDI', sector: '2차전지', market: 'KR' },
    { symbol: '003670', name: '포스코퓨처엠', sector: '2차전지소재', market: 'KR' },
    { symbol: '028260', name: '삼성물산', sector: '건설/무역', market: 'KR' },
    { symbol: '207940', name: '삼성바이오로직스', sector: '바이오', market: 'KR' },
    { symbol: '352820', name: '하이브', sector: '엔터', market: 'KR' },
  ],
  // 한국 가치/배당주
  koreaValue: [
    { symbol: '086790', name: '하나금융지주', sector: '금융', market: 'KR' },
    { symbol: '055550', name: '신한지주', sector: '금융', market: 'KR' },
    { symbol: '105560', name: 'KB금융', sector: '금융', market: 'KR' },
    { symbol: '316140', name: '우리금융지주', sector: '금융', market: 'KR' },
    { symbol: '138930', name: 'BNK금융지주', sector: '금융', market: 'KR' },
    { symbol: '017670', name: 'SK텔레콤', sector: '통신', market: 'KR' },
    { symbol: '030200', name: 'KT', sector: '통신', market: 'KR' },
    { symbol: '032830', name: '삼성생명', sector: '보험', market: 'KR' },
    { symbol: '051910', name: 'LG화학', sector: '화학', market: 'KR' },
    { symbol: '034730', name: 'SK', sector: '지주', market: 'KR' },
  ],
};

// 투자자 유형에 맞는 종목 후보 선택
function getCandidatesForType(investorType: InvestorType): any[] {
  const prefs = TYPE_PREFERENCES[investorType];
  let candidates: any[] = [];
  
  // 성향에 따라 종목 풀 조합
  if (prefs.riskWeight > 0.6 && prefs.growthWeight > 0.6) {
    // 고위험 성장 선호
    candidates = [...STOCK_CANDIDATES.usGrowth, ...STOCK_CANDIDATES.koreaGrowth];
  } else if (prefs.valueWeight > 0.6 || prefs.dividendWeight > 0.6) {
    // 가치/배당 선호
    candidates = [...STOCK_CANDIDATES.usValue, ...STOCK_CANDIDATES.koreaValue];
  } else {
    // 균형형
    candidates = [
      ...STOCK_CANDIDATES.usGrowth.slice(0, 5),
      ...STOCK_CANDIDATES.usValue.slice(0, 5),
      ...STOCK_CANDIDATES.koreaGrowth.slice(0, 5),
      ...STOCK_CANDIDATES.koreaValue.slice(0, 5),
    ];
  }
  
  // 무작위 셔플
  return candidates.sort(() => Math.random() - 0.5);
}

// OpenRouter를 통한 AI 분석
async function callOpenRouterForRecommendation(
  heroId: 'claude' | 'gemini' | 'gpt',
  investorType: InvestorType,
  candidates: any[],
  alreadyRecommended: string[]
): Promise<any> {
  const hero = AI_HEROES[heroId];
  const typeInfo = INVESTOR_TYPES[investorType];
  const prefs = TYPE_PREFERENCES[investorType];
  
  // 이미 추천된 종목 제외
  const availableCandidates = candidates.filter(c => !alreadyRecommended.includes(c.symbol));
  const candidateList = availableCandidates.slice(0, 10);
  
  const systemPrompt = `당신은 "${hero.name}" - ${hero.style}입니다.
투자자 성향 분석 결과에 맞춰 최적의 종목 1개를 추천해야 합니다.

## 당신의 분석 스타일
${heroId === 'claude' ? '- 철저한 펀더멘털 분석, PER/PBR/ROE 중시, 저평가 우량주 선호' : ''}
${heroId === 'gemini' ? '- TAM(전체시장규모) 분석, 성장 모멘텀 중시, 혁신 기업 선호' : ''}
${heroId === 'gpt' ? '- 매크로 경제 분석, 리스크 관리 중시, 균형잡힌 포트폴리오 구성' : ''}

## 투자자 정보
- 투자자 유형: ${typeInfo.name} (${investorType})
- 설명: ${typeInfo.title}
- 위험 선호도: ${prefs.riskWeight > 0.6 ? '높음' : prefs.riskWeight > 0.4 ? '중간' : '낮음'}
- 성장주 선호: ${prefs.growthWeight > 0.5 ? '높음' : '보통'}
- 가치주 선호: ${prefs.valueWeight > 0.5 ? '높음' : '보통'}
- 배당 선호: ${prefs.dividendWeight > 0.5 ? '높음' : '보통'}
- 추천 섹터: ${typeInfo.recommendedSectors.join(', ')}

## 추천 대상 종목 리스트
${candidateList.map((c, i) => `${i + 1}. ${c.name} (${c.symbol}) - ${c.sector}`).join('\n')}

## 응답 형식 (JSON만 응답)
{
  "symbol": "선택한 종목 심볼",
  "name": "종목명",
  "sector": "섹터",
  "reason": "이 투자자 유형에게 이 종목을 추천하는 구체적인 이유 (2-3문장, 당신의 분석 스타일 반영)",
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
      reason: parsed.reason || `${typeInfo.name} 투자자에게 적합한 종목입니다.`,
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
  candidates: any[],
  prefs: any
): any {
  const hero = AI_HEROES[heroId];
  
  // 각 AI의 성향에 맞게 무작위 선택에 가중치 적용
  let shuffled = [...candidates].sort(() => Math.random() - 0.5);
  
  // 섹터 선호도에 따른 필터링
  const preferredSectors = typeInfo.recommendedSectors || [];
  const sectorMatched = shuffled.filter(s => 
    preferredSectors.some((ps: string) => s.sector.includes(ps) || ps.includes(s.sector))
  );
  
  const selected = sectorMatched.length > 0 
    ? sectorMatched[Math.floor(Math.random() * sectorMatched.length)]
    : shuffled[0];
  
  const reasons: Record<string, string> = {
    claude: `${typeInfo.name} 유형의 ${prefs.valueWeight > 0.5 ? '가치 중시' : '안정적인'} 투자 성향을 고려할 때, ${selected.name}은 ${selected.sector} 섹터에서 견고한 펀더멘털을 보여주고 있습니다.`,
    gemini: `${typeInfo.name}의 투자 성향에 ${selected.name}이 딱이에요! ${selected.sector}에서 ${prefs.growthWeight > 0.5 ? '성장 모멘텀이 강하고' : '안정적인 성장을 보이고'} 있습니다.`,
    gpt: `40년 경험으로 볼 때, ${typeInfo.name} 투자자에게 ${selected.name}은 ${selected.sector} 섹터의 ${prefs.riskWeight > 0.5 ? '성장 기회' : '안정성'}을 제공합니다.`,
  };
  
  return {
    heroId,
    heroName: hero.name,
    heroStyle: hero.style,
    stockSymbol: selected.symbol,
    stockName: selected.name,
    sector: selected.sector,
    reason: reasons[heroId],
    matchScore: Math.floor(Math.random() * 15) + 75, // 75-89
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
    
    return NextResponse.json({
      investorType,
      typeName: typeInfo.name,
      typeEmoji: typeInfo.emoji,
      recommendations,
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
