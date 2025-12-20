import { NextRequest, NextResponse } from 'next/server';
import { fetchUSStockPrice, fetchMultipleUSStockPrices } from '@/lib/market-data/kis';
import { fetchYahooUSStockPrice, fetchMultipleYahooUSStocks } from '@/lib/market-data/yahoo';

// KIS API 사용 가능 여부
const useKISAPI = !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);

// 인기 미국주식 목록
const POPULAR_US_STOCKS = [
  // 빅테크
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductor' },
  { symbol: 'META', name: 'Meta', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'EV/Auto' },
  // 반도체
  { symbol: 'TSM', name: 'TSMC', sector: 'Semiconductor' },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Semiconductor' },
  { symbol: 'AMD', name: 'AMD', sector: 'Semiconductor' },
  { symbol: 'INTC', name: 'Intel', sector: 'Semiconductor' },
  { symbol: 'QCOM', name: 'Qualcomm', sector: 'Semiconductor' },
  // 금융
  { symbol: 'JPM', name: 'JPMorgan', sector: 'Finance' },
  { symbol: 'V', name: 'Visa', sector: 'Finance' },
  { symbol: 'MA', name: 'Mastercard', sector: 'Finance' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  // 소비재
  { symbol: 'WMT', name: 'Walmart', sector: 'Retail' },
  { symbol: 'COST', name: 'Costco', sector: 'Retail' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo', sector: 'Consumer' },
  { symbol: 'MCD', name: "McDonald's", sector: 'Consumer' },
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer' },
  { symbol: 'SBUX', name: 'Starbucks', sector: 'Consumer' },
  // 헬스케어
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
  { symbol: 'MRK', name: 'Merck', sector: 'Healthcare' },
  // 에너지
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron', sector: 'Energy' },
  // 엔터테인먼트
  { symbol: 'DIS', name: 'Disney', sector: 'Entertainment' },
  { symbol: 'NFLX', name: 'Netflix', sector: 'Entertainment' },
  // 신흥 성장주
  { symbol: 'COIN', name: 'Coinbase', sector: 'Crypto' },
  { symbol: 'PLTR', name: 'Palantir', sector: 'AI/Data' },
  { symbol: 'SOFI', name: 'SoFi', sector: 'Fintech' },
  { symbol: 'RIVN', name: 'Rivian', sector: 'EV' },
];

/**
 * GET /api/stock/us?symbol=AAPL
 * GET /api/stock/us?symbols=AAPL,MSFT,NVDA
 * GET /api/stock/us/list - 인기 종목 목록
 * 
 * 미국주식 실시간 가격 조회 API (한국투자증권 API 사용)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const symbolsParam = searchParams.get('symbols');
  const listType = searchParams.get('list');

  try {
    // 인기 종목 목록 반환
    if (listType === 'popular') {
      return NextResponse.json({
        success: true,
        data: POPULAR_US_STOCKS,
      });
    }

    // 단일 종목 조회
    if (symbol) {
      let data;
      let source = 'yahoo';
      
      // KIS API 먼저 시도
      if (useKISAPI) {
        try {
          data = await fetchUSStockPrice(symbol);
          source = 'kis';
        } catch (kisError) {
          console.warn('KIS US Stock API failed, falling back to Yahoo:', kisError);
        }
      }
      
      // KIS 실패 시 Yahoo Finance 사용
      if (!data) {
        const yahooData = await fetchYahooUSStockPrice(symbol);
        data = {
          name: yahooData.name,
          price: yahooData.price,
          change: yahooData.change,
          changePercent: yahooData.changePercent,
          volume: yahooData.volume,
          high: yahooData.high,
          low: yahooData.low,
          open: yahooData.open,
          exchange: 'US',
        };
      }
      
      return NextResponse.json({
        success: true,
        source,
        data: {
          symbol: symbol.toUpperCase(),
          name: data.name,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          high: data.high,
          low: data.low,
          open: data.open,
          exchange: data.exchange,
          currency: 'USD',
          updatedAt: new Date().toISOString(),
        },
      });
    }

    // 여러 종목 조회
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      
      if (symbols.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No symbols provided' },
          { status: 400 }
        );
      }

      let results: Map<string, any>;
      let source = 'yahoo';
      
      // KIS API 먼저 시도
      if (useKISAPI) {
        try {
          results = await fetchMultipleUSStockPrices(symbols);
          if (results.size > 0) {
            source = 'kis';
          }
        } catch (kisError) {
          console.warn('KIS US Stock API failed for multiple, falling back to Yahoo:', kisError);
          results = new Map();
        }
      } else {
        results = new Map();
      }
      
      // KIS 실패 시 Yahoo Finance 사용
      if (results.size === 0) {
        const yahooResults = await fetchMultipleYahooUSStocks(symbols);
        yahooResults.forEach((value, key) => {
          results.set(key, {
            price: value.price,
            change: value.change,
            changePercent: value.changePercent,
            name: value.name,
            exchange: 'US',
          });
        });
      }
      
      const data: Record<string, any> = {};
      results.forEach((value, key) => {
        data[key] = {
          ...value,
          currency: 'USD',
        };
      });

      return NextResponse.json({
        success: true,
        source,
        data,
      });
    }

    return NextResponse.json(
      { success: false, error: 'symbol, symbols, or list parameter required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('US Stock API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch US stock price'
      },
      { status: 500 }
    );
  }
}

