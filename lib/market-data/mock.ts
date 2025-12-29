import type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';

// Seeded random for reproducibility
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

const MOCK_STOCKS: Record<string, { name: string; sector: string; basePrice: number }> = {
  '005930': { name: '삼성전자', sector: '반도체', basePrice: 72000 },
  '000660': { name: 'SK하이닉스', sector: '반도체', basePrice: 178000 },
  '373220': { name: 'LG에너지솔루션', sector: '2차전지', basePrice: 420000 },
  '207940': { name: '삼성바이오로직스', sector: '바이오', basePrice: 780000 },
  '005380': { name: '현대차', sector: '자동차', basePrice: 215000 },
  '006400': { name: '삼성SDI', sector: '2차전지', basePrice: 380000 },
  '035720': { name: '카카오', sector: 'IT서비스', basePrice: 45000 },
  '035420': { name: 'NAVER', sector: 'IT서비스', basePrice: 195000 },
  '051910': { name: 'LG화학', sector: '화학', basePrice: 420000 },
  '068270': { name: '셀트리온', sector: '바이오', basePrice: 185000 },
  '028260': { name: '삼성물산', sector: '지주', basePrice: 145000 },
  '105560': { name: 'KB금융', sector: '금융', basePrice: 68000 },
  '055550': { name: '신한지주', sector: '금융', basePrice: 48000 },
  '066570': { name: 'LG전자', sector: '가전', basePrice: 98000 },
  '003550': { name: 'LG', sector: '지주', basePrice: 85000 },
  '012330': { name: '현대모비스', sector: '자동차부품', basePrice: 235000 },
  '096770': { name: 'SK이노베이션', sector: '에너지', basePrice: 112000 },
  '034730': { name: 'SK', sector: '지주', basePrice: 165000 },
  '003670': { name: '포스코홀딩스', sector: '철강', basePrice: 385000 },
  '000270': { name: '기아', sector: '자동차', basePrice: 92000 },
};

const NEWS_TEMPLATES = [
  { title: '{name}, 분기 실적 발표 임박... 시장 기대감 고조', sentiment: 'positive' as const },
  { title: '{name}, 신규 사업 확장 계획 발표', sentiment: 'positive' as const },
  { title: '{name}, 글로벌 시장 점유율 확대', sentiment: 'positive' as const },
  { title: '{name}, 외국인 순매수 지속', sentiment: 'positive' as const },
  { title: '{name}, 업황 불확실성에 주가 변동성 확대', sentiment: 'neutral' as const },
  { title: '{name}, 업계 전반 조정 국면 진입', sentiment: 'neutral' as const },
  { title: '{name}, 원자재 가격 상승 영향 주시', sentiment: 'negative' as const },
  { title: '{name}, 경쟁 심화로 마진 압박 우려', sentiment: 'negative' as const },
];

export class MockMarketDataProvider implements MarketDataProvider {
  private dateKey: string;

  constructor() {
    this.dateKey = new Date().toISOString().split('T')[0];
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    const random = seededRandom(`${symbol}-${this.dateKey}`);
    const changePercent = (random() - 0.5) * 6; // -3% to +3%
    const change = Math.round(stock.basePrice * changePercent / 100);
    const price = stock.basePrice + change;

    return {
      symbol,
      name: stock.name,
      price,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.round(random() * 10000000) + 1000000,
      marketCap: price * (Math.round(random() * 100000000) + 50000000),
      high52Week: Math.round(stock.basePrice * 1.3),
      low52Week: Math.round(stock.basePrice * 0.7),
      updatedAt: new Date(),
    };
  }

  async getFinancials(symbol: string): Promise<StockFinancials> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    const random = seededRandom(`${symbol}-financials`);

    return {
      symbol,
      revenue: Math.round(random() * 100000) + 50000, // 억원
      revenueGrowth: (random() - 0.3) * 30, // -9% to +21%
      operatingIncome: Math.round(random() * 20000) + 5000,
      operatingMargin: random() * 20 + 5, // 5% to 25%
      netIncome: Math.round(random() * 15000) + 3000,
      eps: Math.round(random() * 10000) + 2000,
      per: random() * 20 + 8, // 8x to 28x
      pbr: random() * 2 + 0.5, // 0.5x to 2.5x
      roe: random() * 15 + 5, // 5% to 20%
      debtRatio: random() * 100 + 20, // 20% to 120%
      dividendYield: random() * 3 + 0.5, // 0.5% to 3.5%
      fiscalYear: '2024Q3',
    };
  }

  async getNews(symbol: string, limit = 5): Promise<StockNews[]> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    const random = seededRandom(`${symbol}-news-${this.dateKey}`);
    const sources = ['경제뉴스', '증권일보', '한국경제', '매일경제', '서울경제'];
    const news: StockNews[] = [];

    for (let i = 0; i < limit; i++) {
      const template = NEWS_TEMPLATES[Math.floor(random() * NEWS_TEMPLATES.length)];
      const hoursAgo = Math.floor(random() * 48);

      news.push({
        id: `${symbol}-news-${i}`,
        symbol,
        title: template.title.replace('{name}', stock.name),
        summary: `${stock.name}(${symbol})에 대한 시장 동향 및 분석 기사입니다.`,
        source: sources[Math.floor(random() * sources.length)],
        publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        sentiment: template.sentiment,
      });
    }

    return news.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  async getCandidateSymbols(count = 20): Promise<string[]> {
    const symbols = Object.keys(MOCK_STOCKS);
    const random = seededRandom(this.dateKey);
    
    // Shuffle and take count
    const shuffled = [...symbols].sort(() => random() - 0.5);
    return shuffled.slice(0, Math.min(count, symbols.length));
  }
}

// Factory function
export function createMarketDataProvider(): MarketDataProvider {
  return new MockMarketDataProvider();
}






