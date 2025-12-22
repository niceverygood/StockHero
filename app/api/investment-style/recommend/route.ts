import { NextRequest, NextResponse } from 'next/server';
import { INVESTOR_TYPES, TYPE_PREFERENCES } from '@/lib/investment-style/results';
import type { InvestorType } from '@/lib/investment-style/types';

// AI 캐릭터 정보
const AI_HEROES = {
  claude: {
    name: '클로드 리',
    nameEn: 'Claude Lee',
    style: '밸류에이션 전문가',
    preference: 'value',
  },
  gemini: {
    name: '제미 나인',
    nameEn: 'Gemi Nine',
    style: '성장주 전문가',
    preference: 'growth',
  },
  gpt: {
    name: 'G.P. 테일러',
    nameEn: 'G.P. Taylor',
    style: '매크로 전문가',
    preference: 'macro',
  },
};

// 투자자 유형별 추천 종목 풀
const STOCK_POOL = {
  // 고위험 성장
  highRiskGrowth: [
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI/반도체', risk: 5, growth: 5, value: 1, dividend: 1 },
    { symbol: 'TSLA', name: 'Tesla', sector: '전기차', risk: 5, growth: 5, value: 1, dividend: 1 },
    { symbol: 'PLTR', name: 'Palantir', sector: 'AI/데이터', risk: 5, growth: 5, value: 1, dividend: 1 },
    { symbol: 'COIN', name: 'Coinbase', sector: '크립토', risk: 5, growth: 4, value: 2, dividend: 1 },
    { symbol: 'ARM', name: 'ARM Holdings', sector: '반도체', risk: 4, growth: 5, value: 2, dividend: 1 },
  ],
  // 중위험 성장
  mediumRiskGrowth: [
    { symbol: 'MSFT', name: 'Microsoft', sector: '빅테크', risk: 3, growth: 4, value: 3, dividend: 2 },
    { symbol: 'GOOGL', name: 'Alphabet', sector: '빅테크', risk: 3, growth: 4, value: 4, dividend: 1 },
    { symbol: 'AMZN', name: 'Amazon', sector: 'e커머스/클라우드', risk: 3, growth: 4, value: 3, dividend: 1 },
    { symbol: 'META', name: 'Meta', sector: '소셜/AI', risk: 3, growth: 4, value: 4, dividend: 2 },
    { symbol: 'CRM', name: 'Salesforce', sector: 'SaaS', risk: 3, growth: 4, value: 3, dividend: 1 },
  ],
  // 가치주
  value: [
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: '복합기업', risk: 2, growth: 2, value: 5, dividend: 1 },
    { symbol: 'JPM', name: 'JPMorgan', sector: '금융', risk: 2, growth: 2, value: 5, dividend: 4 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: '헬스케어', risk: 1, growth: 2, value: 5, dividend: 4 },
    { symbol: 'PG', name: 'P&G', sector: '필수소비재', risk: 1, growth: 2, value: 5, dividend: 4 },
    { symbol: 'UNH', name: 'UnitedHealth', sector: '헬스케어', risk: 2, growth: 3, value: 4, dividend: 3 },
  ],
  // 배당주
  dividend: [
    { symbol: 'VZ', name: 'Verizon', sector: '통신', risk: 1, growth: 1, value: 4, dividend: 5 },
    { symbol: 'KO', name: 'Coca-Cola', sector: '음료', risk: 1, growth: 2, value: 4, dividend: 5 },
    { symbol: 'PEP', name: 'PepsiCo', sector: '음료/스낵', risk: 1, growth: 2, value: 4, dividend: 4 },
    { symbol: 'ABBV', name: 'AbbVie', sector: '바이오', risk: 2, growth: 2, value: 4, dividend: 5 },
    { symbol: 'O', name: 'Realty Income', sector: '리츠', risk: 2, growth: 2, value: 4, dividend: 5 },
  ],
  // 한국 성장주
  koreaGrowth: [
    { symbol: '005930', name: '삼성전자', sector: '반도체', risk: 3, growth: 4, value: 4, dividend: 3 },
    { symbol: '000660', name: 'SK하이닉스', sector: '반도체', risk: 4, growth: 5, value: 3, dividend: 2 },
    { symbol: '035420', name: 'NAVER', sector: '인터넷', risk: 3, growth: 4, value: 3, dividend: 1 },
    { symbol: '035720', name: '카카오', sector: '인터넷', risk: 3, growth: 3, value: 3, dividend: 1 },
    { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지', risk: 4, growth: 5, value: 2, dividend: 1 },
  ],
  // 한국 가치/배당주
  koreaValue: [
    { symbol: '086790', name: '하나금융지주', sector: '금융', risk: 2, growth: 2, value: 5, dividend: 5 },
    { symbol: '055550', name: '신한지주', sector: '금융', risk: 2, growth: 2, value: 5, dividend: 5 },
    { symbol: '105560', name: 'KB금융', sector: '금융', risk: 2, growth: 2, value: 5, dividend: 5 },
    { symbol: '051910', name: 'LG화학', sector: '화학/2차전지', risk: 3, growth: 3, value: 4, dividend: 2 },
    { symbol: '017670', name: 'SK텔레콤', sector: '통신', risk: 1, growth: 2, value: 4, dividend: 5 },
  ],
};

