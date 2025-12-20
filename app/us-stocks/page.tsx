'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DisclaimerBar, Header } from '@/components';

interface StockRecommendation {
  rank: number;
  symbol: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  expectedReturn: string;
  change: number;
  changePercent: number;
  score: number;
  reason: string;
  risks: string[];
  sector: string;
}

interface HeroInfo {
  id: string;
  name: string;
  nameKo: string;
  title: string;
  criteria: string;
  methodology: string;
}

interface HeroRecommendation {
  hero: HeroInfo;
  stocks: StockRecommendation[];
  date: string;
  time: string;
  isLoading: boolean;
  error: string | null;
}

const HEROES = [
  { id: 'claude', color: 'from-amber-500 to-orange-600', icon: '🔍', textColor: 'text-amber-400', name: '클로드 리' },
  { id: 'gemini', color: 'from-cyan-500 to-blue-600', icon: '🚀', textColor: 'text-cyan-400', name: '제미 나인' },
  { id: 'gpt', color: 'from-emerald-500 to-teal-600', icon: '🏛️', textColor: 'text-emerald-400', name: 'G.P. 테일러' },
];

const SECTORS = [
  { id: 'all', name: '전체', icon: '🌐' },
  { id: 'Technology', name: '테크', icon: '💻' },
  { id: 'Semiconductor', name: '반도체', icon: '🔬' },
  { id: 'Finance', name: '금융', icon: '🏦' },
  { id: 'Healthcare', name: '헬스케어', icon: '🏥' },
  { id: 'Consumer', name: '소비재', icon: '🛒' },
  { id: 'Energy', name: '에너지', icon: '⚡' },
];

type ViewMode = 'consensus' | 'individual' | 'sector';

