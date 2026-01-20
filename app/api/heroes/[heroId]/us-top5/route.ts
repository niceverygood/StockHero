import { NextRequest, NextResponse } from 'next/server';
import { fetchMultipleYahooUSStocks } from '@/lib/market-data/yahoo';

// 분석 대상 미국주식 목록
const US_ANALYSIS_STOCKS = [
  // 빅테크
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', marketCap: 'Large', per: 28, growth: 8 },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', marketCap: 'Large', per: 35, growth: 15 },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', marketCap: 'Large', per: 22, growth: 12 },
  { symbol: 'AMZN', name: 'Amazon', sector: 'Technology', marketCap: 'Large', per: 45, growth: 20 },
  { symbol: 'META', name: 'Meta', sector: 'Technology', marketCap: 'Large', per: 25, growth: 18 },
  // 반도체
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductor', marketCap: 'Large', per: 55, growth: 85 },
  { symbol: 'TSM', name: 'TSMC', sector: 'Semiconductor', marketCap: 'Large', per: 22, growth: 25 },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Semiconductor', marketCap: 'Large', per: 30, growth: 20 },
  { symbol: 'AMD', name: 'AMD', sector: 'Semiconductor', marketCap: 'Large', per: 40, growth: 30 },
  { symbol: 'INTC', name: 'Intel', sector: 'Semiconductor', marketCap: 'Large', per: 15, growth: -5 },
  // 전기차/에너지
  { symbol: 'TSLA', name: 'Tesla', sector: 'EV/Clean Energy', marketCap: 'Large', per: 70, growth: 25 },
  // 금융
  { symbol: 'JPM', name: 'JPMorgan', sector: 'Finance', marketCap: 'Large', per: 12, growth: 8 },
  { symbol: 'V', name: 'Visa', sector: 'Finance', marketCap: 'Large', per: 28, growth: 12 },
  { symbol: 'MA', name: 'Mastercard', sector: 'Finance', marketCap: 'Large', per: 35, growth: 14 },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance', marketCap: 'Large', per: 14, growth: 10 },
  // 소비재
  { symbol: 'COST', name: 'Costco', sector: 'Retail', marketCap: 'Large', per: 50, growth: 10 },
  { symbol: 'WMT', name: 'Walmart', sector: 'Retail', marketCap: 'Large', per: 28, growth: 6 },
  { symbol: 'MCD', name: "McDonald's", sector: 'Consumer', marketCap: 'Large', per: 25, growth: 8 },
  { symbol: 'SBUX', name: 'Starbucks', sector: 'Consumer', marketCap: 'Large', per: 22, growth: 5 },
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer', marketCap: 'Large', per: 28, growth: 7 },
  // 헬스케어
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', marketCap: 'Large', per: 20, growth: 12 },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', marketCap: 'Large', per: 85, growth: 40 },
  { symbol: 'JNJ', name: 'J&J', sector: 'Healthcare', marketCap: 'Large', per: 15, growth: 5 },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare', marketCap: 'Large', per: 12, growth: -10 },
  // 엔터테인먼트
  { symbol: 'NFLX', name: 'Netflix', sector: 'Entertainment', marketCap: 'Large', per: 42, growth: 15 },
  { symbol: 'DIS', name: 'Disney', sector: 'Entertainment', marketCap: 'Large', per: 35, growth: 8 },
  // 에너지
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', marketCap: 'Large', per: 14, growth: 5 },
  { symbol: 'CVX', name: 'Chevron', sector: 'Energy', marketCap: 'Large', per: 15, growth: 4 },
  // 성장주
  { symbol: 'COIN', name: 'Coinbase', sector: 'Crypto', marketCap: 'Mid', per: 25, growth: 50 },
  { symbol: 'PLTR', name: 'Palantir', sector: 'AI/Data', marketCap: 'Mid', per: 180, growth: 30 },
];

// OpenRouter 모델 매핑
// OpenRouter 최신 모델 (2026년 1월) - 실제 존재하는 모델
const OPENROUTER_MODELS: Record<string, string> = {
  claude: 'anthropic/claude-sonnet-4',           // Claude Sonnet 4 (최신)
  gemini: 'google/gemini-2.5-pro-preview',       // Gemini 2.5 Pro (최신)
  gpt: 'openai/gpt-4o',                          // GPT-4o (최신)
};

