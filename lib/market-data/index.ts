export type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';
export { MockMarketDataProvider, createMarketDataProvider as createMockMarketDataProvider } from './mock';
export { KISMarketDataProvider, createKISMarketDataProvider, fetchMultipleStockPrices } from './kis';
export { NaverMarketDataProvider, createNaverMarketDataProvider, fetchMultipleNaverPrices } from './naver';

// 자동으로 적절한 Provider 선택
// 우선순위: KIS API > Naver Finance > Mock
export function createMarketDataProvider() {
  const hasKISCredentials = !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
  
  if (hasKISCredentials) {
    const { KISMarketDataProvider } = require('./kis');
    return new KISMarketDataProvider();
  }
  
  // KIS 없으면 네이버 금융 사용 (실시간 무료)
  const { NaverMarketDataProvider } = require('./naver');
  return new NaverMarketDataProvider();
}

