import { NextRequest, NextResponse } from 'next/server';
import { KISMarketDataProvider, fetchMultipleStockPrices } from '@/lib/market-data/kis';
import { MockMarketDataProvider } from '@/lib/market-data/mock';

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
        // Mock 데이터 사용
        const provider = new MockMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        
        return NextResponse.json({
          success: true,
          source: 'mock',
          data: quote,
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
        // Mock 데이터 사용
        const provider = new MockMarketDataProvider();
        const data: Record<string, {
          price: number;
          change: number;
          changePercent: number;
          name: string;
        }> = {};
        
        for (const sym of symbols) {
          try {
            const quote = await provider.getQuote(sym);
            data[sym] = {
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              name: quote.name,
            };
          } catch {
            // 개별 종목 실패 시 스킵
          }
        }
        
        return NextResponse.json({
          success: true,
          source: 'mock',
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
    
    // KIS API 실패 시 Mock으로 폴백
    if (useKISAPI && symbol) {
      try {
        const provider = new MockMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        
        return NextResponse.json({
          success: true,
          source: 'mock_fallback',
          data: quote,
        });
      } catch {
        // Mock도 실패
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price' },
      { status: 500 }
    );
  }
}