// 캐릭터별 프로필
const CHARACTER_PROFILES = {
  claude: {
    name: 'Claude Lee',
    nameKo: '클로드 리',
    title: '숫자의 검사',
    criteria: '밸류에이션 기반 저평가 우량주',
    methodology: 'PER, PEG, FCF, ROE 분석',
    systemPrompt: `You are "Claude Lee", a veteran fundamental analyst.
You analyze US stocks based on valuation metrics like PER, PEG ratio, and free cash flow.
You prefer undervalued quality stocks with strong fundamentals.
Respond in Korean with specific numerical evidence.

## Response Format (JSON only)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Company Name",
      "score": 4.5,
      "targetPriceMultiplier": 1.25,
      "reason": "Detailed analysis with specific metrics (PER, growth rate, etc.) in 3-4 sentences in Korean",
      "risks": ["Specific risk 1", "Specific risk 2"]
    }
  ]
}`,
  },
  gemini: {
    name: 'Gemi Nine',
    nameKo: '제미 나인',
    title: '파괴적 혁신가',
    criteria: '고성장 테크주 & AI 수혜주',
    methodology: 'TAM, 성장률, 기술 경쟁력 분석',
    systemPrompt: `You are "Gemi Nine", a Silicon Valley tech investor.
You focus on high-growth technology stocks, especially AI and semiconductor plays.
You look for disruptive companies with massive TAM and strong growth momentum.
Respond in Korean with excitement and specific growth metrics.

## Response Format (JSON only)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Company Name",
      "score": 5.0,
      "targetPriceMultiplier": 1.40,
      "reason": "Growth-focused analysis with TAM, growth rates, tech moat in 3-4 sentences in Korean. Use some English expressions!",
      "risks": ["Specific risk 1", "Specific risk 2"]
    }
  ]
}`,
  },
  gpt: {
    name: 'G.P. Taylor',
    nameKo: 'G.P. 테일러',
    title: '월가의 현자',
    criteria: '배당주 & 방어적 대형주',
    methodology: '배당수익률, 배당성장률, 재무안정성 분석',
    systemPrompt: `You are "G.P. Taylor", a 40-year Wall Street veteran strategist.
You prioritize risk management and prefer dividend-paying blue chips.
You focus on defensive stocks with stable earnings and strong balance sheets.
Respond in Korean with wisdom and conservative analysis.

## Response Format (JSON only)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Company Name",
      "score": 4.0,
      "targetPriceMultiplier": 1.15,
      "reason": "Conservative analysis focusing on dividends, stability, and risk in 3-4 sentences in Korean",
      "risks": ["Specific risk 1", "Specific risk 2"]
    }
  ]
}`,
  },
};

