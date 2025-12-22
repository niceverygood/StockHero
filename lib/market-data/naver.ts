/**
 * 네이버 금융 API를 통한 주식 시세 조회
 * 무료, 실시간 데이터 제공
 */

import type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';

// 종목명 매핑 (백업용)
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
  '068270': '셀트리온',
  '028260': '삼성물산',
  '105560': 'KB금융',
  '055550': '신한지주',
  '066570': 'LG전자',
  '003550': 'LG',
  '012330': '현대모비스',
  '096770': 'SK이노베이션',
  '034730': 'SK',
  '003670': '포스코홀딩스',
  '000270': '기아',
  '017670': 'SK텔레콤',
  '030200': 'KT',
  '032830': '삼성생명',
  '247540': '에코프로비엠',
};

interface NaverStockData {
  stockName: string;
  closePrice: string;
  compareToPreviousClosePrice: string;
  fluctuationsRatio: string;
  accumulatedTradingVolume: string;
  marketValue?: string;
  high52wPrice?: string;
  low52wPrice?: string;
}

/**
 * 네이버 금융에서 주식 현재가 조회
 */
async function fetchNaverStockPrice(symbol: string): Promise<{
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
}> {
  try {
    // 네이버 금융 API (비공식)
    const response = await fetch(
      `https://m.stock.naver.com/api/stock/${symbol}/basic`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 }, // 1분 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`Naver API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 가격 파싱 (쉼표 제거)
    const parsePrice = (str: string | undefined): number => {
      if (!str) return 0;
      return parseInt(str.replace(/,/g, '')) || 0;
    };

    const parsePercent = (str: string | undefined): number => {
      if (!str) return 0;
      return parseFloat(str.replace(/[+%]/g, '')) || 0;
    };

    return {
      name: data.stockName || STOCK_NAMES[symbol] || symbol,
      price: parsePrice(data.closePrice),
      change: parsePrice(data.compareToPreviousClosePrice),
      changePercent: parsePercent(data.fluctuationsRatio),
      volume: parsePrice(data.accumulatedTradingVolume),
      high52Week: parsePrice(data.high52wPrice),
      low52Week: parsePrice(data.low52wPrice),
    };
  } catch (error) {
    console.error(`Failed to fetch Naver stock data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 네이버 금융에서 주식 상세 정보 조회
 */
async function fetchNaverStockDetail(symbol: string): Promise<{
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  dividendYield: number;
  marketCap: number;
}> {
  try {
    const response = await fetch(
      `https://m.stock.naver.com/api/stock/${symbol}/integration`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 300 }, // 5분 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`Naver API error: ${response.status}`);
    }

    const data = await response.json();
    const totalInfos = data.totalInfos || [];

    // 정보 파싱 함수
    const findValue = (key: string): string => {
      const item = totalInfos.find((info: any) => info.key === key);
      return item?.value || '0';
    };

    const parseNumber = (str: string): number => {
      if (!str || str === '-') return 0;
      // 쉼표, 배, 원, % 등 제거
      const cleaned = str.replace(/[,배원%조억만]/g, '').trim();
      return parseFloat(cleaned) || 0;
    };

    return {
      per: parseNumber(findValue('PER')),
      pbr: parseNumber(findValue('PBR')),
      eps: parseNumber(findValue('EPS')),
      bps: parseNumber(findValue('BPS')),
      dividendYield: parseNumber(findValue('배당수익률')),
      marketCap: parseNumber(findValue('시가총액')) * 100000000, // 억 -> 원
    };
  } catch (error) {
    console.error(`Failed to fetch Naver stock detail for ${symbol}:`, error);
    return {
      per: 0,
      pbr: 0,
      eps: 0,
      bps: 0,
      dividendYield: 0,
      marketCap: 0,
    };
  }
}

/**
 * Naver Finance Market Data Provider
 */
export class NaverMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const priceData = await fetchNaverStockPrice(symbol);
      
      return {
        symbol,
        name: priceData.name,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        volume: priceData.volume,
        marketCap: 0,
        high52Week: priceData.high52Week,
        low52Week: priceData.low52Week,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getFinancials(symbol: string): Promise<StockFinancials> {
    try {
      const detail = await fetchNaverStockDetail(symbol);
      
      return {
        symbol,
        revenue: 0,
        revenueGrowth: 0,
        operatingIncome: 0,
        operatingMargin: 0,
        netIncome: 0,
        eps: detail.eps,
        per: detail.per,
        pbr: detail.pbr,
        roe: 0,
        debtRatio: 0,
        dividendYield: detail.dividendYield,
        fiscalYear: new Date().getFullYear().toString(),
      };
    } catch (error) {
      console.error(`Failed to fetch financials for ${symbol}:`, error);
      return {
        symbol,
        revenue: 0,
        revenueGrowth: 0,
        operatingIncome: 0,
        operatingMargin: 0,
        netIncome: 0,
        eps: 0,
        per: 0,
        pbr: 0,
        roe: 0,
        debtRatio: 0,
        dividendYield: 0,
        fiscalYear: new Date().getFullYear().toString(),
      };
    }
  }

  async getNews(symbol: string, limit = 5): Promise<StockNews[]> {
    // 네이버 뉴스 API는 별도 구현 필요
    return [];
  }

  async getCandidateSymbols(count = 20): Promise<string[]> {
    return Object.keys(STOCK_NAMES).slice(0, count);
  }
}

/**
 * 여러 종목의 현재가를 한번에 조회
 */
export async function fetchMultipleNaverPrices(symbols: string[]): Promise<Map<string, {
  price: number;
  change: number;
  changePercent: number;
  name: string;
}>> {
  const results = new Map();
  
  // 병렬로 조회 (최대 5개씩)
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 5) {
    chunks.push(symbols.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (symbol) => {
      try {
        const data = await fetchNaverStockPrice(symbol);
        results.set(symbol, {
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          name: data.name,
        });
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    // API 호출 제한을 위해 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Factory function
export function createNaverMarketDataProvider(): MarketDataProvider {
  return new NaverMarketDataProvider();
}



