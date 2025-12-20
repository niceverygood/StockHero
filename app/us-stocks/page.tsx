'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

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
  { id: 'claude', color: 'from-amber-500 to-orange-600', icon: '🔍', textColor: 'text-amber-400' },
  { id: 'gemini', color: 'from-cyan-500 to-blue-600', icon: '🚀', textColor: 'text-cyan-400' },
  { id: 'gpt', color: 'from-emerald-500 to-teal-600', icon: '🏛️', textColor: 'text-emerald-400' },
];

export default function USStocksPage() {
  const [recommendations, setRecommendations] = useState<Record<string, HeroRecommendation>>({});
  const [selectedHero, setSelectedHero] = useState<string>('claude');
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

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
      fetchedRef.current.delete(heroId); // 실패 시 다시 시도할 수 있게
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

  // 초기 로드 시 선택된 히어로 데이터 가져오기
  useEffect(() => {
    fetchHeroRecommendations(selectedHero);
  }, [selectedHero, fetchHeroRecommendations]);

  const currentData = recommendations[selectedHero];
  const heroConfig = HEROES.find(h => h.id === selectedHero);

  return (
    <main className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-900 to-dark-950 border-b border-dark-800">
        <div className="container-app py-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="btn-ghost flex items-center gap-2 text-dark-400 hover:text-brand-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              홈으로
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-dark-100 mb-3">
              🇺🇸 미국주식 AI 분석
            </h1>
            <p className="text-dark-400 max-w-2xl mx-auto">
              3명의 AI 전문가가 각자의 투자철학으로 미국주식 Top 5를 추천합니다
            </p>
            {currentData?.isLoading && (
              <p className="text-brand-400 mt-2">AI 분석 중...</p>
            )}
          </div>

          {/* Hero Selector */}
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
                {hero.id === 'claude' && '클로드 리'}
                {hero.id === 'gemini' && '제미 나인'}
                {hero.id === 'gpt' && 'G.P. 테일러'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-8">
        {/* Hero Info Card */}
        {currentData?.hero && (
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
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-dark-300">
                    <span className="text-dark-500">선정 기준:</span> {currentData.hero.criteria}
                  </p>
                  <p className="text-sm text-dark-300">
                    <span className="text-dark-500">분석 방법론:</span> {currentData.hero.methodology}
                  </p>
                </div>
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
            <p className="text-dark-400 text-lg">AI가 미국주식을 분석 중입니다...</p>
            <p className="text-dark-500 text-sm mt-2">실시간 데이터와 AI 분석이 결합됩니다</p>
          </div>
        )}

        {/* Error State */}
        {currentData?.error && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-rose-400 text-lg mb-4">{currentData.error}</p>
            <button
              onClick={() => fetchHeroRecommendations(selectedHero)}
              className="btn-primary"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Stock Recommendations */}
        {currentData?.stocks && currentData.stocks.length > 0 && (
          <div className="space-y-4">
            {currentData.stocks.map((stock, index) => (
              <div
                key={stock.symbol}
                className="card overflow-hidden transition-all duration-300 hover:border-dark-600"
              >
                {/* Main Row */}
                <div
                  className="p-4 sm:p-6 cursor-pointer"
                  onClick={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300' :
                      index === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {stock.rank}
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
                    <div className="text-right">
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
                      className={`w-5 h-5 text-dark-500 transition-transform ${
                        expandedStock === stock.symbol ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedStock === stock.symbol && (
                  <div className="px-4 sm:px-6 pb-6 border-t border-dark-700 pt-4">
                    {/* Reason */}
                    <div className="mb-4">
                      <h4 className={`text-sm font-semibold ${heroConfig?.textColor} mb-2`}>
                        {heroConfig?.icon} AI 분석 의견
                      </h4>
                      <p className="text-dark-300 leading-relaxed">{stock.reason}</p>
                    </div>

                    {/* Risks */}
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
            ))}
          </div>
        )}

        {/* Unanimous Section */}
        {Object.keys(recommendations).length === 3 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-dark-100 mb-6 text-center">
              🤝 3인 만장일치 종목
            </h2>
            <UnanimousStocks recommendations={recommendations} />
          </div>
        )}

        {/* Fetch All Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
              HEROES.forEach(hero => {
                fetchHeroRecommendations(hero.id);
              });
            }}
            className="btn-primary px-8 py-3"
            disabled={HEROES.every(h => recommendations[h.id]?.isLoading)}
          >
            🔄 3명 AI 전체 분석 보기
          </button>
        </div>
      </div>
    </main>
  );
}

function UnanimousStocks({ recommendations }: { recommendations: Record<string, HeroRecommendation> }) {
  // 3명 모두 추천한 종목 찾기
  const allStocks = Object.values(recommendations).flatMap(r => r.stocks?.map(s => s.symbol) || []);
  const stockCounts = allStocks.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unanimousSymbols = Object.entries(stockCounts)
    .filter(([_, count]) => count === 3)
    .map(([symbol]) => symbol);

  if (unanimousSymbols.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">🤔</div>
        <p className="text-dark-400">아직 3명의 AI가 동시에 추천한 종목이 없습니다</p>
        <p className="text-dark-500 text-sm mt-2">각 AI의 개별 추천을 확인해보세요</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {unanimousSymbols.map(symbol => {
        // 첫 번째 hero의 데이터 사용
        const stockData = Object.values(recommendations)
          .find(r => r.stocks?.some(s => s.symbol === symbol))
          ?.stocks?.find(s => s.symbol === symbol);

        if (!stockData) return null;

        return (
          <div key={symbol} className="card p-6 border-2 border-brand-500/30 bg-brand-500/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-dark-100">{stockData.name}</h3>
                <p className="text-dark-500">{stockData.symbol}</p>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-500 text-sm">현재가</p>
                <p className="text-xl font-bold text-dark-200">${stockData.currentPrice.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-dark-500 text-sm">평균 목표가</p>
                <p className="text-xl font-bold text-brand-400">${stockData.targetPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
