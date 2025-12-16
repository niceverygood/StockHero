export type { MarketDataProvider, StockQuote, StockFinancials, StockNews } from './types';
export { MockMarketDataProvider, createMarketDataProvider as createMockMarketDataProvider } from './mock';
export { KISMarketDataProvider, createKISMarketDataProvider, fetchMultipleStockPrices } from './kis';

// 자동으로 적절한 Provider 선택
export function createMarketDataProvider() {
  const hasKISCredentials = !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
  
  if (hasKISCredentials) {
    const { KISMarketDataProvider } = require('./kis');
    return new KISMarketDataProvider();
  }
  
  const { MockMarketDataProvider } = require('./mock');
  return new MockMarketDataProvider();
}

