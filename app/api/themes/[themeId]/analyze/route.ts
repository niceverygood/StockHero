export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { HOT_THEMES, HotTheme, ThemeStock } from '@/lib/data/hot-themes';
import { fetchMultipleYahooUSStocks } from '@/lib/market-data/yahoo';

// OpenRouter 모델 매핑 (2026년 1월 - 실제 존재하는 모델)
const OPENROUTER_MODELS: Record<string, string> = {
  claude: 'anthropic/claude-sonnet-4',
  gemini: 'google/gemini-2.5-pro-preview',
  gpt: 'openai/gpt-4o',
};

// AI 캐릭터 프로필
const CHARACTER_PROFILES: Record<string, { name: string; systemPrompt: string; icon: string; color: string }> = {
  claude: {
    name: 'Claude Lee',
    icon: '🎯',
    color: 'text-orange-400',
    systemPrompt: `당신은 'Claude Lee'라는 이름의 전문 주식 애널리스트입니다.
성격: 침착하고 분석적이며 디테일에 강합니다.
전문 분야: 실적, 재무구조, 산업 구조 분석
분석 스타일: 숫자와 데이터 기반의 꼼꼼한 분석, 리스크 요인을 먼저 체크합니다.
말투: 전문적이고 신중하며, 객관적 데이터를 중시합니다.`,
  },
  gemini: {
    name: 'Gemi Nine',
    icon: '✨',
    color: 'text-blue-400',
    systemPrompt: `당신은 'Gemi Nine'이라는 이름의 트렌드 전문 애널리스트입니다.
성격: 세련되고 센스있으며 빠른 판단력을 가졌습니다.
전문 분야: 신성장 산업, 기술주, 혁신 섹터 분석
분석 스타일: 미래 성장 가능성과 트렌드를 중시하며, 테마와 모멘텀을 잘 잡아냅니다.
말투: 자신감있고 트렌디하며, 미래 비전을 강조합니다.`,
  },
  gpt: {
    name: 'G.P. Taylor',
    icon: '📊',
    color: 'text-green-400',
    systemPrompt: `당신은 'G.P. Taylor'라는 이름의 거시경제 전문 애널리스트입니다.
성격: 중후하고 느긋하며 깊은 통찰력을 가졌습니다.
전문 분야: 거시경제, 금리, 위험요인 분석
분석 스타일: 큰 그림을 보며 매크로 환경과 리스크를 종합적으로 분석합니다.
말투: 원로다운 무게감이 있으며, 경험에서 우러나온 통찰을 제공합니다.`,
  },
};

// 미국 주식 실시간 가격 조회
async function fetchUSStockPrices(symbols: string[]): Promise<Map<string, any>> {
  const priceMap = new Map<string, any>();
  
  try {
    const results = await fetchMultipleYahooUSStocks(symbols);
    results.forEach((result, symbol) => {
      if (result) {
        priceMap.set(symbol, {
          price: result.price,
          changePercent: result.changePercent,
          volume: result.volume,
        });
      }
    });
  } catch (error) {
    console.error('[Theme Analysis] Error fetching US prices:', error);
  }
  
  return priceMap;
}

// 한국 주식 가격 조회 (mock - 실제로는 API 연동 필요)
async function fetchKRStockPrices(symbols: string[]): Promise<Map<string, any>> {
  const priceMap = new Map<string, any>();
  
  // 실제 API 연동 시 교체 필요
  symbols.forEach(symbol => {
    priceMap.set(symbol, {
      price: Math.floor(Math.random() * 100000) + 10000,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 1000000),
    });
  });
  
  return priceMap;
}