export default function USStocksPage() {
  const [recommendations, setRecommendations] = useState<Record<string, HeroRecommendation>>({});
  const [selectedHero, setSelectedHero] = useState<string>('claude');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('consensus');
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(false);

  const fetchHeroRecommendations = useCallback(async (heroId: string) => {
    if (fetchedRef.current.has(heroId)) return;
    fetchedRef.current.add(heroId);
    
    setRecommendations(prev => ({
      ...prev,
      [heroId]: {
        hero: prev[heroId]?.hero || {} as HeroInfo,
        stocks: prev[heroId]?.stocks || [],
        date: prev[heroId]?.date || '',
        time: prev[heroId]?.time || '',
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/heroes/${heroId}/us-top5`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setRecommendations(prev => ({
        ...prev,
        [heroId]: {
          hero: data.hero,
          stocks: data.stocks,
          date: data.date,
          time: data.time,
          isLoading: false,
          error: null,
        },
      }));
    } catch (error) {
      fetchedRef.current.delete(heroId);
      setRecommendations(prev => ({
        ...prev,
        [heroId]: {
          ...prev[heroId],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  }, []);

  // 초기 로드 시 모든 AI 데이터 가져오기
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      HEROES.forEach(hero => {
        fetchHeroRecommendations(hero.id);
      });
    }
  }, [fetchHeroRecommendations]);

  const currentData = recommendations[selectedHero];
  const heroConfig = HEROES.find(h => h.id === selectedHero);
  
  // 로딩 상태 확인
  const isAnyLoading = HEROES.some(h => recommendations[h.id]?.isLoading);
  const loadedCount = HEROES.filter(h => recommendations[h.id]?.stocks?.length > 0).length;

  // 합의 종목 계산
  const getConsensusStocks = () => {
    const allStocks = Object.values(recommendations).flatMap(r => r.stocks || []);
    const stockMap = new Map<string, { count: number; stocks: StockRecommendation[]; heroes: string[] }>();
    
    Object.entries(recommendations).forEach(([heroId, data]) => {
      data.stocks?.forEach(stock => {
        const existing = stockMap.get(stock.symbol) || { count: 0, stocks: [], heroes: [] };
        existing.count += 1;
        existing.stocks.push(stock);
        existing.heroes.push(heroId);
        stockMap.set(stock.symbol, existing);
      });
    });

    const unanimous = Array.from(stockMap.entries())
      .filter(([_, data]) => data.count === 3)
      .map(([symbol, data]) => ({
        symbol,
        ...data,
        avgScore: data.stocks.reduce((sum, s) => sum + s.score, 0) / data.count,
        avgTargetPrice: data.stocks.reduce((sum, s) => sum + s.targetPrice, 0) / data.count,
        stockData: data.stocks[0],
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const majority = Array.from(stockMap.entries())
      .filter(([_, data]) => data.count === 2)
      .map(([symbol, data]) => ({
        symbol,
        ...data,
        avgScore: data.stocks.reduce((sum, s) => sum + s.score, 0) / data.count,
        avgTargetPrice: data.stocks.reduce((sum, s) => sum + s.targetPrice, 0) / data.count,
        stockData: data.stocks[0],
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return { unanimous, majority };
  };

  // 섹터별 종목 계산
  const getSectorStocks = () => {
    const allStocks = Object.values(recommendations).flatMap(r => r.stocks || []);
    const sectorMap = new Map<string, StockRecommendation[]>();
    
    allStocks.forEach(stock => {
      const sector = stock.sector || 'Other';
      const existing = sectorMap.get(sector) || [];
      // 중복 제거
      if (!existing.find(s => s.symbol === stock.symbol)) {
        existing.push(stock);
      }
      sectorMap.set(sector, existing);
    });

    return sectorMap;
  };

  const { unanimous, majority } = getConsensusStocks();
  const sectorStocks = getSectorStocks();

  // 필터링된 종목
  const getFilteredStocks = () => {
    if (selectedSector === 'all') {
      return currentData?.stocks || [];
    }
    return (currentData?.stocks || []).filter(s => 
      s.sector?.toLowerCase().includes(selectedSector.toLowerCase())
    );
  };

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        {/* Page Header */}
        <div className="bg-gradient-to-b from-dark-900/50 to-transparent border-b border-dark-800/50">
          <div className="container-app py-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-dark-100 mb-3">
                🇺🇸 미국주식 AI 분석
              </h1>
              <p className="text-dark-400 max-w-2xl mx-auto">
                3명의 AI 전문가가 각자의 투자철학으로 미국주식을 분석합니다
              </p>
              {isAnyLoading && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-brand-400">AI 분석 중... ({loadedCount}/3)</span>
                </div>
              )}
            </div>

            {/* View Mode Tabs */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setViewMode('consensus')}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  viewMode === 'consensus'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                🤝 AI 합의 종목
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  viewMode === 'individual'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                👤 개별 AI 추천
              </button>
              <button
                onClick={() => setViewMode('sector')}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  viewMode === 'sector'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                📊 섹터별 보기
              </button>
            </div>

            {/* Hero/Sector Selector based on view mode */}
            {viewMode === 'individual' && (
              <div className="flex justify-center gap-3 flex-wrap">
                {HEROES.map(hero => (
                  <button
                    key={hero.id}
                    onClick={() => setSelectedHero(hero.id)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      selectedHero === hero.id
                        ? `bg-gradient-to-r ${hero.color} text-white shadow-lg scale-105`
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    <span className="mr-2">{hero.icon}</span>
                    {hero.name}
                  </button>
                ))}
              </div>
            )}

            {viewMode === 'sector' && (
              <div className="flex justify-center gap-2 flex-wrap">
                {SECTORS.map(sector => (
                  <button
                    key={sector.id}
                    onClick={() => setSelectedSector(sector.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedSector === sector.id
                        ? 'bg-brand-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    <span className="mr-1">{sector.icon}</span>
                    {sector.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="container-app py-8">
          {/* Consensus View */}
          {viewMode === 'consensus' && (
            <div className="space-y-12">
              {/* 3인 만장일치 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <h2 className="text-xl font-bold text-dark-100">3인 만장일치 종목</h2>
                    <p className="text-dark-500 text-sm">3명의 AI 모두가 추천한 종목</p>
                  </div>
                  {unanimous.length > 0 && (
                    <span className="ml-auto px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                      {unanimous.length}종목
                    </span>
                  )}
                </div>
                
                {unanimous.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unanimous.map(item => (
                      <div key={item.symbol} className="card p-6 border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-dark-100">{item.stockData.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-dark-500">{item.symbol}</span>
                              <span className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
                                {item.stockData.sector}
                              </span>
                            </div>
                          </div>
                          <div className="text-3xl">🏆</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-dark-500 text-xs">현재가</p>
                            <p className="text-xl font-bold text-dark-200">
                              ${item.stockData.currentPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-dark-500 text-xs">평균 목표가</p>
                            <p className="text-xl font-bold text-brand-400">
                              ${item.avgTargetPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                          <div className="flex items-center gap-1">
                            <span className="text-dark-500 text-xs">평균 점수</span>
                            <span className="text-yellow-400 font-bold">{item.avgScore.toFixed(1)}</span>
                          </div>
                          <div className="flex -space-x-1">
                            {HEROES.map(h => (
                              <div key={h.id} className={`w-6 h-6 rounded-full bg-gradient-to-r ${h.color} flex items-center justify-center text-xs border-2 border-dark-900`}>
                                {h.icon}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <div className="text-4xl mb-4">🔄</div>
                    <p className="text-dark-400">
                      {isAnyLoading ? 'AI 분석을 불러오는 중...' : '3명의 AI가 동시에 추천한 종목이 없습니다'}
                    </p>
                  </div>
                )}
              </section>

              {/* 2인 다수 동의 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">🤝</div>
                  <div>
                    <h2 className="text-xl font-bold text-dark-100">2인 동의 종목</h2>
                    <p className="text-dark-500 text-sm">2명의 AI가 공통으로 추천한 종목</p>
                  </div>
                  {majority.length > 0 && (
                    <span className="ml-auto px-3 py-1 bg-brand-500/20 text-brand-400 rounded-full text-sm font-medium">
                      {majority.length}종목
                    </span>
                  )}
                </div>
                
                {majority.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {majority.map(item => (
                      <div key={item.symbol} className="card p-5 border border-brand-500/20">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-dark-100">{item.stockData.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-dark-500 text-sm">{item.symbol}</span>
                              <span className="px-1.5 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
                                {item.stockData.sector}
                              </span>
                            </div>
                          </div>
                          <div className="flex -space-x-1">
                            {item.heroes.map(heroId => {
                              const h = HEROES.find(x => x.id === heroId);
                              return h ? (
                                <div key={heroId} className={`w-6 h-6 rounded-full bg-gradient-to-r ${h.color} flex items-center justify-center text-xs border-2 border-dark-900`}>
                                  {h.icon}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-dark-200 font-bold">${item.stockData.currentPrice.toFixed(2)}</span>
                            <span className={`ml-2 text-sm ${item.stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.stockData.changePercent >= 0 ? '▲' : '▼'}{Math.abs(item.stockData.changePercent).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-400 font-bold">${item.avgTargetPrice.toFixed(2)}</span>
                            <span className="text-dark-500 text-xs ml-1">목표</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card p-6 text-center">
                    <p className="text-dark-500">
                      {isAnyLoading ? '분석 중...' : '2인 동의 종목이 없습니다'}
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Individual AI View */}
          {viewMode === 'individual' && (
            <>
              {/* Hero Info Card */}
              {currentData?.hero?.nameKo && (
                <div className={`card p-6 mb-8 border-l-4 ${
                  heroConfig?.id === 'claude' ? 'border-l-amber-500' :
                  heroConfig?.id === 'gemini' ? 'border-l-cyan-500' : 'border-l-emerald-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className={`text-2xl font-bold ${heroConfig?.textColor}`}>
                        {currentData.hero.nameKo}
                        <span className="text-dark-500 text-lg ml-2">({currentData.hero.name})</span>
                      </h2>
                      <p className="text-dark-400 mt-1">{currentData.hero.title}</p>
                    </div>
                    <div className="text-right text-sm text-dark-500">
                      <p>{currentData.date}</p>
                      <p>{currentData.time} 기준</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {currentData?.isLoading && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-800 mb-4">
                    <svg className="animate-spin h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <p className="text-dark-400 text-lg">{heroConfig?.name}이(가) 미국주식을 분석 중...</p>
                </div>
              )}

              {/* Stock List */}
              {currentData?.stocks && currentData.stocks.length > 0 && (
                <div className="space-y-4">
                  {currentData.stocks.map((stock, index) => (
                    <StockCard 
                      key={stock.symbol}
                      stock={stock}
                      index={index}
                      heroConfig={heroConfig}
                      expanded={expandedStock === stock.symbol}
                      onToggle={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Sector View */}
          {viewMode === 'sector' && (
            <div className="space-y-8">
              {selectedSector === 'all' ? (
                // 전체 섹터 보기
                Array.from(sectorStocks.entries()).map(([sector, stocks]) => (
                  <section key={sector}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">
                        {SECTORS.find(s => s.id === sector || s.name === sector)?.icon || '📁'}
                      </span>
                      <h3 className="text-lg font-bold text-dark-100">{sector}</h3>
                      <span className="text-dark-500 text-sm">({stocks.length}종목)</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {stocks.slice(0, 6).map(stock => (
                        <div key={stock.symbol} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-dark-100">{stock.name}</h4>
                              <span className="text-dark-500 text-sm">{stock.symbol}</span>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              stock.score >= 4.5 ? 'bg-emerald-500/20 text-emerald-400' :
                              stock.score >= 4.0 ? 'bg-brand-500/20 text-brand-400' :
                              'bg-dark-700 text-dark-400'
                            }`}>
                              {stock.score.toFixed(1)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-dark-200 font-medium">${stock.currentPrice.toFixed(2)}</span>
                            <span className="text-brand-400">→ ${stock.targetPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                // 특정 섹터 보기
                <div className="grid gap-4 md:grid-cols-2">
                  {(sectorStocks.get(selectedSector) || []).map(stock => (
                    <StockCard
                      key={stock.symbol}
                      stock={stock}
                      index={0}
                      heroConfig={heroConfig}
                      expanded={expandedStock === stock.symbol}
                      onToggle={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                    />
                  ))}
                  {(sectorStocks.get(selectedSector) || []).length === 0 && (
                    <div className="col-span-2 card p-8 text-center">
                      <p className="text-dark-400">해당 섹터의 추천 종목이 없습니다</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StockCard({ 
  stock, 
  index, 
  heroConfig, 
  expanded, 
  onToggle 
}: { 
  stock: StockRecommendation; 
  index: number;
  heroConfig?: typeof HEROES[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card overflow-hidden transition-all duration-300 hover:border-dark-600">
      <div className="p-4 sm:p-6 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
            index === 1 ? 'bg-gray-400/20 text-gray-300' :
            index === 2 ? 'bg-amber-700/20 text-amber-600' :
            'bg-dark-700 text-dark-400'
          }`}>
            {stock.rank || index + 1}
          </div>

          {/* Stock Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-dark-100">{stock.name}</h3>
              <span className="text-sm text-dark-500">{stock.symbol}</span>
              <span className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
                {stock.sector}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xl font-bold text-dark-200">
                ${stock.currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${
                stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Target & Score */}
          <div className="text-right hidden sm:block">
            <div className="text-sm text-dark-500">목표가</div>
            <div className="text-lg font-bold text-brand-400">
              ${stock.targetPrice.toFixed(2)}
            </div>
            <div className="text-sm text-emerald-400">
              +{stock.expectedReturn}
            </div>
          </div>

          {/* Score Badge */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
            stock.score >= 4.5 ? 'bg-emerald-500/20 text-emerald-400' :
            stock.score >= 4.0 ? 'bg-brand-500/20 text-brand-400' :
            stock.score >= 3.5 ? 'bg-amber-500/20 text-amber-400' :
            'bg-dark-700 text-dark-400'
          }`}>
            {stock.score.toFixed(1)}
          </div>

          {/* Expand Icon */}
          <svg
            className={`w-5 h-5 text-dark-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-6 border-t border-dark-700 pt-4">
          <div className="mb-4">
            <h4 className={`text-sm font-semibold ${heroConfig?.textColor || 'text-brand-400'} mb-2`}>
              {heroConfig?.icon || '🤖'} AI 분석 의견
            </h4>
            <p className="text-dark-300 leading-relaxed">{stock.reason}</p>
          </div>

          {stock.risks && stock.risks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-rose-400 mb-2">⚠️ 리스크 요인</h4>
              <ul className="space-y-1">
                {stock.risks.map((risk, i) => (
                  <li key={i} className="text-dark-400 text-sm flex items-start gap-2">
                    <span className="text-dark-600">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
