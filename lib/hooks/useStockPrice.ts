'use client';

import { useState, useEffect, useCallback } from 'react';

interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high52Week?: number;
  low52Week?: number;
  updatedAt?: string;
}

interface UseStockPriceResult {
  data: StockPrice | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  source: 'kis' | 'mock' | 'mock_fallback' | null;
}

interface UseMultipleStockPricesResult {
  data: Record<string, StockPrice>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  source: 'kis' | 'mock' | 'mock_fallback' | null;
}

/**
 * 단일 종목 실시간 가격 조회 훅
 */
export function useStockPrice(symbol: string | null, refreshInterval?: number): UseStockPriceResult {
  const [data, setData] = useState<StockPrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'kis' | 'mock' | 'mock_fallback' | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/stock/price?symbol=${symbol}`);
      const json = await res.json();
      
      if (json.success) {
        setData(json.data);
        setSource(json.source);
      } else {
        setError(json.error || 'Failed to fetch price');
      }
    } catch (err) {
      setError('Network error');
      console.error('useStockPrice error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchPrice();
    
    // 자동 새로고침 설정
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchPrice, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrice, refreshInterval]);

  return { data, isLoading, error, refetch: fetchPrice, source };
}

/**
 * 여러 종목 실시간 가격 조회 훅
 */
export function useMultipleStockPrices(
  symbols: string[], 
  refreshInterval?: number
): UseMultipleStockPricesResult {
  const [data, setData] = useState<Record<string, StockPrice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'kis' | 'mock' | 'mock_fallback' | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/stock/price?symbols=${symbols.join(',')}`);
      const json = await res.json();
      
      if (json.success) {
        // 기존 심볼 정보와 병합
        const newData: Record<string, StockPrice> = {};
        for (const sym of symbols) {
          if (json.data[sym]) {
            newData[sym] = {
              symbol: sym,
              ...json.data[sym],
            };
          }
        }
        setData(newData);
        setSource(json.source);
      } else {
        setError(json.error || 'Failed to fetch prices');
      }
    } catch (err) {
      setError('Network error');
      console.error('useMultipleStockPrices error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchPrices();
    
    // 자동 새로고침 설정
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, refreshInterval]);

  return { data, isLoading, error, refetch: fetchPrices, source };
}

