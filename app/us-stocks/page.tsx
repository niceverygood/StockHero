'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface USStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  sector?: string;
}

const SECTORS = [
  { id: 'all', name: '전체', emoji: '🌐' },
  { id: 'tech', name: '빅테크', emoji: '💻' },
  { id: 'semi', name: '반도체', emoji: '🔌' },
  { id: 'finance', name: '금융', emoji: '🏦' },
  { id: 'consumer', name: '소비재', emoji: '🛒' },
  { id: 'health', name: '헬스케어', emoji: '💊' },
  { id: 'energy', name: '에너지', emoji: '⛽' },
  { id: 'growth', name: '성장주', emoji: '🚀' },
];

const STOCK_SECTORS: Record<string, string> = {
  'AAPL': 'tech', 'MSFT': 'tech', 'GOOGL': 'tech', 'AMZN': 'tech', 'META': 'tech',
  'NVDA': 'semi', 'TSM': 'semi', 'AVGO': 'semi', 'AMD': 'semi', 'INTC': 'semi', 'QCOM': 'semi',
  'TSLA': 'growth', 'NFLX': 'tech', 'ADBE': 'tech', 'CRM': 'tech', 'ORCL': 'tech',
  'JPM': 'finance', 'V': 'finance', 'MA': 'finance', 'BAC': 'finance', 'GS': 'finance',
  'WMT': 'consumer', 'COST': 'consumer', 'KO': 'consumer', 'PEP': 'consumer', 
  'MCD': 'consumer', 'NKE': 'consumer', 'SBUX': 'consumer', 'DIS': 'consumer',
  'JNJ': 'health', 'UNH': 'health', 'PFE': 'health', 'LLY': 'health', 'MRK': 'health',
  'XOM': 'energy', 'CVX': 'energy',
  'COIN': 'growth', 'PLTR': 'growth', 'SOFI': 'growth', 'RIVN': 'growth',
};

const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'TSM', 'AVGO', 'AMD', 'INTC', 'QCOM',
  'JPM', 'V', 'MA', 'BAC', 'GS',
  'WMT', 'COST', 'KO', 'MCD', 'NKE', 'SBUX',
  'JNJ', 'UNH', 'PFE', 'LLY',
  'XOM', 'CVX',
  'NFLX', 'DIS',
  'COIN', 'PLTR',
];

export default function USStocksPage() {
  const [stocks, setStocks] = useState<USStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchStocks();
    // 30초마다 갱신
    const interval = setInterval(fetchStocks, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStocks() {
    try {
      const symbols = POPULAR_SYMBOLS.join(',');
      const res = await fetch(`/api/stock/us?symbols=${symbols}`);
      const data = await res.json();
      
      if (data.success) {
        const stockList: USStock[] = Object.entries(data.data).map(([symbol, info]: [string, any]) => ({
          symbol,
          name: info.name,
          price: info.price,
          change: info.change,
          changePercent: info.changePercent,
          volume: info.volume,
          sector: STOCK_SECTORS[symbol] || 'other',
        }));
        
        // 등락률 기준 정렬
        stockList.sort((a, b) => b.changePercent - a.changePercent);
        setStocks(stockList);
        setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (error) {
      console.error('Failed to fetch US stocks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStocks = stocks.filter(stock => {
    const matchesSector = selectedSector === 'all' || STOCK_SECTORS[stock.symbol] === selectedSector;
    const matchesSearch = searchQuery === '' || 
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  // 상위 상승/하락 종목
  const topGainers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const topLosers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

  return (
    <main className="min-h-screen bg-dark-950 pt-20 pb-12">
      <div className="container-app">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-dark-500 hover:text-dark-300 text-sm mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-dark-100 flex items-center gap-3">
                🇺🇸 US Stocks
                <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  LIVE
                </span>
              </h1>
              <p className="text-dark-500 mt-1">미국 주요 종목 실시간 시세</p>
            </div>
            
            {lastUpdated && (
              <div className="text-xs text-dark-600">
                마지막 업데이트: {lastUpdated}
              </div>
            )}
          </div>
        </div>

        {/* Top Movers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Top Gainers */}
          <div className="card">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              🚀 오늘의 상승 TOP 5
            </h3>
            <div className="space-y-2">
              {topGainers.map((stock, i) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dark-600 w-4">{i + 1}</span>
                    <div>
                      <div className="font-medium text-dark-200">{stock.symbol}</div>
                      <div className="text-xs text-dark-500">{stock.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-dark-200">${stock.price.toFixed(2)}</div>
                    <div className="text-xs text-emerald-400">+{stock.changePercent.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="card">
            <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
              📉 오늘의 하락 TOP 5
            </h3>
            <div className="space-y-2">
              {topLosers.map((stock, i) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dark-600 w-4">{i + 1}</span>
                    <div>
                      <div className="font-medium text-dark-200">{stock.symbol}</div>
                      <div className="text-xs text-dark-500">{stock.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-dark-200">${stock.price.toFixed(2)}</div>
                    <div className="text-xs text-rose-400">{stock.changePercent.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="종목명 또는 티커 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-xl bg-dark-800 border border-dark-700 text-dark-200 placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
            <svg className="w-5 h-5 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sector Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SECTORS.map(sector => (
              <button
                key={sector.id}
                onClick={() => setSelectedSector(sector.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedSector === sector.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                }`}
              >
                {sector.emoji} {sector.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-6 bg-dark-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-dark-700 rounded w-32 mb-4"></div>
                <div className="h-8 bg-dark-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStocks.map(stock => (
              <div
                key={stock.symbol}
                className="card hover:border-dark-600 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-lg text-dark-100 group-hover:text-brand-400 transition-colors">
                      {stock.symbol}
                    </div>
                    <div className="text-sm text-dark-500 truncate max-w-[150px]">
                      {stock.name}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    stock.changePercent >= 0 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {SECTORS.find(s => s.id === STOCK_SECTORS[stock.symbol])?.emoji || '📈'}
                  </span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-dark-100">
                      ${stock.price.toFixed(2)}
                    </div>
                    <div className={`text-sm font-medium flex items-center gap-1 ${
                      stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stock.changePercent >= 0 ? '▲' : '▼'}
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredStocks.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-dark-400">검색 결과가 없습니다</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-dark-400">
              <p className="mb-1">미국 주식시장 거래 시간: 한국시간 오후 11:30 ~ 오전 6:00 (서머타임 적용 시 오후 10:30 ~ 오전 5:00)</p>
              <p>시세는 약 30초마다 자동 갱신됩니다. 실제 거래 시 증권사 시세를 확인하세요.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