// AI 분석 수행
async function analyzeThemeWithAI(
  theme: HotTheme,
  heroId: string,
  stockPrices: Map<string, any>
): Promise<{
  krPicks: any[];
  usPicks: any[];
  themeAnalysis: string;
  outlook: string;
}> {
  const profile = CHARACTER_PROFILES[heroId];
  const model = OPENROUTER_MODELS[heroId];
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || !model || !profile) {
    console.error('[Theme Analysis] Missing config');
    return { krPicks: [], usPicks: [], themeAnalysis: '', outlook: '' };
  }

  // 주식 리스트 생성
  const krStocks = theme.stocks.filter(s => s.market === 'KR');
  const usStocks = theme.stocks.filter(s => s.market === 'US');

  const formatStockList = (stocks: ThemeStock[], market: 'KR' | 'US') => {
    return stocks.map(s => {
      const price = stockPrices.get(s.symbol);
      const currency = market === 'KR' ? '원' : 'USD';
      return `- ${s.name}(${s.symbol}): 현재가 ${price?.price?.toLocaleString() || 'N/A'} ${currency}, 등락 ${price?.changePercent?.toFixed(2) || 0}%, PER ${s.per || 'N/A'}, PBR ${s.pbr || 'N/A'}, ROE ${s.roe || 'N/A'}%, 성장률 ${s.growth || 'N/A'}%`;
    }).join('\n');
  };

  const prompt = `## 테마: ${theme.name} (${theme.nameEn})
${theme.description}

당신은 이 테마의 전문가로서 국내와 해외 주식을 각각 분석해주세요.

## 한국 주식 후보
${formatStockList(krStocks, 'KR')}

## 미국 주식 후보
${formatStockList(usStocks, 'US')}

## 분석 요청
1. 이 테마의 현재 상황과 전망을 2-3문장으로 요약
2. 한국 주식 Top 3 선정 (이유와 목표 수익률 포함)
3. 미국 주식 Top 3 선정 (이유와 목표 수익률 포함)
4. 이 테마에 투자할 때 주의할 점

## 응답 형식 (JSON만 응답)
{
  "themeAnalysis": "테마 현황 분석 2-3문장",
  "outlook": "bullish/neutral/bearish 중 하나와 이유",
  "krPicks": [
    {
      "rank": 1,
      "symbol": "종목코드",
      "name": "종목명",
      "score": 4.5,
      "targetReturn": 25,
      "reason": "선정 이유 2-3문장",
      "catalysts": ["촉매제1", "촉매제2"],
      "risks": ["리스크1", "리스크2"]
    }
  ],
  "usPicks": [
    {
      "rank": 1,
      "symbol": "TICKER",
      "name": "Company Name",
      "score": 4.5,
      "targetReturn": 30,
      "reason": "선정 이유 2-3문장",
      "catalysts": ["촉매제1", "촉매제2"],
      "risks": ["리스크1", "리스크2"]
    }
  ]
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
        'X-Title': 'StockHero Theme Analysis',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: profile.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Theme Analysis] API error: ${response.status}`, error);
      return { krPicks: [], usPicks: [], themeAnalysis: '', outlook: '' };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      let cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      cleanedJson = cleanedJson.replace(/,\s*([\]}])/g, '$1');
      
      const result = JSON.parse(cleanedJson);
      
      // 현재가 정보 추가
      const addCurrentPrice = (picks: any[], market: 'KR' | 'US') => {
        return picks.map((pick: any) => {
          const price = stockPrices.get(pick.symbol);
          return {
            ...pick,
            currentPrice: price?.price || 0,
            changePercent: price?.changePercent || 0,
            market,
          };
        });
      };

      return {
        krPicks: addCurrentPrice(result.krPicks || [], 'KR'),
        usPicks: addCurrentPrice(result.usPicks || [], 'US'),
        themeAnalysis: result.themeAnalysis || '',
        outlook: result.outlook || '',
      };
    }
  } catch (error) {
    console.error('[Theme Analysis] Error:', error);
  }

  return { krPicks: [], usPicks: [], themeAnalysis: '', outlook: '' };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  const { themeId } = await params;
  
  // 테마 찾기
  const theme = HOT_THEMES.find(t => t.id === themeId);
  if (!theme) {
    return NextResponse.json(
      { error: 'Theme not found' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const heroId = searchParams.get('hero') || 'claude';

  // 주식 가격 조회
  const krSymbols = theme.stocks.filter(s => s.market === 'KR').map(s => s.symbol);
  const usSymbols = theme.stocks.filter(s => s.market === 'US').map(s => s.symbol);

  const [krPrices, usPrices] = await Promise.all([
    fetchKRStockPrices(krSymbols),
    fetchUSStockPrices(usSymbols),
  ]);

  // 가격 맵 병합
  const allPrices = new Map<string, any>();
  krPrices.forEach((value, key) => allPrices.set(key, value));
  usPrices.forEach((value, key) => allPrices.set(key, value));

  // AI 분석 수행
  const analysis = await analyzeThemeWithAI(theme, heroId, allPrices);

  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return NextResponse.json({
    theme: {
      id: theme.id,
      name: theme.name,
      nameEn: theme.nameEn,
      icon: theme.icon,
      color: theme.color,
      bgColor: theme.bgColor,
      description: theme.description,
      trend: theme.trend,
    },
    hero: {
      id: heroId,
      name: CHARACTER_PROFILES[heroId]?.name,
      icon: CHARACTER_PROFILES[heroId]?.icon,
      color: CHARACTER_PROFILES[heroId]?.color,
    },
    analysis: {
      themeAnalysis: analysis.themeAnalysis,
      outlook: analysis.outlook,
      krPicks: analysis.krPicks,
      usPicks: analysis.usPicks,
    },
    date: kstDate.toISOString().split('T')[0],
    time: kstDate.toISOString().split('T')[1].substring(0, 5),
  });
}



