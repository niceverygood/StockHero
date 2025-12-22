import { NextRequest, NextResponse } from 'next/server';
import { fetchMultipleYahooUSStocks } from '@/lib/market-data/yahoo';

// 섹터별 분석 대상 종목
const SECTOR_STOCKS: Record<string, Array<{ symbol: string; name: string; marketCap: string; per: number; growth: number; dividend?: number }>> = {
  Technology: [
    { symbol: 'AAPL', name: 'Apple', marketCap: 'Large', per: 28, growth: 8, dividend: 0.5 },
    { symbol: 'MSFT', name: 'Microsoft', marketCap: 'Large', per: 35, growth: 15, dividend: 0.8 },
    { symbol: 'GOOGL', name: 'Alphabet', marketCap: 'Large', per: 22, growth: 12 },
    { symbol: 'AMZN', name: 'Amazon', marketCap: 'Large', per: 45, growth: 20 },
    { symbol: 'META', name: 'Meta', marketCap: 'Large', per: 25, growth: 18, dividend: 0.4 },
    { symbol: 'CRM', name: 'Salesforce', marketCap: 'Large', per: 40, growth: 12 },
    { symbol: 'ORCL', name: 'Oracle', marketCap: 'Large', per: 22, growth: 8, dividend: 1.2 },
    { symbol: 'ADBE', name: 'Adobe', marketCap: 'Large', per: 35, growth: 10 },
    { symbol: 'IBM', name: 'IBM', marketCap: 'Large', per: 18, growth: 3, dividend: 4.5 },
    { symbol: 'NOW', name: 'ServiceNow', marketCap: 'Large', per: 65, growth: 22 },
    { symbol: 'SNOW', name: 'Snowflake', marketCap: 'Mid', per: 0, growth: 35 },
    { symbol: 'PANW', name: 'Palo Alto Networks', marketCap: 'Mid', per: 45, growth: 25 },
  ],
  Semiconductor: [
    { symbol: 'NVDA', name: 'NVIDIA', marketCap: 'Large', per: 55, growth: 85 },
    { symbol: 'TSM', name: 'TSMC', marketCap: 'Large', per: 22, growth: 25, dividend: 1.8 },
    { symbol: 'AVGO', name: 'Broadcom', marketCap: 'Large', per: 30, growth: 20, dividend: 2.0 },
    { symbol: 'AMD', name: 'AMD', marketCap: 'Large', per: 40, growth: 30 },
    { symbol: 'INTC', name: 'Intel', marketCap: 'Large', per: 15, growth: -5, dividend: 1.5 },
    { symbol: 'QCOM', name: 'Qualcomm', marketCap: 'Large', per: 18, growth: 8, dividend: 2.1 },
    { symbol: 'MU', name: 'Micron', marketCap: 'Large', per: 25, growth: 40 },
    { symbol: 'AMAT', name: 'Applied Materials', marketCap: 'Large', per: 20, growth: 15, dividend: 0.8 },
    { symbol: 'LRCX', name: 'Lam Research', marketCap: 'Large', per: 22, growth: 12, dividend: 1.0 },
    { symbol: 'ASML', name: 'ASML', marketCap: 'Large', per: 35, growth: 18, dividend: 0.9 },
    { symbol: 'ARM', name: 'ARM Holdings', marketCap: 'Mid', per: 100, growth: 30 },
    { symbol: 'MRVL', name: 'Marvell', marketCap: 'Mid', per: 45, growth: 25 },
  ],
  Finance: [
    { symbol: 'JPM', name: 'JPMorgan', marketCap: 'Large', per: 12, growth: 8, dividend: 2.3 },
    { symbol: 'BAC', name: 'Bank of America', marketCap: 'Large', per: 11, growth: 5, dividend: 2.5 },
    { symbol: 'WFC', name: 'Wells Fargo', marketCap: 'Large', per: 10, growth: 4, dividend: 2.8 },
    { symbol: 'GS', name: 'Goldman Sachs', marketCap: 'Large', per: 14, growth: 10, dividend: 2.2 },
    { symbol: 'MS', name: 'Morgan Stanley', marketCap: 'Large', per: 13, growth: 8, dividend: 3.5 },
    { symbol: 'V', name: 'Visa', marketCap: 'Large', per: 28, growth: 12, dividend: 0.8 },
    { symbol: 'MA', name: 'Mastercard', marketCap: 'Large', per: 35, growth: 14, dividend: 0.6 },
    { symbol: 'AXP', name: 'American Express', marketCap: 'Large', per: 18, growth: 10, dividend: 1.2 },
    { symbol: 'BLK', name: 'BlackRock', marketCap: 'Large', per: 20, growth: 8, dividend: 2.5 },
    { symbol: 'SCHW', name: 'Charles Schwab', marketCap: 'Large', per: 22, growth: 12, dividend: 1.5 },
    { symbol: 'C', name: 'Citigroup', marketCap: 'Large', per: 9, growth: 3, dividend: 3.5 },
    { symbol: 'PYPL', name: 'PayPal', marketCap: 'Mid', per: 15, growth: 8 },
  ],
  Healthcare: [
    { symbol: 'UNH', name: 'UnitedHealth', marketCap: 'Large', per: 20, growth: 12, dividend: 1.4 },
    { symbol: 'LLY', name: 'Eli Lilly', marketCap: 'Large', per: 85, growth: 40 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', marketCap: 'Large', per: 15, growth: 5, dividend: 2.9 },
    { symbol: 'PFE', name: 'Pfizer', marketCap: 'Large', per: 12, growth: -10, dividend: 5.8 },
    { symbol: 'MRK', name: 'Merck', marketCap: 'Large', per: 14, growth: 8, dividend: 2.8 },
    { symbol: 'ABBV', name: 'AbbVie', marketCap: 'Large', per: 18, growth: 6, dividend: 3.5 },
    { symbol: 'TMO', name: 'Thermo Fisher', marketCap: 'Large', per: 30, growth: 10, dividend: 0.3 },
    { symbol: 'ABT', name: 'Abbott Labs', marketCap: 'Large', per: 25, growth: 7, dividend: 1.8 },
    { symbol: 'BMY', name: 'Bristol-Myers', marketCap: 'Large', per: 16, growth: 2, dividend: 4.2 },
    { symbol: 'NVO', name: 'Novo Nordisk', marketCap: 'Large', per: 35, growth: 30, dividend: 1.0 },
    { symbol: 'MRNA', name: 'Moderna', marketCap: 'Mid', per: 0, growth: -30 },
    { symbol: 'ISRG', name: 'Intuitive Surgical', marketCap: 'Large', per: 60, growth: 15 },
  ],
  Consumer: [
    { symbol: 'MCD', name: "McDonald's", marketCap: 'Large', per: 25, growth: 8, dividend: 2.2 },
    { symbol: 'SBUX', name: 'Starbucks', marketCap: 'Large', per: 22, growth: 5, dividend: 2.5 },
    { symbol: 'NKE', name: 'Nike', marketCap: 'Large', per: 28, growth: 7, dividend: 1.3 },
    { symbol: 'COST', name: 'Costco', marketCap: 'Large', per: 50, growth: 10, dividend: 0.6 },
    { symbol: 'WMT', name: 'Walmart', marketCap: 'Large', per: 28, growth: 6, dividend: 1.4 },
    { symbol: 'TGT', name: 'Target', marketCap: 'Large', per: 15, growth: 3, dividend: 3.0 },
    { symbol: 'HD', name: 'Home Depot', marketCap: 'Large', per: 22, growth: 5, dividend: 2.5 },
    { symbol: 'LOW', name: "Lowe's", marketCap: 'Large', per: 18, growth: 4, dividend: 2.0 },
    { symbol: 'PG', name: 'P&G', marketCap: 'Large', per: 25, growth: 4, dividend: 2.4 },
    { symbol: 'KO', name: 'Coca-Cola', marketCap: 'Large', per: 24, growth: 5, dividend: 3.0 },
    { symbol: 'PEP', name: 'PepsiCo', marketCap: 'Large', per: 22, growth: 6, dividend: 2.8 },
    { symbol: 'LULU', name: 'Lululemon', marketCap: 'Mid', per: 25, growth: 15 },
  ],
  Energy: [
    { symbol: 'XOM', name: 'Exxon Mobil', marketCap: 'Large', per: 14, growth: 5, dividend: 3.3 },
    { symbol: 'CVX', name: 'Chevron', marketCap: 'Large', per: 15, growth: 4, dividend: 4.0 },
    { symbol: 'COP', name: 'ConocoPhillips', marketCap: 'Large', per: 12, growth: 6, dividend: 3.0 },
    { symbol: 'SLB', name: 'Schlumberger', marketCap: 'Large', per: 16, growth: 10, dividend: 2.2 },
    { symbol: 'EOG', name: 'EOG Resources', marketCap: 'Large', per: 10, growth: 8, dividend: 2.8 },
    { symbol: 'OXY', name: 'Occidental', marketCap: 'Large', per: 13, growth: 5, dividend: 1.5 },
    { symbol: 'PSX', name: 'Phillips 66', marketCap: 'Large', per: 9, growth: 3, dividend: 3.5 },
    { symbol: 'VLO', name: 'Valero', marketCap: 'Large', per: 7, growth: 2, dividend: 3.2 },
    { symbol: 'HAL', name: 'Halliburton', marketCap: 'Mid', per: 11, growth: 8, dividend: 2.0 },
    { symbol: 'DVN', name: 'Devon Energy', marketCap: 'Mid', per: 8, growth: 10, dividend: 4.5 },
    { symbol: 'NEE', name: 'NextEra Energy', marketCap: 'Large', per: 22, growth: 10, dividend: 2.5 },
    { symbol: 'ENPH', name: 'Enphase Energy', marketCap: 'Mid', per: 25, growth: -15 },
  ],
};

// 섹터 정보
const SECTOR_INFO: Record<string, { name: string; nameKo: string; icon: string; description: string }> = {
  Technology: {
    name: 'Technology',
    nameKo: '테크',
    icon: '💻',
    description: '소프트웨어, 클라우드, 인터넷 서비스',
  },
  Semiconductor: {
    name: 'Semiconductor',
    nameKo: '반도체',
    icon: '🔬',
    description: 'AI 칩, 메모리, 반도체 장비',
  },
  Finance: {
    name: 'Finance',
    nameKo: '금융',
    icon: '🏦',
    description: '은행, 결제, 자산운용',
  },
  Healthcare: {
    name: 'Healthcare',
    nameKo: '헬스케어',
    icon: '🏥',
    description: '제약, 바이오, 의료기기',
  },
  Consumer: {
    name: 'Consumer',
    nameKo: '소비재',
    icon: '🛒',
    description: '유통, 음식료, 의류',
  },
  Energy: {
    name: 'Energy',
    nameKo: '에너지',
    icon: '⚡',
    description: '석유, 가스, 신재생에너지',
  },
};

// OpenRouter 모델
const OPENROUTER_MODEL = 'anthropic/claude-opus-4.5';

async function analyzeSectorWithAI(
  sector: string,
  stocks: Array<{ symbol: string; name: string; marketCap: string; per: number; growth: number; dividend?: number }>,
  realPrices: Map<string, any>
): Promise<any[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[Sector AI] No API key configured');
    return [];
  }

  const sectorInfo = SECTOR_INFO[sector];
  const stockList = stocks
    .map((s) => {
      const realPrice = realPrices.get(s.symbol);
      return `- ${s.name} (${s.symbol}): $${realPrice?.price?.toFixed(2) || 'N/A'}, 등락: ${realPrice?.changePercent?.toFixed(2) || 0}%, PER: ${s.per}, 성장률: ${s.growth}%, 배당: ${s.dividend || 0}%, 시총: ${s.marketCap}`;
    })
    .join('\n');

  const systemPrompt = `You are a sector specialist AI analyst focusing on ${sectorInfo.nameKo}(${sector}) stocks.
Analyze the given stocks considering:
1. Sector-specific trends and catalysts
2. Competitive positioning within the sector
3. Valuation relative to sector peers
4. Growth potential and risk factors

Respond ONLY in JSON format in Korean.`;

  const userPrompt = `아래 ${sectorInfo.nameKo} 섹터 종목들을 분석하고 Top 5를 선정해주세요.

## 분석 대상 종목
${stockList}

## 분석 시 고려사항
- 섹터 내 경쟁 포지션
- 성장성과 밸류에이션 균형
- 섹터 특수 리스크 및 기회
- 배당 수익률 (해당 시)

## 응답 형식 (JSON만 응답)
{
  "sectorAnalysis": "현재 ${sectorInfo.nameKo} 섹터의 전반적인 투자 전망을 2-3문장으로",
  "top5": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Company Name",
      "score": 4.5,
      "targetPriceMultiplier": 1.25,
      "reason": "섹터 내 포지션, 성장성, 밸류에이션을 포함한 구체적 분석 3-4문장",
      "highlights": ["핵심 투자포인트1", "핵심 투자포인트2"],
      "risks": ["리스크1", "리스크2"]
    }
  ]
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
        'X-Title': `StockHero ${sector} Sector Analysis`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Sector AI] API error: ${response.status}`, error);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // JSON 추출 및 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\u0000-\u001F]+/g, '');

      const parsed = JSON.parse(jsonStr);
      return {
        sectorAnalysis: parsed.sectorAnalysis || '',
        top5: parsed.top5 || [],
      };
    }
  } catch (error) {
    console.error('[Sector AI] Analysis error:', error);
  }

  return { sectorAnalysis: '', top5: [] };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
) {
  const { sector } = await params;

  // 섹터 검증
  if (!SECTOR_STOCKS[sector]) {
    return NextResponse.json(
      { error: `Invalid sector: ${sector}. Available: ${Object.keys(SECTOR_STOCKS).join(', ')}` },
      { status: 400 }
    );
  }

  const sectorInfo = SECTOR_INFO[sector];
  const stocks = SECTOR_STOCKS[sector];

  // 1. 실시간 가격 조회
  const symbols = stocks.map((s) => s.symbol);
  let realPrices: Map<string, any> = new Map();

  try {
    realPrices = await fetchMultipleYahooUSStocks(symbols);
    console.log(`[Sector ${sector}] Fetched ${realPrices.size} stock prices`);
  } catch (error) {
    console.error(`[Sector ${sector}] Failed to fetch prices:`, error);
  }

  // 2. AI 분석
  let analysisResult: any = { sectorAnalysis: '', top5: [] };

  try {
    analysisResult = await analyzeSectorWithAI(sector, stocks, realPrices);
    console.log(`[Sector ${sector}] AI analysis completed: ${analysisResult.top5?.length || 0} stocks`);
  } catch (error) {
    console.error(`[Sector ${sector}] AI analysis failed:`, error);
  }

  // 3. AI 분석 실패 시 에러
  if (!analysisResult.top5 || analysisResult.top5.length === 0) {
    return NextResponse.json(
      { error: `AI analysis failed for ${sector} sector` },
      { status: 500 }
    );
  }

  // 4. 실시간 가격 병합
  const stocksWithPrices = analysisResult.top5.map((stock: any, idx: number) => {
    const realPrice = realPrices.get(stock.symbol);
    const currentPrice = realPrice?.price || 0;

    let multiplier = stock.targetPriceMultiplier || 1.2;
    if (multiplier < 1.05) multiplier = 1.10;
    if (multiplier > 1.50) multiplier = 1.40;

    const targetPrice = currentPrice * multiplier;
    const stockInfo = stocks.find((s) => s.symbol === stock.symbol);

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
      highlights: stock.highlights || [],
      risks: stock.risks || [],
      dividend: stockInfo?.dividend,
    };
  });

  // 5. 응답
  const now = new Date();
  return NextResponse.json({
    sector: {
      id: sector,
      name: sectorInfo.name,
      nameKo: sectorInfo.nameKo,
      icon: sectorInfo.icon,
      description: sectorInfo.description,
    },
    sectorAnalysis: analysisResult.sectorAnalysis,
    date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    isRealTime: realPrices.size > 0,
    isAIGenerated: true,
    stocks: stocksWithPrices,
  });
}



