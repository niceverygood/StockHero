export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { KISMarketDataProvider, fetchMultipleStockPrices } from '@/lib/market-data/kis';
import { KiwoomMarketDataProvider, fetchMultipleKiwoomPrices } from '@/lib/market-data/kiwoom';
import { NaverMarketDataProvider, fetchMultipleNaverPrices } from '@/lib/market-data/naver';

// API 사용 여부 확인
const useKISAPI = !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
const useKiwoomAPI = !!(process.env.KIWOOM_APP_KEY && process.env.KIWOOM_APP_SECRET);

// 데이터 소스 우선순위: KIS -> Kiwoom -> Naver
async function getStockQuote(symbol: string): Promise<{
  source: string;
  data: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
    high52Week?: number;
    low52Week?: number;
    updatedAt: Date;
  };
}> {
  // 1. KIS API 시도
  if (useKISAPI) {
    try {
      const provider = new KISMarketDataProvider();
      const quote = await provider.getQuote(symbol);
      return {
        source: 'kis',
        data: {
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          high52Week: quote.high52Week,
          low52Week: quote.low52Week,
          updatedAt: quote.updatedAt,
        },
      };
    } catch (error) {
      console.warn('KIS API failed, trying Kiwoom:', error);
    }
  }

  // 2. 키움증권 API 시도
  if (useKiwoomAPI) {
    try {
      const provider = new KiwoomMarketDataProvider();
      const quote = await provider.getQuote(symbol);
      return {
        source: 'kiwoom',
        data: {
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          high52Week: quote.high52Week,
          low52Week: quote.low52Week,
          updatedAt: quote.updatedAt,
        },
      };
    } catch (error) {
      console.warn('Kiwoom API failed, falling back to Naver:', error);
    }
  }

  // 3. 네이버 금융 사용 (최종 폴백)
  const provider = new NaverMarketDataProvider();
  const quote = await provider.getQuote(symbol);
  return {
    source: (useKISAPI || useKiwoomAPI) ? 'naver_fallback' : 'naver',
    data: {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      high52Week: quote.high52Week,
      low52Week: quote.low52Week,
      updatedAt: quote.updatedAt,
    },
  };
}

// 여러 종목 조회 (KIS -> Kiwoom -> Naver 폴백)
async function getMultipleStockQuotes(symbols: string[]): Promise<{
  source: string;
  data: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    name: string;
  }>;
}> {
  // 1. KIS API 시도
  if (useKISAPI) {
    try {
      const results = await fetchMultipleStockPrices(symbols);
      const data: Record<string, {
        price: number;
        change: number;
        changePercent: number;
        name: string;
      }> = {};
      
      results.forEach((value, key) => {
        data[key] = value;
      });
      
      if (Object.keys(data).length > 0) {
        return { source: 'kis', data };
      }
    } catch (error) {
      console.warn('KIS API failed for multiple symbols, trying Kiwoom:', error);
    }
  }

  // 2. 키움증권 API 시도
  if (useKiwoomAPI) {
    try {
      const results = await fetchMultipleKiwoomPrices(symbols);
      const data: Record<string, {
        price: number;
        change: number;
        changePercent: number;
        name: string;
      }> = {};
      
      results.forEach((value, key) => {
        data[key] = value;
      });
      
      if (Object.keys(data).length > 0) {
        return { source: 'kiwoom', data };
      }
    } catch (error) {
      console.warn('Kiwoom API failed for multiple symbols, falling back to Naver:', error);
    }
  }

  // 3. 네이버 금융 사용 (최종 폴백)
  const results = await fetchMultipleNaverPrices(symbols);
  const data: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    name: string;
  }> = {};
  
  results.forEach((value, key) => {
    data[key] = value;
  });
  
  return { source: (useKISAPI || useKiwoomAPI) ? 'naver_fallback' : 'naver', data };
}

/**
 * GET /api/stock/price?symbol=005930
 * GET /api/stock/price?symbols=005930,000660,035420
 * 
 * 실시간 주식 가격 조회 API
 * 우선순위: 한국투자증권(KIS) -> 네이버 금융
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const symbolsParam = searchParams.get('symbols');
  
  try {
    // 단일 종목 조회
    if (symbol) {
      const result = await getStockQuote(symbol);
      return NextResponse.json({
        success: true,
        source: result.source,
        data: result.data,
      });
    }
    
    // 여러 종목 조회
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
      
      if (symbols.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No symbols provided' },
          { status: 400 }
        );
      }
      
      const result = await getMultipleStockQuotes(symbols);
      return NextResponse.json({
        success: true,
        source: result.source,
        data: result.data,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'symbol or symbols parameter required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Stock price API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price' },
      { status: 500 }
    );
  }
}



