/**
 * 한국투자증권 Open API 클라이언트
 * https://github.com/koreainvestment/open-trading-api
 * https://apiportal.koreainvestment.com
 */

import type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// 한국 종목명 매핑 (API에서 이름을 못 가져올 경우 사용)
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

// 미국 종목명 매핑
const US_STOCK_NAMES: Record<string, string> = {
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'GOOGL': 'Alphabet (Google)',
  'AMZN': 'Amazon',
  'NVDA': 'NVIDIA',
  'META': 'Meta (Facebook)',
  'TSLA': 'Tesla',
  'TSM': 'TSMC',
  'AVGO': 'Broadcom',
  'AMD': 'AMD',
  'NFLX': 'Netflix',
  'INTC': 'Intel',
  'QCOM': 'Qualcomm',
  'COST': 'Costco',
  'PEP': 'PepsiCo',
  'ADBE': 'Adobe',
  'CSCO': 'Cisco',
  'CRM': 'Salesforce',
  'ORCL': 'Oracle',
  'IBM': 'IBM',
  'JPM': 'JPMorgan Chase',
  'V': 'Visa',
  'MA': 'Mastercard',
  'BAC': 'Bank of America',
  'WMT': 'Walmart',
  'KO': 'Coca-Cola',
  'DIS': 'Disney',
  'NKE': 'Nike',
  'MCD': 'McDonald\'s',
  'BA': 'Boeing',
  'CAT': 'Caterpillar',
  'GS': 'Goldman Sachs',
  'MMM': '3M',
  'JNJ': 'Johnson & Johnson',
  'PFE': 'Pfizer',
  'UNH': 'UnitedHealth',
  'MRK': 'Merck',
  'ABBV': 'AbbVie',
  'LLY': 'Eli Lilly',
  'XOM': 'Exxon Mobil',
  'CVX': 'Chevron',
  'HD': 'Home Depot',
  'LOW': 'Lowe\'s',
  'TGT': 'Target',
  'SBUX': 'Starbucks',
  'COIN': 'Coinbase',
  'PLTR': 'Palantir',
  'SOFI': 'SoFi',
  'RIVN': 'Rivian',
  'LCID': 'Lucid Motors',
};

// 미국 거래소 코드 매핑
const US_EXCHANGE_MAP: Record<string, string> = {
  // 나스닥 (NAS)
  'AAPL': 'NAS', 'MSFT': 'NAS', 'GOOGL': 'NAS', 'AMZN': 'NAS', 'NVDA': 'NAS',
  'META': 'NAS', 'TSLA': 'NAS', 'AVGO': 'NAS', 'AMD': 'NAS', 'NFLX': 'NAS',
  'INTC': 'NAS', 'QCOM': 'NAS', 'COST': 'NAS', 'PEP': 'NAS', 'ADBE': 'NAS',
  'CSCO': 'NAS', 'CRM': 'NAS', 'ORCL': 'NAS', 'COIN': 'NAS', 'PLTR': 'NAS',
  'SOFI': 'NAS', 'RIVN': 'NAS', 'LCID': 'NAS', 'SBUX': 'NAS',
  // 뉴욕증권거래소 (NYS)
  'TSM': 'NYS', 'JPM': 'NYS', 'V': 'NYS', 'MA': 'NYS', 'BAC': 'NYS',
  'WMT': 'NYS', 'KO': 'NYS', 'DIS': 'NYS', 'NKE': 'NYS', 'MCD': 'NYS',
  'BA': 'NYS', 'CAT': 'NYS', 'GS': 'NYS', 'MMM': 'NYS', 'JNJ': 'NYS',
  'PFE': 'NYS', 'UNH': 'NYS', 'MRK': 'NYS', 'ABBV': 'NYS', 'LLY': 'NYS',
  'XOM': 'NYS', 'CVX': 'NYS', 'HD': 'NYS', 'LOW': 'NYS', 'TGT': 'NYS',
  'IBM': 'NYS',
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

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('KIS API credentials not configured');
  }

  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('KIS Token Error:', error);
    throw new Error(`Failed to get KIS access token: ${response.status}`);
  }

  const data = await response.json();
  
  // 토큰 캐시 (만료 1시간 전까지 유효)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
  };

  return data.access_token;
}

/**
 * 주식 현재가 조회 (국내주식시세/주식현재가 시세)
 */