// 투자자 유형에 맞는 종목 선택
function selectStocksForType(investorType: InvestorType): any[] {
  const prefs = TYPE_PREFERENCES[investorType];
  const typeInfo = INVESTOR_TYPES[investorType];
  
  let pools: any[][] = [];
  
  // 위험 선호도와 성장/가치 성향에 따라 풀 선택
  if (prefs.riskWeight > 0.7 && prefs.growthWeight > 0.7) {
    pools = [STOCK_POOL.highRiskGrowth, STOCK_POOL.mediumRiskGrowth, STOCK_POOL.koreaGrowth];
  } else if (prefs.riskWeight > 0.5 && prefs.growthWeight > 0.5) {
    pools = [STOCK_POOL.mediumRiskGrowth, STOCK_POOL.koreaGrowth, STOCK_POOL.value];
  } else if (prefs.valueWeight > 0.7 && prefs.dividendWeight > 0.7) {
    pools = [STOCK_POOL.dividend, STOCK_POOL.value, STOCK_POOL.koreaValue];
  } else if (prefs.valueWeight > 0.5) {
    pools = [STOCK_POOL.value, STOCK_POOL.koreaValue, STOCK_POOL.mediumRiskGrowth];
  } else {
    pools = [STOCK_POOL.mediumRiskGrowth, STOCK_POOL.value, STOCK_POOL.koreaGrowth];
  }
  
  // 각 풀에서 점수 계산하여 종목 선택
  const allStocks = pools.flat();
  const scoredStocks = allStocks.map(stock => {
    let score = 0;
    score += stock.growth * prefs.growthWeight;
    score += stock.value * prefs.valueWeight;
    score += stock.dividend * prefs.dividendWeight;
    
    // 위험 선호도에 따른 점수 조정
    if (prefs.volatilityPreference === 'high') {
      score += stock.risk * 0.5;
    } else if (prefs.volatilityPreference === 'low') {
      score += (6 - stock.risk) * 0.5;
    }
    
    return { ...stock, score };
  });
  
  // 점수 순 정렬 후 상위 종목 반환
  return scoredStocks
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// AI별 추천 생성
async function generateAIRecommendation(
  heroId: 'claude' | 'gemini' | 'gpt',
  investorType: InvestorType,
  candidates: any[]
): Promise<any> {
  const hero = AI_HEROES[heroId];
  const typeInfo = INVESTOR_TYPES[investorType];
  const prefs = TYPE_PREFERENCES[investorType];
  
  // 각 AI의 성향에 맞는 종목 선택
  let selectedStock: any;
  
  if (heroId === 'claude') {
    // 클로드: 가치 중시
    selectedStock = candidates
      .sort((a, b) => (b.value + b.dividend) - (a.value + a.dividend))[0];
  } else if (heroId === 'gemini') {
    // 제미니: 성장 중시
    selectedStock = candidates
      .sort((a, b) => (b.growth + b.risk) - (a.growth + a.risk))[0];
  } else {
    // GPT: 균형 중시
    selectedStock = candidates
      .sort((a, b) => b.score - a.score)[0];
  }
  
  // 중복 방지를 위해 선택된 종목 제거
  const idx = candidates.findIndex(c => c.symbol === selectedStock.symbol);
  if (idx > -1) candidates.splice(idx, 1);
  
  // 적합도 계산
  const matchScore = Math.round(
    (selectedStock.score / 5) * 20 + 
    (prefs.growthWeight > 0.5 ? selectedStock.growth * 10 : selectedStock.value * 10) +
    Math.random() * 10 + 60
  );
  
  // AI별 추천 이유 생성
  const reasons: Record<string, string> = {
    claude: `${typeInfo.name} 유형에게 ${selectedStock.name}은 안정적인 밸류에이션과 ${
      selectedStock.dividend > 3 ? '높은 배당수익률' : '견고한 재무구조'
    }를 바탕으로 장기 투자에 적합합니다. ${
      prefs.valueWeight > 0.5 
        ? '가치 중심 투자 성향에 맞는 저평가 우량주입니다.'
        : '성장과 안정성의 균형을 갖춘 종목입니다.'
    }`,
    gemini: `${typeInfo.name}의 ${prefs.growthWeight > 0.5 ? '성장 추구' : '투자'} 성향을 고려할 때, ${selectedStock.name}은 ${selectedStock.sector} 섹터에서 ${
      selectedStock.growth > 3 ? '강력한 성장 모멘텀' : '안정적인 성장세'
    }를 보이고 있어요! ${
      prefs.riskWeight > 0.5
        ? '높은 수익 잠재력을 가진 종목입니다.'
        : '적절한 리스크 수준에서 성장을 기대할 수 있습니다.'
    }`,
    gpt: `${typeInfo.name} 투자자에게 ${selectedStock.name}을 추천드립니다. ${
      selectedStock.sector
    } 섹터의 전망과 ${
      prefs.dividendWeight > 0.5 ? '배당 안정성' : '성장 잠재력'
    }을 종합적으로 고려했습니다. ${
      prefs.volatilityPreference === 'low'
        ? '변동성 관리 측면에서도 적합한 종목입니다.'
        : '시장 상황에 따른 유연한 대응이 가능합니다.'
    }`,
  };
  
  return {
    heroId,
    heroName: hero.name,
    heroStyle: hero.style,
    stockSymbol: selectedStock.symbol,
    stockName: selectedStock.name,
    sector: selectedStock.sector,
    reason: reasons[heroId],
    matchScore: Math.min(matchScore, 98),
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
    const candidates = selectStocksForType(investorType as InvestorType);
    
    // 각 AI의 추천 생성
    const recommendations = await Promise.all([
      generateAIRecommendation('claude', investorType as InvestorType, [...candidates]),
      generateAIRecommendation('gemini', investorType as InvestorType, [...candidates]),
      generateAIRecommendation('gpt', investorType as InvestorType, [...candidates]),
    ]);
    
    return NextResponse.json({
      investorType,
      typeName: typeInfo.name,
      typeEmoji: typeInfo.emoji,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Investment style recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

