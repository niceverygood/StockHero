'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from '@/components';

interface Top5Item {
  rank: number;
  symbol: string;
  name: string;
  avgScore: number;
  claudeScore: number;
  geminiScore: number;
  gptScore: number;
  isUnanimous: boolean;
  price?: number;
  currentPrice?: number;
}

interface DayVerdict {
  date: string;
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  consensusSummary: string;
}

interface StockHistory {
  symbol: string;
  name: string;
  firstRecommendDate: string;
  firstRecommendPrice?: number;
  totalDays: number;
  currentStreak: number;
  recommendations: { date: string; rank: number; score: number; price?: number }[];
  avgRecommendPrice?: number;
}

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  name?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 캐시 (메모리 기반)
const verdictCache = new Map<string, { data: Record<string, DayVerdict>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [verdicts, setVerdicts] = useState<Record<string, DayVerdict>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockHistory | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchMonthVerdicts();
  }, [year, month]);

  // 선택된 종목의 현재가 조회
  useEffect(() => {
    if (selectedStock && !stockPrices[selectedStock.symbol]) {
      fetchStockPrice(selectedStock.symbol);
    }
  }, [selectedStock]);

  const fetchStockPrice = async (symbol: string) => {
    if (stockPrices[symbol]) return;
    
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/stocks/price?symbol=${symbol}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setStockPrices(prev => ({
          ...prev,
          [symbol]: {
            price: data.data.price,
            change: data.data.change,
            changePercent: data.data.changePercent,
            name: data.data.name,
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchMonthVerdicts = useCallback(async () => {
    const cacheKey = `${year}-${month + 1}`;
    const cached = verdictCache.get(cacheKey);
    
    // 캐시가 유효하면 캐시 사용
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setVerdicts(cached.data);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar/verdicts?year=${year}&month=${month + 1}`);
      const data = await res.json();
      
      if (data.success && data.verdicts) {
        const verdictMap: Record<string, DayVerdict> = {};
        data.verdicts.forEach((v: any) => {
          verdictMap[v.date] = v;
        });
        setVerdicts(verdictMap);
        
        // 캐시 저장
        verdictCache.set(cacheKey, { data: verdictMap, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Failed to fetch verdicts:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // 종목별 추천 이력 분석
  const stockHistories = useMemo(() => {
    const histories: Record<string, StockHistory> = {};
    const sortedDates = Object.keys(verdicts).sort();

    sortedDates.forEach(date => {
      const verdict = verdicts[date];
      verdict.top5.forEach(stock => {
        // price는 currentPrice 또는 price 중 하나 사용
        const stockPrice = stock.currentPrice || stock.price;
        
        if (!histories[stock.symbol]) {
          histories[stock.symbol] = {
            symbol: stock.symbol,
            name: stock.name,
            firstRecommendDate: date,
            firstRecommendPrice: stockPrice,
            totalDays: 0,
            currentStreak: 0,
            recommendations: [],
          };
        }
        histories[stock.symbol].totalDays++;
        histories[stock.symbol].recommendations.push({
          date,
          rank: stock.rank,
          score: stock.avgScore,
          price: stockPrice,
        });
      });
    });

    // 연속 추천일 및 평균가 계산
    Object.values(histories).forEach(history => {
      history.recommendations.sort((a, b) => b.date.localeCompare(a.date));
      
      // 평균 추천가 계산
      const pricesWithValue = history.recommendations.filter(r => r.price && r.price > 0);
      if (pricesWithValue.length > 0) {
        history.avgRecommendPrice = Math.round(
          pricesWithValue.reduce((sum, r) => sum + (r.price || 0), 0) / pricesWithValue.length
        );
      }
      
      // 첫 추천가
      const sortedByDate = [...history.recommendations].sort((a, b) => a.date.localeCompare(b.date));
      if (sortedByDate[0]?.price) {
        history.firstRecommendPrice = sortedByDate[0].price;
      }
      
      let streak = 0;
      let prevDate: string | null = null;
      
      for (const rec of history.recommendations) {
        if (!prevDate) {
          streak = 1;
        } else {
          const prev = new Date(prevDate);
          const curr = new Date(rec.date);
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
        prevDate = rec.date;
      }
      
      history.currentStreak = streak;
    });

    return histories;
  }, [verdicts]);

  // 특정 종목의 연속 추천 정보 가져오기
  const getStockStreakInfo = (symbol: string, currentDateStr: string) => {
    const history = stockHistories[symbol];
    if (!history) return null;

    const sortedRecs = [...history.recommendations].sort((a, b) => a.date.localeCompare(b.date));
    
    let streak = 0;
    let streakStart = '';
    
    for (let i = 0; i < sortedRecs.length; i++) {
      if (sortedRecs[i].date > currentDateStr) break;
      
      if (i === 0 || sortedRecs[i].date <= currentDateStr) {
        if (i === 0) {
          streak = 1;
          streakStart = sortedRecs[i].date;
        } else {
          const prev = new Date(sortedRecs[i - 1].date);
          const curr = new Date(sortedRecs[i].date);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            streak = 1;
            streakStart = sortedRecs[i].date;
          }
        }
      }
    }

    return {
      streak,
      streakStart,
      firstDate: history.firstRecommendDate,
      totalDays: history.totalDays,
    };
  };

  const handleStockClick = (symbol: string) => {
    const history = stockHistories[symbol];
    if (history) {
      setSelectedStock(history);
      fetchStockPrice(symbol);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSelectedStock(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSelectedStock(null);
  };

  const selectedVerdict = selectedDate ? verdicts[selectedDate] : null;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 4.0) return 'text-green-400';
    if (score >= 3.5) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-black';
    if (rank === 2) return 'bg-slate-400 text-black';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-dark-700 text-dark-300';
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  const getReturnColor = (returnPct: number) => {
    if (returnPct > 0) return 'text-red-400';
    if (returnPct < 0) return 'text-blue-400';
    return 'text-dark-400';
  };

  const getReturnSign = (returnPct: number) => {
    if (returnPct > 0) return '+';
    return '';
  };

  // 수익률 계산
  const calculateReturn = (currentPrice: number, basePrice: number) => {
    if (!basePrice || basePrice === 0) return null;
    return ((currentPrice - basePrice) / basePrice) * 100;
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />

        <div className="relative container-app">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="text-dark-100">AI 추천</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">달력</span>
            </h1>
            <p className="text-dark-400">
              과거 AI 토론 결과를 날짜별로 확인하세요
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPrevMonth}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-dark-100">
                  {year}년 {month + 1}월
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-medium py-2 ${
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-dark-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateStr = formatDateString(day);
                  const hasData = !!verdicts[dateStr];
                  const isSelected = selectedDate === dateStr;
                  const dayOfWeek = new Date(year, month, day).getDay();

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (hasData) {
                          setSelectedDate(dateStr);
                          setSelectedStock(null);
                        }
                      }}
                      disabled={!hasData}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : hasData
                          ? 'bg-dark-800 hover:bg-dark-700 cursor-pointer'
                          : 'text-dark-600 cursor-default'
                      }`}
                    >
                      <span className={`text-sm font-medium ${
                        !isSelected && dayOfWeek === 0 ? 'text-red-400' : 
                        !isSelected && dayOfWeek === 6 ? 'text-blue-400' : ''
                      }`}>
                        {day}
                      </span>
                      {hasData && (
                        <span className="text-xs mt-0.5">
                          {verdicts[dateStr].theme.emoji}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-dark-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-dark-800" />
                  <span>데이터 있음</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-brand-500" />
                  <span>선택됨</span>
                </div>
              </div>
            </div>

            {/* Selected Day Detail or Stock History */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-dark-400">로딩 중...</p>
                  </div>
                </div>
              ) : selectedStock ? (
                // Stock History View with Price Info
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-lg font-bold text-dark-100">{selectedStock.name}</p>
                      <p className="text-sm text-dark-500">{selectedStock.symbol}</p>
                    </div>
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Current Price */}
                  {stockPrices[selectedStock.symbol] ? (
                    <div className="bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-xl p-4 mb-4">
                      <p className="text-xs text-dark-500 mb-1">현재가</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-dark-100">
                          {formatPrice(stockPrices[selectedStock.symbol].price)}원
                        </span>
                        <span className={`text-sm font-medium ${getReturnColor(stockPrices[selectedStock.symbol].changePercent)}`}>
                          {getReturnSign(stockPrices[selectedStock.symbol].changePercent)}
                          {stockPrices[selectedStock.symbol].changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ) : priceLoading ? (
                    <div className="bg-dark-800/50 rounded-xl p-4 mb-4 text-center">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : null}

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-brand-400">{selectedStock.totalDays}일</p>
                      <p className="text-xs text-dark-500 mt-1">총 추천 일수</p>
                    </div>
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{selectedStock.currentStreak}일</p>
                      <p className="text-xs text-dark-500 mt-1">연속 추천</p>
                    </div>
                  </div>

                  {/* Price Comparison */}
                  {stockPrices[selectedStock.symbol] && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* 첫 추천일 대비 */}
                      <div className="bg-dark-800/30 rounded-xl p-3">
                        <p className="text-xs text-dark-500 mb-1">첫 추천 대비</p>
                        {selectedStock.firstRecommendPrice && selectedStock.firstRecommendPrice > 0 ? (
                          <>
                            <p className="text-sm text-dark-400">
                              {formatPrice(selectedStock.firstRecommendPrice)}원
                            </p>
                            {(() => {
                              const returnPct = calculateReturn(
                                stockPrices[selectedStock.symbol].price,
                                selectedStock.firstRecommendPrice!
                              );
                              return returnPct !== null ? (
                                <p className={`text-lg font-bold ${getReturnColor(returnPct)}`}>
                                  {getReturnSign(returnPct)}{returnPct.toFixed(2)}%
                                </p>
                              ) : null;
                            })()}
                          </>
                        ) : (
                          <p className="text-sm text-dark-500 italic">
                            {selectedStock.firstRecommendDate}
                            <br />
                            <span className="text-xs">(가격 데이터 없음)</span>
                          </p>
                        )}
                      </div>
                      
                      {/* 평균 추천가 대비 */}
                      <div className="bg-dark-800/30 rounded-xl p-3">
                        <p className="text-xs text-dark-500 mb-1">평균 추천가 대비</p>
                        {selectedStock.avgRecommendPrice && selectedStock.avgRecommendPrice > 0 ? (
                          <>
                            <p className="text-sm text-dark-400">
                              {formatPrice(selectedStock.avgRecommendPrice)}원
                            </p>
                            {(() => {
                              const returnPct = calculateReturn(
                                stockPrices[selectedStock.symbol].price,
                                selectedStock.avgRecommendPrice!
                              );
                              return returnPct !== null ? (
                                <p className={`text-lg font-bold ${getReturnColor(returnPct)}`}>
                                  {getReturnSign(returnPct)}{returnPct.toFixed(2)}%
                                </p>
                              ) : null;
                            })()}
                          </>
                        ) : (
                          <p className="text-sm text-dark-500 italic">
                            {selectedStock.totalDays}회 추천
                            <br />
                            <span className="text-xs">(가격 데이터 없음)</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-dark-800/30 rounded-xl p-4 mb-4">
                    <p className="text-sm text-dark-500">첫 추천일</p>
                    <p className="text-lg font-bold text-dark-100">{selectedStock.firstRecommendDate}</p>
                  </div>

                  {/* Recommendation History */}
                  <div>
                    <p className="text-sm font-medium text-dark-400 mb-3">추천 이력</p>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                      {selectedStock.recommendations
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((rec) => {
                          const currentPrice = stockPrices[selectedStock.symbol]?.price;
                          const returnPct = rec.price && currentPrice ? calculateReturn(currentPrice, rec.price) : null;
                          
                          return (
                            <div
                              key={rec.date}
                              className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getRankBadge(rec.rank)}`}>
                                  {rec.rank}
                                </div>
                                <div>
                                  <span className="text-sm text-dark-200">{rec.date}</span>
                                  {rec.price && rec.price > 0 && (
                                    <p className="text-xs text-dark-500">{formatPrice(rec.price)}원</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold ${getScoreColor(rec.score)}`}>
                                  {rec.score.toFixed(1)}
                                </span>
                                {returnPct !== null && (
                                  <p className={`text-xs ${getReturnColor(returnPct)}`}>
                                    {getReturnSign(returnPct)}{returnPct.toFixed(1)}%
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : selectedVerdict ? (
                // Day Detail View
                <div>
                  {/* Date & Theme */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">{selectedVerdict.theme.emoji}</span>
                    <div>
                      <p className="text-lg font-bold text-dark-100">{selectedVerdict.date}</p>
                      <p className="text-sm text-dark-400">{selectedVerdict.theme.name}</p>
                    </div>
                  </div>

                  {/* Top 5 List */}
                  <div className="space-y-3">
                    {selectedVerdict.top5.map((stock) => {
                      const streakInfo = getStockStreakInfo(stock.symbol, selectedVerdict.date);
                      const isFirstDay = streakInfo?.firstDate === selectedVerdict.date;
                      
                      return (
                        <button
                          key={stock.symbol}
                          onClick={() => handleStockClick(stock.symbol)}
                          className="w-full flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getRankBadge(stock.rank)}`}>
                            {stock.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-dark-100 truncate">{stock.name}</p>
                              {isFirstDay && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded font-medium">
                                  NEW
                                </span>
                              )}
                              {streakInfo && streakInfo.streak > 1 && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded font-medium">
                                  🔥 {streakInfo.streak}일 연속
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-dark-500">
                              {stock.symbol}
                              {streakInfo && streakInfo.totalDays > 1 && (
                                <span className="ml-2 text-dark-600">
                                  · 총 {streakInfo.totalDays}회 추천
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getScoreColor(stock.avgScore)}`}>
                              {stock.avgScore.toFixed(1)}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>

                  {/* Info */}
                  <div className="mt-4 text-center">
                    <p className="text-xs text-dark-600">종목을 클릭하면 추천 이력과 수익률을 확인할 수 있습니다</p>
                  </div>

                  {/* Consensus */}
                  {selectedVerdict.consensusSummary && (
                    <div className="mt-6 p-4 bg-dark-800/30 rounded-xl">
                      <p className="text-sm text-dark-300 leading-relaxed">
                        🌟 오늘의 테마: {selectedVerdict.theme.name} | {selectedVerdict.top5.filter(s => s.isUnanimous).length}개 종목 만장일치. 1위 {selectedVerdict.top5[0]?.name}({selectedVerdict.top5[0]?.symbol}) 평균 {selectedVerdict.top5[0]?.avgScore.toFixed(1)}점
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl mb-4">📅</p>
                    <p className="text-dark-400">날짜를 선택하면</p>
                    <p className="text-dark-400">AI 추천을 확인할 수 있습니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
