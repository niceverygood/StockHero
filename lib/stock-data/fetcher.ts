/**
 * 실시간 주가 데이터 수집기
 * KIS API를 사용하여 종목 마스터의 모든 종목 시세를 가져옴
 */

import { fetchMultipleStockPrices } from '@/lib/market-data/kis';
import { STOCK_MASTER, type StockMaster } from './master';

export interface RealTimeStockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  // 마스터 데이터에서 가져온 정보
  master: StockMaster;
}

export interface FetchResult {
  success: boolean;
  data: RealTimeStockData[];
  fetchedAt: Date;
  source: 'kis' | 'mock';
  errors: string[];
}

/**
 * 모든 마스터 종목의 실시간 시세 조회
 */
export async function fetchAllStockPrices(): Promise<FetchResult> {
  const symbols = STOCK_MASTER.map(s => s.symbol);
  const errors: string[] = [];
  
  try {
    // KIS API로 실시간 시세 조회
    const priceMap = await fetchMultipleStockPrices(symbols);
    
    // 마스터 데이터와 결합
    const data: RealTimeStockData[] = STOCK_MASTER.map(master => {
      const price = priceMap.get(master.symbol);
      
      if (!price) {
        errors.push(`Failed to fetch price for ${master.symbol}`);
      }
      
      return {
        symbol: master.symbol,
        name: price?.name || master.name,
        currentPrice: price?.price || 0,
        change: price?.change || 0,
        changePercent: price?.changePercent || 0,
        master,
      };
    }).filter(d => d.currentPrice > 0); // 가격이 있는 것만
    
    return {
      success: data.length > 0,
      data,
      fetchedAt: new Date(),
      source: priceMap.size > 0 ? 'kis' : 'mock',
      errors,
    };
  } catch (error) {
    console.error('Failed to fetch all stock prices:', error);
    
    return {
      success: false,
      data: [],
      fetchedAt: new Date(),
      source: 'mock',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * 특정 섹터의 종목 실시간 시세 조회
 */
export async function fetchSectorStockPrices(sector: string): Promise<FetchResult> {
  const sectorStocks = STOCK_MASTER.filter(s => s.sector === sector);
  const symbols = sectorStocks.map(s => s.symbol);
  const errors: string[] = [];
  
  if (symbols.length === 0) {
    return {
      success: false,
      data: [],
      fetchedAt: new Date(),
      source: 'mock',
      errors: [`No stocks found for sector: ${sector}`],
    };
  }
  
  try {
    const priceMap = await fetchMultipleStockPrices(symbols);
    
    const data: RealTimeStockData[] = sectorStocks.map(master => {
      const price = priceMap.get(master.symbol);
      
      return {
        symbol: master.symbol,
        name: price?.name || master.name,
        currentPrice: price?.price || 0,
        change: price?.change || 0,
        changePercent: price?.changePercent || 0,
        master,
      };
    }).filter(d => d.currentPrice > 0);
    
    return {
      success: data.length > 0,
      data,
      fetchedAt: new Date(),
      source: priceMap.size > 0 ? 'kis' : 'mock',
      errors,
    };
  } catch (error) {
    console.error(`Failed to fetch ${sector} stock prices:`, error);
    
    return {
      success: false,
      data: [],
      fetchedAt: new Date(),
      source: 'mock',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * 코스피200 종목의 실시간 시세 조회
 */
export async function fetchKospi200Prices(): Promise<FetchResult> {
  const kospi200Stocks = STOCK_MASTER.filter(s => s.isKospi200);
  const symbols = kospi200Stocks.map(s => s.symbol);
  const errors: string[] = [];
  
  try {
    const priceMap = await fetchMultipleStockPrices(symbols);
    
    const data: RealTimeStockData[] = kospi200Stocks.map(master => {
      const price = priceMap.get(master.symbol);
      
      return {
        symbol: master.symbol,
        name: price?.name || master.name,
        currentPrice: price?.price || 0,
        change: price?.change || 0,
        changePercent: price?.changePercent || 0,
        master,
      };
    }).filter(d => d.currentPrice > 0);
    
    return {
      success: data.length > 0,
      data,
      fetchedAt: new Date(),
      source: priceMap.size > 0 ? 'kis' : 'mock',
      errors,
    };
  } catch (error) {
    console.error('Failed to fetch KOSPI200 prices:', error);
    
    return {
      success: false,
      data: [],
      fetchedAt: new Date(),
      source: 'mock',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}