async function analyzeWithOpenRouter(
  heroId: string,
  stocks: typeof US_ANALYSIS_STOCKS,
  realPrices: Map<string, any>
): Promise<any[]> {
  const profile = CHARACTER_PROFILES[heroId as keyof typeof CHARACTER_PROFILES];
  if (!profile) return [];

  const model = OPENROUTER_MODELS[heroId];
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || !model) {
    console.error('[OpenRouter] API key or model not configured');
    return [];
  }

  const stockList = stocks
    .map((s) => {
      const realPrice = realPrices.get(s.symbol);
      return `- ${s.name} (${s.symbol}): $${realPrice?.price?.toFixed(2) || 'N/A'}, Change: ${realPrice?.changePercent?.toFixed(2) || 0}%, PER: ${s.per}, Growth: ${s.growth}%, Sector: ${s.sector}`;
    })
    .join('\n');

  const prompt = `Analyze the following US stocks and select your Top 5 recommendations.

## Stocks to Analyze
${stockList}

## Important Guidelines
- Provide specific numerical evidence for each recommendation
- Include PER comparison, growth rates, competitive advantages
- Explain why you chose this target price multiplier
- Mix of sectors for diversification

Respond with JSON only, no other text.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
        'X-Title': 'StockHero US Stock Analysis',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: profile.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[OpenRouter] API error: ${response.status}`, error);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // JSON 추출 및 정제
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      
      // JSON 정제 - 일반적인 오류 수정
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')           // 트레일링 콤마 제거
        .replace(/,\s*]/g, ']')           // 배열 트레일링 콤마 제거
        .replace(/[\u0000-\u001F]+/g, '') // 제어 문자 제거
        .replace(/\n\s*\n/g, '\n');       // 중복 줄바꿈 제거
      
      try {
        const parsed = JSON.parse(jsonStr);
        const result = parsed.top5 || [];
        console.log(`[OpenRouter US] Successfully parsed ${result.length} stocks for ${heroId}`);
        return result;
      } catch (parseError) {
        console.error('[OpenRouter US] JSON parse error, trying to fix:', parseError);
        
        // 추가 정제 시도
        jsonStr = jsonStr.replace(/(["\d])\s*\n\s*(["\d{[])/g, '$1,$2');
        try {
          const parsed = JSON.parse(jsonStr);
          const result = parsed.top5 || [];
          console.log(`[OpenRouter US] Recovered ${result.length} stocks for ${heroId}`);
          return result;
        } catch {
          console.error('[OpenRouter US] Failed to recover JSON');
        }
      }
    }
  } catch (error) {
    console.error('[OpenRouter US] Analysis error:', error);
  }
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ heroId: string }> }
) {
  const { heroId } = await params;

  const profile = CHARACTER_PROFILES[heroId as keyof typeof CHARACTER_PROFILES];

  if (!profile) {
    return NextResponse.json({ error: 'Hero not found' }, { status: 404 });
  }

  // 1. 실시간 가격 조회 (Yahoo Finance)
  const symbols = US_ANALYSIS_STOCKS.map((s) => s.symbol);
  let realPrices: Map<string, any> = new Map();

  try {
    realPrices = await fetchMultipleYahooUSStocks(symbols);
    console.log(`[US Top5] Fetched ${realPrices.size} stock prices`);
  } catch (error) {
    console.error('Failed to fetch US stock prices:', error);
  }

  // 2. AI 분석 수행
  let top5: any[] = [];

  try {
    if (process.env.OPENROUTER_API_KEY) {
      console.log(`[${heroId}] Using OpenRouter for US stock analysis`);
      top5 = await analyzeWithOpenRouter(heroId, US_ANALYSIS_STOCKS, realPrices);
    }
  } catch (error) {
    console.error(`US AI analysis failed for ${heroId}:`, error);
  }

  // 3. AI 분석 실패 시 에러 반환
  if (!top5 || top5.length === 0) {
    console.error(`[${heroId}] US AI analysis returned no stocks.`);
    return NextResponse.json(
      { error: `AI analysis failed to generate US stock recommendations for ${heroId}` },
      { status: 500 }
    );
  }

  // 4. 실시간 가격 병합 및 목표가 계산
  const stocksWithPrices = top5.map((stock, idx) => {
    const realPrice = realPrices.get(stock.symbol);
    const currentPrice = realPrice?.price || 0;

    // 목표가 배수 검증
    let multiplier = stock.targetPriceMultiplier || 1.2;
    if (multiplier < 1.05) multiplier = 1.10;
    if (multiplier > 1.50) multiplier = 1.40;

    const targetPrice = currentPrice * multiplier;
    const stockInfo = US_ANALYSIS_STOCKS.find((s) => s.symbol === stock.symbol);

    return {
      rank: stock.rank || idx + 1,
      symbol: stock.symbol,
      name: stockInfo?.name || stock.name,
      currentPrice,
      targetPrice: Number(targetPrice.toFixed(2)),
      expectedReturn: `${((multiplier - 1) * 100).toFixed(1)}%`,
      change: realPrice?.change || 0,
      changePercent: realPrice?.changePercent || 0,
      score: stock.score,
      reason: stock.reason,
      risks: stock.risks || [],
      sector: stockInfo?.sector || 'Unknown',
    };
  });

  // 5. 응답
  const now = new Date();
  return NextResponse.json({
    hero: {
      id: heroId,
      name: profile.name,
      nameKo: profile.nameKo,
      title: profile.title,
      criteria: profile.criteria,
      methodology: profile.methodology,
    },
    market: 'US',
    currency: 'USD',
    date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    isRealTime: realPrices.size > 0,
    isAIGenerated: true,
    stocks: stocksWithPrices,
  });
}

