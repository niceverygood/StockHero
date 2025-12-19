import { NextRequest, NextResponse } from 'next/server';
import { KISMarketDataProvider, fetchMultipleStockPrices } from '@/lib/market-data/kis';
import { NaverMarketDataProvider, fetchMultipleNaverPrices } from '@/lib/market-data/naver';

// KIS API 사용 여부 확인
const useKISAPI = !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);

/**
 * GET /api/stock/price?symbol=005930
 * GET /api/stock/price?symbols=005930,000660,035420
 * 
 * 실시간 주식 가격 조회 API
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const symbolsParam = searchParams.get('symbols');
  
  try {
    // 단일 종목 조회
    if (symbol) {
      if (useKISAPI) {
        const provider = new KISMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        
        return NextResponse.json({
          success: true,
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
        });
      } else {
        // 네이버 금융 사용 (실시간)
        const provider = new NaverMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        
        return NextResponse.json({
          success: true,
          source: 'naver',
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
        });
      }
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
      
      if (useKISAPI) {
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
        
        return NextResponse.json({
          success: true,
          source: 'kis',
          data,
        });
      } else {
        // 네이버 금융 사용 (실시간)
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
        
        return NextResponse.json({
          success: true,
          source: 'naver',
          data,
        });
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'symbol or symbols parameter required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Stock price API error:', error);
    
    // API 실패 시 네이버로 폴백
    if (symbol) {
      try {
        const provider = new NaverMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        
        return NextResponse.json({
          success: true,
          source: 'naver_fallback',
          data: {
            symbol: quote.symbol,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            updatedAt: quote.updatedAt,
          },
        });
      } catch {
        // 네이버도 실패
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price' },
      { status: 500 }
    );
  }
}



