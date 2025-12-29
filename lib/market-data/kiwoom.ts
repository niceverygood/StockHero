/**
 * 키움증권 REST API를 통한 주식 시세 조회
 * https://openapi.kiwoom.com
 * 2025년 3월 출시
 */

import type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';

const KIWOOM_BASE_URL = 'https://openapi.kiwoom.com:8443';

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
};

// 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Access Token 발급
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const appKey = process.env.KIWOOM_APP_KEY;
  const appSecret = process.env.KIWOOM_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('Kiwoom API credentials not configured');
  }

  const response = await fetch(`${KIWOOM_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecretkey: appSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Kiwoom Token Error:', error);
    throw new Error(`Failed to get Kiwoom access token: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  // 토큰 캐시 (만료 1시간 전까지 유효)
  const expiresIn = data.expires_in || 86400; // 기본 24시간
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 3600) * 1000,
  };

  return data.access_token;
}

/**
 * 주식 현재가 조회
 */
async function fetchStockPrice(symbol: string): Promise<{
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
}> {
  const appKey = process.env.KIWOOM_APP_KEY;

  if (!appKey) {
    throw new Error('Kiwoom API credentials not configured');
  }

  const token = await getAccessToken();

  // 주식현재가 시세 API
  const response = await fetch(
    `${KIWOOM_BASE_URL}/api/dostk/stkprice?stk_code=${symbol}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
        'appkey': appKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Kiwoom Price Error:', error);
    throw new Error(`Failed to fetch stock price: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.return_code !== '0' && data.return_code !== 0) {
    console.error('Kiwoom API Error:', data.return_msg);
    throw new Error(`Kiwoom API Error: ${data.return_msg}`);
  }

  const output = data.output || data;
  
  return {
    name: output.stk_nm || STOCK_NAMES[symbol] || symbol,
    price: parseInt(output.cur_prc || output.stck_prpr) || 0,
    change: parseInt(output.prdy_vrss) || 0,
    changePercent: parseFloat(output.prdy_ctrt) || 0,
    volume: parseInt(output.acml_vol) || 0,
    high52Week: parseInt(output.w52_hgpr) || 0,
    low52Week: parseInt(output.w52_lwpr) || 0,
  };
}

/**
 * Kiwoom Market Data Provider
 */
export class KiwoomMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const priceData = await fetchStockPrice(symbol);
      
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
    // 키움 API에서 재무정보는 별도 API 필요
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

  async getNews(symbol: string, limit = 5): Promise<StockNews[]> {
    return [];
  }

  async getCandidateSymbols(count = 20): Promise<string[]> {
    return Object.keys(STOCK_NAMES).slice(0, count);
  }
}

/**
 * 여러 종목의 현재가를 한번에 조회
 */
export async function fetchMultipleKiwoomPrices(symbols: string[]): Promise<Map<string, {
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
        const data = await fetchStockPrice(symbol);
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
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Factory function
export function createKiwoomMarketDataProvider(): MarketDataProvider {
  return new KiwoomMarketDataProvider();
}




