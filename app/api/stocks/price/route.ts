import { NextRequest, NextResponse } from 'next/server';
import { getNaverStockPrice, getStockInfoByCode } from '@/lib/external/stock-search';
import { findStockBySymbol } from '@/lib/data/krx-stocks';

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// KIS 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

// 주가 캐시 (1분)
const priceCache = new Map<string, { data: any; timestamp: number }>();
const PRICE_CACHE_TTL = 60 * 1000; // 1분

function getCachedPrice(symbol: string) {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPrice(symbol: string, data: any) {
  priceCache.set(symbol, { data, timestamp: Date.now() });
  // 캐시 크기 제한 (최대 100개)
  if (priceCache.size > 100) {
    const firstKey = priceCache.keys().next().value;
    if (firstKey) priceCache.delete(firstKey);
  }
}

async function getKISToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    return null;
  }

  try {
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
    };

    return data.access_token;
  } catch {
    return null;
  }
}

async function fetchKISPrice(symbol: string) {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  const token = await getKISToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'authorization': `Bearer ${token}`,
          'appkey': appKey,
          'appsecret': appSecret,
          'tr_id': 'FHKST01010100',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.rt_cd !== '0') return null;

    const output = data.output;
    return {
      price: parseInt(output.stck_prpr) || 0,
      change: parseInt(output.prdy_vrss) || 0,
      changePercent: parseFloat(output.prdy_ctrt) || 0,
      volume: parseInt(output.acml_vol) || 0,
      high: parseInt(output.stck_hgpr) || 0,
      low: parseInt(output.stck_lwpr) || 0,
      open: parseInt(output.stck_oprc) || 0,
      name: output.hts_kor_isnm || '',
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/stocks/price?symbol=005930
 * 실시간 주가 조회 - 네이버 금융 + KIS API 통합
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol || !/^\d{6}$/.test(symbol)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid symbol. Must be 6 digits.',
    }, { status: 400 });
  }

  try {
    // 캐시 확인
    const cached = getCachedPrice(symbol);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
      });
    }
    
    // 로컬 데이터에서 종목 정보 확인
    const localStock = findStockBySymbol(symbol);

    // 1차: 네이버 금융 시세 조회 (가장 빠름)
    const naverPrice = await getNaverStockPrice(symbol);
    
    if (naverPrice && naverPrice.price > 0) {
      // 시장 코드 변환 (KS -> KOSPI, KQ -> KOSDAQ)
      let market = naverPrice.market;
      if (market === 'KS') market = 'KOSPI';
      else if (market === 'KQ') market = 'KOSDAQ';
      else if (market === 'KN') market = 'KONEX';
      
      const priceData = {
        symbol,
        name: naverPrice.name || localStock?.name || symbol,
        market: market || localStock?.market || 'KOSPI',
        sector: localStock?.sector || '미분류',
        price: naverPrice.price,
        change: naverPrice.change,
        changePercent: naverPrice.changePercent,
        volume: naverPrice.volume,
      };
      
      // 캐시 저장
      setCachedPrice(symbol, priceData);
      
      return NextResponse.json({
        success: true,
        data: priceData,
        source: 'naver',
        timestamp: new Date().toISOString(),
      });
    }

    // 2차: KIS API 조회 (백업)
    const kisPrice = await fetchKISPrice(symbol);
    
    if (kisPrice && kisPrice.price > 0) {
      const priceData = {
        symbol,
        name: kisPrice.name || localStock?.name || symbol,
        market: localStock?.market || 'KOSPI',
        sector: localStock?.sector || '미분류',
        price: kisPrice.price,
        change: kisPrice.change,
        changePercent: kisPrice.changePercent,
        volume: kisPrice.volume,
        high: kisPrice.high,
        low: kisPrice.low,
        open: kisPrice.open,
      };
      
      // 캐시 저장
      setCachedPrice(symbol, priceData);
      
      return NextResponse.json({
        success: true,
        data: priceData,
        source: 'kis',
        timestamp: new Date().toISOString(),
      });
    }

    // 3차: 외부 검색으로 종목 정보만 반환
    const externalInfo = await getStockInfoByCode(symbol);
    
    if (externalInfo) {
      return NextResponse.json({
        success: true,
        data: {
          symbol: externalInfo.symbol,
          name: externalInfo.name,
          market: externalInfo.market,
          sector: localStock?.sector || '외부검색',
          price: externalInfo.price || 0,
          change: externalInfo.change || 0,
          changePercent: externalInfo.changePercent || 0,
        },
        source: externalInfo.source,
        timestamp: new Date().toISOString(),
      });
    }

    // 로컬 데이터만 반환
    if (localStock) {
      return NextResponse.json({
        success: true,
        data: {
          symbol,
          name: localStock.name,
          market: localStock.market,
          sector: localStock.sector,
          price: 0,
          change: 0,
          changePercent: 0,
        },
        source: 'local',
        timestamp: new Date().toISOString(),
        warning: 'Real-time price unavailable',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Stock not found',
    }, { status: 404 });

  } catch (error) {
    console.error('Stock price fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock price',
    }, { status: 500 });
  }
}

/**
 * POST /api/stocks/price
 * 여러 종목의 실시간 가격 일괄 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'symbols array is required',
      }, { status: 400 });
    }

    // 최대 20개까지
    const limitedSymbols = symbols.slice(0, 20).filter((s: string) => /^\d{6}$/.test(s));
    
    const results: Record<string, unknown> = {};

    // 병렬로 조회
    await Promise.allSettled(
      limitedSymbols.map(async (symbol: string) => {
        const localStock = findStockBySymbol(symbol);
        
        // 네이버 금융 우선
        const naverPrice = await getNaverStockPrice(symbol);
        if (naverPrice && naverPrice.price > 0) {
          results[symbol] = {
            name: naverPrice.name || localStock?.name || symbol,
            price: naverPrice.price,
            change: naverPrice.change,
            changePercent: naverPrice.changePercent,
            volume: naverPrice.volume,
            source: 'naver',
          };
          return;
        }

        // KIS 백업
        const kisPrice = await fetchKISPrice(symbol);
        if (kisPrice && kisPrice.price > 0) {
          results[symbol] = {
            name: kisPrice.name || localStock?.name || symbol,
            price: kisPrice.price,
            change: kisPrice.change,
            changePercent: kisPrice.changePercent,
            volume: kisPrice.volume,
            source: 'kis',
          };
          return;
        }

        // 로컬 데이터만
        if (localStock) {
          results[symbol] = {
            name: localStock.name,
            price: 0,
            change: 0,
            changePercent: 0,
            source: 'local',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Batch price fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch prices',
    }, { status: 500 });
  }
}

