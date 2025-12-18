import { NextRequest, NextResponse } from 'next/server';
import { KRX_ALL_STOCKS, KRX_SECTORS, searchStocksByName, isValidStockSymbol } from '@/lib/data/krx-stocks';
import { 
  searchAllSources, 
  getStockInfoByCode, 
  enrichWithPrices,
  getNaverStockPrice,
  type ExternalStockResult 
} from '@/lib/external/stock-search';

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * KIS Access Token 발급
 */
async function getKISAccessToken(): Promise<string | null> {
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
      return null;
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Failed to get KIS token:', error);
    return null;
  }
}

/**
 * KIS API로 종목 정보 조회 (종목 코드로)
 */
async function fetchStockInfoFromKIS(symbol: string): Promise<{
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sector?: string;
} | null> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    return null;
  }

  const token = await getKISAccessToken();
  if (!token) {
    return null;
  }

  try {
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
          'tr_id': 'FHKST01010100',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.rt_cd !== '0') {
      return null;
    }

    const output = data.output;
    const stockName = (output.hts_kor_isnm || '').trim() || symbol;
    
    return {
      symbol,
      name: stockName,
      price: parseInt(output.stck_prpr) || 0,
      change: parseInt(output.prdy_vrss) || 0,
      changePercent: parseFloat(output.prdy_ctrt) || 0,
      sector: output.bstp_kor_isnm || '미분류',
    };
  } catch (error) {
    console.error('Failed to fetch stock info from KIS:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const sector = searchParams.get('sector');
  const market = searchParams.get('market');
  const limit = parseInt(searchParams.get('limit') || '50');
  const includePrice = searchParams.get('includePrice') === 'true';
  const includeExternal = searchParams.get('external') !== 'false'; // 기본값: true

  try {
    // 1. 로컬 종목 리스트에서 검색
    let localResults = query ? searchStocksByName(query) : [...KRX_ALL_STOCKS];

    // 2. 섹터 필터
    if (sector && sector !== 'all') {
      localResults = localResults.filter(s => s.sector === sector);
    }

    // 3. 시장 필터
    if (market && (market === 'KOSPI' || market === 'KOSDAQ')) {
      localResults = localResults.filter(s => s.market === market);
    }

    // 4. 로컬 결과를 표준 형식으로 변환
    type SearchResult = {
      symbol: string;
      name: string;
      market: 'KOSPI' | 'KOSDAQ';
      sector: string;
      source: 'local' | 'external' | 'kis';
      externalType?: 'stock' | 'etf' | 'etn' | 'other';
      price?: number;
      change?: number;
      changePercent?: number;
    };
    
    let allResults: SearchResult[] = localResults.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      sector: stock.sector,
      source: 'local' as const,
    }));

    // 5. 로컬 결과가 부족하고 검색어가 있을 때 외부 API 검색
    if (query && query.length >= 2 && includeExternal && allResults.length < 10) {
      console.log(`Searching external sources for: ${query}`);
      
      try {
        const externalResults = await searchAllSources(query);
        
        // 외부 결과를 로컬 결과와 병합 (중복 제거)
        const localSymbols = new Set(allResults.map(r => r.symbol));
        
        const newExternalResults = externalResults
          .filter(r => !localSymbols.has(r.symbol))
          .map(r => ({
            symbol: r.symbol,
            name: r.name,
            market: r.market === 'ETF' || r.market === 'KONEX' || r.market === 'OTHER' 
              ? 'KOSPI' as const 
              : r.market as 'KOSPI' | 'KOSDAQ',
            sector: r.type === 'etf' ? 'ETF' : '외부검색',
            source: 'external' as const,
            externalType: r.type,
          }));

        // 시장 필터 적용
        const filteredExternal = market 
          ? newExternalResults.filter(r => r.market === market)
          : newExternalResults;

        allResults = [...allResults, ...filteredExternal];
      } catch (extError) {
        console.error('External search failed:', extError);
        // 외부 검색 실패해도 로컬 결과는 반환
      }
    }

    // 6. 종목 코드로 직접 검색 (로컬에 없는 경우)
    // 6자리 종목코드 허용 (숫자 또는 숫자+알파벳)
    const isValidCode = query && query.length === 6 && /^[0-9A-Z]{6}$/i.test(query);
    if (query && allResults.length === 0 && (isValidStockSymbol(query) || isValidCode)) {
      console.log(`Searching by stock code: ${query}`);
      
      // 네이버 금융에서 종목코드로 검색
      const externalInfo = await getStockInfoByCode(query);
      if (externalInfo) {
        allResults.push({
          symbol: externalInfo.symbol,
          name: externalInfo.name,
          market: externalInfo.market === 'ETF' || externalInfo.market === 'KONEX' || externalInfo.market === 'OTHER'
            ? 'KOSPI' as const
            : externalInfo.market as 'KOSPI' | 'KOSDAQ',
          sector: externalInfo.type === 'etf' ? 'ETF' : '외부검색',
          source: 'external' as const,
        });
      } else {
        // KIS API로 백업 검색
        const kisResult = await fetchStockInfoFromKIS(query);
        if (kisResult) {
          allResults.push({
            symbol: kisResult.symbol,
            name: kisResult.name,
            market: 'KOSPI' as const,
            sector: kisResult.sector || '미분류',
            source: 'kis' as const,
            price: kisResult.price,
            change: kisResult.change,
            changePercent: kisResult.changePercent,
          });
        }
      }
    }

    // 7. 결과 제한
    const limitedResults = allResults.slice(0, limit);

    // 8. 실시간 가격 포함 - 네이버 금융 + KIS API 병합
    let enrichedResults = limitedResults;

    if (includePrice && limitedResults.length > 0) {
      // 상위 5개에 대해 실시간 시세 조회 (네이버 금융 우선, KIS 백업)
      const pricePromises = limitedResults.slice(0, 5).map(async (stock) => {
        try {
          // 1차: 네이버 금융 시세 조회
          const naverPrice = await getNaverStockPrice(stock.symbol);
          if (naverPrice && naverPrice.price > 0) {
            return {
              ...stock,
              price: naverPrice.price,
              change: naverPrice.change,
              changePercent: naverPrice.changePercent,
              volume: naverPrice.volume,
              priceSource: 'naver' as const,
            };
          }

          // 2차: KIS API 백업
          const kisInfo = await fetchStockInfoFromKIS(stock.symbol);
          if (kisInfo && kisInfo.price) {
            return {
              ...stock,
              price: kisInfo.price,
              change: kisInfo.change,
              changePercent: kisInfo.changePercent,
              priceSource: 'kis' as const,
            };
          }
        } catch (error) {
          console.error(`Price fetch failed for ${stock.symbol}:`, error);
        }
        return stock;
      });

      const enrichedTop = await Promise.all(pricePromises);
      enrichedResults = [...enrichedTop, ...limitedResults.slice(5)];
    }

    return NextResponse.json({
      success: true,
      query,
      results: enrichedResults,
      sectors: KRX_SECTORS,
      total: enrichedResults.length,
      hasMore: allResults.length > limit,
      sources: {
        local: localResults.length,
        external: allResults.length - localResults.length,
      },
    });

  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search stocks',
      results: [],
      sectors: KRX_SECTORS,
      total: 0,
    }, { status: 500 });
  }
}

/**
 * POST - 특정 종목 코드의 실시간 정보 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol || !isValidStockSymbol(symbol)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid stock symbol',
      }, { status: 400 });
    }

    // KIS API로 종목 정보 조회
    const stockInfo = await fetchStockInfoFromKIS(symbol);

    if (stockInfo) {
      return NextResponse.json({
        success: true,
        data: stockInfo,
        source: 'kis',
      });
    }

    // 로컬 데이터에서 찾기
    const localStock = KRX_ALL_STOCKS.find(s => s.symbol === symbol);
    if (localStock) {
      return NextResponse.json({
        success: true,
        data: {
          symbol: localStock.symbol,
          name: localStock.name,
          sector: localStock.sector,
          market: localStock.market,
        },
        source: 'local',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Stock not found',
    }, { status: 404 });

  } catch (error) {
    console.error('Stock info fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock info',
    }, { status: 500 });
  }
}