async function fetchStockPrice(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  high52Week: number;
  low52Week: number;
  name: string;
}> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('KIS API credentials not configured');
  }

  const token = await getAccessToken();

  // 주식현재가 시세 API
  const response = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'authorization': `Bearer ${token}`,
        'appkey': appKey,
        'appsecret': appSecret,
        'tr_id': 'FHKST01010100', // 주식현재가 시세
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('KIS Price Error:', error);
    throw new Error(`Failed to fetch stock price: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.rt_cd !== '0') {
    console.error('KIS API Error:', data.msg1);
    throw new Error(`KIS API Error: ${data.msg1}`);
  }

  const output = data.output;
  
  // 종목명: API 응답 > 매핑 테이블 > 종목코드 순서로 시도
  // (빈 문자열도 falsy로 처리되도록 trim 후 체크)
  const apiName = (output.hts_kor_isnm || '').trim() || (output.stck_shrn_iscd || '').trim();
  const stockName = apiName || STOCK_NAMES[symbol] || symbol;
  
  return {
    name: stockName, // 종목명
    price: parseInt(output.stck_prpr) || 0, // 현재가
    change: parseInt(output.prdy_vrss) || 0, // 전일대비
    changePercent: parseFloat(output.prdy_ctrt) || 0, // 전일대비율
    volume: parseInt(output.acml_vol) || 0, // 누적거래량
    high: parseInt(output.stck_hgpr) || 0, // 최고가
    low: parseInt(output.stck_lwpr) || 0, // 최저가
    open: parseInt(output.stck_oprc) || 0, // 시가
    high52Week: parseInt(output.w52_hgpr) || 0, // 52주최고가
    low52Week: parseInt(output.w52_lwpr) || 0, // 52주최저가
  };
}

/**
 * 미국주식 현재가 조회 (해외주식현재가/해외주식 현재가상세)
 */
export async function fetchUSStockPrice(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  name: string;
  exchange: string;
}> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('KIS API credentials not configured');
  }

  const token = await getAccessToken();
  
  // 거래소 코드 결정 (기본값: 나스닥)
  const exchange = US_EXCHANGE_MAP[symbol.toUpperCase()] || 'NAS';
  const upperSymbol = symbol.toUpperCase();

  // 해외주식 현재가 API
  const response = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${upperSymbol}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'authorization': `Bearer ${token}`,
        'appkey': appKey,
        'appsecret': appSecret,
        'tr_id': 'HHDFS00000300', // 해외주식 현재가
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('KIS US Stock Price Error:', error);
    throw new Error(`Failed to fetch US stock price: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.rt_cd !== '0') {
    console.error('KIS US Stock API Error:', data.msg1);
    throw new Error(`KIS API Error: ${data.msg1}`);
  }

  const output = data.output;
  
  return {
    name: US_STOCK_NAMES[upperSymbol] || output.rsym || upperSymbol,
    price: parseFloat(output.last) || 0, // 현재가
    change: parseFloat(output.diff) || 0, // 전일대비
    changePercent: parseFloat(output.rate) || 0, // 전일대비율
    volume: parseInt(output.tvol) || 0, // 거래량
    high: parseFloat(output.high) || 0, // 고가
    low: parseFloat(output.low) || 0, // 저가
    open: parseFloat(output.open) || 0, // 시가
    exchange,
  };
}

/**
 * 여러 미국 종목의 현재가를 한번에 조회
 */
export async function fetchMultipleUSStockPrices(symbols: string[]): Promise<Map<string, {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  exchange: string;
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
        const data = await fetchUSStockPrice(symbol);
        results.set(symbol.toUpperCase(), {
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          name: data.name,
          exchange: data.exchange,
        });
      } catch (error) {
        console.error(`Failed to fetch US stock ${symbol}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    // API 호출 제한을 위해 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

/**
 * 종목 기본정보 조회
 */
async function fetchStockInfo(symbol: string): Promise<{
  name: string;
  sector: string;
  marketCap: number;
  per: number;
  pbr: number;
  eps: number;
  dividendYield: number;
}> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('KIS API credentials not configured');
  }

  const token = await getAccessToken();

  // 주식기본조회 API
  const response = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/search-stock-info?PDNO=${symbol}&PRDT_TYPE_CD=300`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'authorization': `Bearer ${token}`,
        'appkey': appKey,
        'appsecret': appSecret,
        'tr_id': 'CTPF1002R', // 주식기본조회
      },
    }
  );

  if (!response.ok) {
    // 기본 정보 조회 실패 시 기본값 반환
    return {
      name: symbol,
      sector: '미분류',
      marketCap: 0,
      per: 0,
      pbr: 0,
      eps: 0,
      dividendYield: 0,
    };
  }

  const data = await response.json();
  const output = data.output || {};

  return {
    name: output.prdt_abrv_name || symbol,
    sector: output.bstp_kor_isnm || '미분류',
    marketCap: parseInt(output.lstg_stqt) || 0,
    per: parseFloat(output.per) || 0,
    pbr: parseFloat(output.pbr) || 0,
    eps: parseFloat(output.eps) || 0,
    dividendYield: parseFloat(output.dvid_rto) || 0,
  };
}

/**
 * KIS Market Data Provider
 */
export class KISMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const priceData = await fetchStockPrice(symbol);
      
      return {
        symbol,
        name: priceData.name || STOCK_NAMES[symbol] || symbol,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        volume: priceData.volume,
        marketCap: 0, // 별도 API 필요
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
      const info = await fetchStockInfo(symbol);
      
      return {
        symbol,
        revenue: 0, // 별도 API 필요
        revenueGrowth: 0,
        operatingIncome: 0,
        operatingMargin: 0,
        netIncome: 0,
        eps: info.eps,
        per: info.per,
        pbr: info.pbr,
        roe: 0,
        debtRatio: 0,
        dividendYield: info.dividendYield,
        fiscalYear: new Date().getFullYear().toString(),
      };
    } catch (error) {
      console.error(`Failed to fetch financials for ${symbol}:`, error);
      // 실패 시 기본값 반환
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
    // KIS API는 뉴스 제공 안함 - 빈 배열 반환
    return [];
  }

  async getCandidateSymbols(count = 20): Promise<string[]> {
    // 기본 종목 리스트 반환
    return [
      '005930', '000660', '373220', '207940', '005380',
      '006400', '035720', '035420', '051910', '068270',
      '028260', '105560', '055550', '066570', '003550',
      '012330', '096770', '034730', '003670', '000270',
    ].slice(0, count);
  }
}

/**
 * 여러 종목의 현재가를 한번에 조회
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, {
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
          name: data.name || STOCK_NAMES[symbol] || symbol,
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
export function createKISMarketDataProvider(): MarketDataProvider {
  return new KISMarketDataProvider();
}

