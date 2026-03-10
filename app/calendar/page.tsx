'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';

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
  reasons?: string[];
}

interface DayVerdict {
  date: string;
  slot?: 'morning' | 'afternoon';
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  consensusSummary: string;
}

interface VerdictDetailData {
  date: string;
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  claudeTop5: Array<{ rank: number; symbol: string; name: string; score: number; reason: string }>;
  geminiTop5: Array<{ rank: number; symbol: string; name: string; score: number; reason: string }>;
  gptTop5: Array<{ rank: number; symbol: string; name: string; score: number; reason: string }>;
  consensusSummary: string;
}

/** 날짜별 오전 8시 / 정오 추천 (둘 다 있을 수 있음) */
type DayVerdictsBySlot = Record<string, { morning?: DayVerdict; afternoon?: DayVerdict }>;

interface RecommendationRecord {
  date: string;
  slot?: 'morning' | 'afternoon';
  rank: number;
  score: number;
  price?: number;
  claudeScore: number;
  geminiScore: number;
  gptScore: number;
  isUnanimous: boolean;
  votedCount: number;
}

interface StockHistory {
  symbol: string;
  name: string;
  firstRecommendDate: string;
  firstRecommendPrice?: number;
  totalDays: number;
  currentStreak: number;
  recommendations: RecommendationRecord[];
  avgRecommendPrice?: number;
  unanimousDays: number;  // 만장일치 일수
  claudeVotes: number;    // Claude가 추천한 횟수
  geminiVotes: number;    // Gemini가 추천한 횟수
  gptVotes: number;       // GPT가 추천한 횟수
}

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  name?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const verdictCache = new Map<string, { data: DayVerdictsBySlot; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [verdicts, setVerdicts] = useState<DayVerdictsBySlot>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockHistory | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<VerdictDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        const verdictMap: DayVerdictsBySlot = {};
        data.verdicts.forEach((v: any) => {
          const slot = v.slot === 'afternoon' ? 'afternoon' : 'morning';
          if (!verdictMap[v.date]) verdictMap[v.date] = {};
          verdictMap[v.date][slot] = { ...v, slot };
        });
        setVerdicts(verdictMap);
        verdictCache.set(cacheKey, { data: verdictMap, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Failed to fetch verdicts:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // 종목별 추천 이력 분석 (오전 8시·정오 모두 반영)
  const stockHistories = useMemo(() => {
    const histories: Record<string, StockHistory> = {};
    const sortedDates = Object.keys(verdicts).sort();

    sortedDates.forEach(date => {
      const slots = verdicts[date];
      (['morning', 'afternoon'] as const).forEach(slotKey => {
        const verdict = slots[slotKey];
        if (!verdict?.top5) return;
        verdict.top5.forEach((stock: Top5Item) => {
          const stockPrice = stock.currentPrice ?? stock.price;
          const claudeScore = stock.claudeScore || 0;
          const geminiScore = stock.geminiScore || 0;
          const gptScore = stock.gptScore || 0;
          const votedCount = [claudeScore, geminiScore, gptScore].filter(s => s > 0).length;
          const isUnanimous = stock.isUnanimous || votedCount === 3;

          if (!histories[stock.symbol]) {
            histories[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name,
              firstRecommendDate: date,
              firstRecommendPrice: stockPrice,
              totalDays: 0,
              currentStreak: 0,
              recommendations: [],
              unanimousDays: 0,
              claudeVotes: 0,
              geminiVotes: 0,
              gptVotes: 0,
            };
          }

          histories[stock.symbol].totalDays++;
          if (isUnanimous) histories[stock.symbol].unanimousDays++;
          if (claudeScore > 0) histories[stock.symbol].claudeVotes++;
          if (geminiScore > 0) histories[stock.symbol].geminiVotes++;
          if (gptScore > 0) histories[stock.symbol].gptVotes++;

          histories[stock.symbol].recommendations.push({
            date,
            slot: slotKey,
            rank: stock.rank,
            score: stock.avgScore,
            price: stockPrice,
            claudeScore,
            geminiScore,
            gptScore,
            isUnanimous,
            votedCount,
          });
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

  // 날짜 클릭 시 상세 모달 열기
  const handleDateClick = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedStock(null);
    setShowDetailModal(true);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const res = await fetch(`/api/verdict?date=${dateStr}`);
      const data = await res.json();

      if (data.success && data.top5) {
        // verdict/today 형식으로도 시도
        const resDetail = await fetch(`/api/calendar/verdicts?year=${dateStr.slice(0, 4)}&month=${parseInt(dateStr.slice(5, 7))}`);
        const calData = await resDetail.json();
        const matchVerdict = calData.verdicts?.find((v: any) => v.date === dateStr);

        const dayOfWeek = new Date(dateStr + 'T00:00:00+09:00').getDay();
        const DAY_THEMES: Record<number, { name: string; emoji: string }> = {
          0: { name: '종합 밸런스', emoji: '⚖️' },
          1: { name: '성장주 포커스', emoji: '🚀' },
          2: { name: '배당 투자', emoji: '💰' },
          3: { name: '가치 투자', emoji: '💎' },
          4: { name: '테마 & 트렌드', emoji: '🔥' },
          5: { name: '블루칩', emoji: '🏆' },
          6: { name: '히든 젬', emoji: '🌟' },
        };

        setDetailData({
          date: dateStr,
          theme: matchVerdict?.theme || DAY_THEMES[dayOfWeek] || { name: '추천', emoji: '📊' },
          top5: data.top5.map((item: any) => ({
            rank: item.rank,
            symbol: item.symbol,
            name: item.name,
            avgScore: item.avgScore,
            claudeScore: item.claudeScore || 0,
            geminiScore: item.geminiScore || 0,
            gptScore: item.gptScore || 0,
            isUnanimous: item.unanimous || item.isUnanimous || false,
            currentPrice: item.currentPrice || 0,
            reasons: item.reasons || [],
          })),
          claudeTop5: [],  // 개별 AI top5는 별도 API 필요
          geminiTop5: [],
          gptTop5: [],
          consensusSummary: data.rationale || matchVerdict?.consensusSummary || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // 모달 닫기
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailData(null);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetailModal();
    };
    if (showDetailModal) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [showDetailModal]);

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

  const selectedSlots = selectedDate ? verdicts[selectedDate] : null;

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
                    className={`text-center text-sm font-medium py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-dark-500'
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
                  const daySlots = verdicts[dateStr];
                  const hasData = !!daySlots && (!!daySlots.morning || !!daySlots.afternoon);
                  const isSelected = selectedDate === dateStr;
                  const dayOfWeek = new Date(year, month, day).getDay();
                  const hasUnanimous = hasData && (
                    (daySlots.morning?.top5.some(stock => stock.isUnanimous)) ||
                    (daySlots.afternoon?.top5.some(stock => stock.isUnanimous))
                  );

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (hasData) {
                          handleDateClick(dateStr);
                        }
                      }}
                      disabled={!hasData}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${isSelected
                        ? 'bg-brand-500 text-white'
                        : hasUnanimous
                          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 hover:border-amber-400 cursor-pointer'
                          : hasData
                            ? 'bg-dark-800 hover:bg-dark-700 cursor-pointer'
                            : 'text-dark-600 cursor-default'
                        }`}
                    >
                      {/* 만장일치 표시 - 좌상단 별 */}
                      {hasUnanimous && !isSelected && (
                        <span className="absolute -top-1 -right-1 text-amber-400 text-xs animate-pulse">✨</span>
                      )}
                      <span className={`text-sm font-medium ${!isSelected && dayOfWeek === 0 ? 'text-red-400' :
                        !isSelected && dayOfWeek === 6 ? 'text-blue-400' :
                          !isSelected && hasUnanimous ? 'text-amber-300' : ''
                        }`}>
                        {day}
                      </span>
                      {hasData && (
                        <span className="text-xs mt-0.5">
                          {(verdicts[dateStr].morning ?? verdicts[dateStr].afternoon)?.theme.emoji}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-dark-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-dark-800" />
                  <span>데이터 있음</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/50" />
                  <span className="text-amber-400">✨ 만장일치</span>
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

                  {/* AI별 추천 통계 */}
                  <div className="bg-dark-800/30 rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-dark-400 mb-3">🤖 AI별 추천 현황</p>

                    {/* 상세 데이터 존재 여부 확인 */}
                    {(selectedStock.claudeVotes + selectedStock.geminiVotes + selectedStock.gptVotes) > 0 ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-full overflow-hidden ring-2 ring-purple-500/30">
                              <Image src={CHARACTERS.claude.image} alt="Claude" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-purple-400 text-lg font-bold">{selectedStock.claudeVotes}회</p>
                            <p className="text-xs text-dark-500">Claude</p>
                          </div>
                          <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-full overflow-hidden ring-2 ring-blue-500/30">
                              <Image src={CHARACTERS.gemini.image} alt="Gemini" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-blue-400 text-lg font-bold">{selectedStock.geminiVotes}회</p>
                            <p className="text-xs text-dark-500">Gemini</p>
                          </div>
                          <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-full overflow-hidden ring-2 ring-emerald-500/30">
                              <Image src={CHARACTERS.gpt.image} alt="GPT" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-emerald-400 text-lg font-bold">{selectedStock.gptVotes}회</p>
                            <p className="text-xs text-dark-500">GPT</p>
                          </div>
                        </div>
                        {/* 만장일치 정보 */}
                        <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400">✨</span>
                            <span className="text-sm text-dark-300">만장일치</span>
                          </div>
                          <span className="text-amber-400 font-bold">
                            {selectedStock.unanimousDays}회 / {selectedStock.totalDays}회
                            <span className="ml-1 text-xs text-dark-500">
                              ({selectedStock.totalDays > 0 ? Math.round((selectedStock.unanimousDays / selectedStock.totalDays) * 100) : 0}%)
                            </span>
                          </span>
                        </div>
                      </>
                    ) : (
                      /* 상세 데이터 없는 경우 */
                      <div className="text-center p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-xl">🔵</span>
                          <span className="text-xl">🟣</span>
                          <span className="text-xl">🟢</span>
                        </div>
                        <p className="text-dark-400 text-sm mb-1">AI 합산 추천</p>
                        <p className="text-2xl font-bold text-brand-400">{selectedStock.totalDays}회</p>
                        <p className="text-xs text-dark-600 mt-2">
                          * 이전 버전 데이터로 AI별 상세 통계가 없습니다<br />
                          새로 생성되는 데이터부터 상세 정보가 기록됩니다
                        </p>
                      </div>
                    )}
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
                    <p className="text-sm font-medium text-dark-400 mb-3">📜 추천 이력 상세</p>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                      {selectedStock.recommendations
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((rec) => {
                          const currentPrice = stockPrices[selectedStock.symbol]?.price;
                          const returnPct = rec.price && currentPrice ? calculateReturn(currentPrice, rec.price) : null;

                          // 개별 AI 점수가 있는지 확인
                          const hasDetailedScores = rec.claudeScore > 0 || rec.geminiScore > 0 || rec.gptScore > 0;

                          // 추천한 AI 개수 추정 (상세 점수 없는 경우)
                          const estimatedVoters = hasDetailedScores
                            ? rec.votedCount
                            : Math.max(1, Math.ceil(rec.score / 1.7)); // avgScore 기반 추정

                          return (
                            <div
                              key={rec.date}
                              className={`p-3 rounded-xl border ${rec.isUnanimous
                                ? 'bg-amber-500/5 border-amber-500/30'
                                : 'bg-dark-800/50 border-dark-700/50'
                                }`}
                            >
                              {/* 헤더: 날짜, 순위, 배지 */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getRankBadge(rec.rank)}`}>
                                    {rec.rank}
                                  </div>
                                  <span className="text-sm font-medium text-dark-200">{rec.date}</span>
                                  {rec.isUnanimous ? (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded font-bold">
                                      ✨ 만장일치
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-dark-700 text-dark-400 rounded">
                                      {hasDetailedScores ? `${rec.votedCount}/3 추천` : `추정 ${estimatedVoters}/3`}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${getScoreColor(rec.score)}`}>
                                    {rec.score.toFixed(1)}
                                  </span>
                                  {returnPct !== null && (
                                    <span className={`ml-2 text-xs ${getReturnColor(returnPct)}`}>
                                      {getReturnSign(returnPct)}{returnPct.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* AI별 점수 - 상세 데이터가 있을 때만 */}
                              {hasDetailedScores ? (
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg ${rec.claudeScore > 0
                                    ? 'bg-purple-500/20 border border-purple-500/30'
                                    : 'bg-dark-800/50 border border-dark-700/30'
                                    }`}>
                                    <div className="w-5 h-5 rounded-full overflow-hidden">
                                      <Image src={CHARACTERS.claude.image} alt="Claude" width={20} height={20} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-xs font-bold ${rec.claudeScore > 0 ? 'text-purple-400' : 'text-dark-600'
                                      }`}>
                                      {rec.claudeScore > 0 ? rec.claudeScore.toFixed(1) : '-'}
                                    </span>
                                  </div>
                                  <div className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg ${rec.geminiScore > 0
                                    ? 'bg-blue-500/20 border border-blue-500/30'
                                    : 'bg-dark-800/50 border border-dark-700/30'
                                    }`}>
                                    <div className="w-5 h-5 rounded-full overflow-hidden">
                                      <Image src={CHARACTERS.gemini.image} alt="Gemini" width={20} height={20} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-xs font-bold ${rec.geminiScore > 0 ? 'text-blue-400' : 'text-dark-600'
                                      }`}>
                                      {rec.geminiScore > 0 ? rec.geminiScore.toFixed(1) : '-'}
                                    </span>
                                  </div>
                                  <div className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg ${rec.gptScore > 0
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : 'bg-dark-800/50 border border-dark-700/30'
                                    }`}>
                                    <div className="w-5 h-5 rounded-full overflow-hidden">
                                      <Image src={CHARACTERS.gpt.image} alt="GPT" width={20} height={20} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-xs font-bold ${rec.gptScore > 0 ? 'text-emerald-400' : 'text-dark-600'
                                      }`}>
                                      {rec.gptScore > 0 ? rec.gptScore.toFixed(1) : '-'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* 상세 데이터 없는 경우 - 요약 정보 표시 */
                                <div className="bg-dark-800/30 rounded-lg p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">🔵</span>
                                      <span className="text-xs">🟣</span>
                                      <span className="text-xs">🟢</span>
                                      <span className="text-xs text-dark-500 ml-1">AI 합산</span>
                                    </div>
                                    <div className="text-right">
                                      <span className={`text-sm font-bold ${getScoreColor(rec.score)}`}>
                                        {rec.score.toFixed(1)}점
                                      </span>
                                      <span className="text-xs text-dark-600 ml-1">평균</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-dark-600 mt-1">
                                    * 이전 버전 데이터로 AI별 상세 점수가 없습니다
                                  </p>
                                </div>
                              )}

                              {/* 가격 정보 */}
                              {rec.price && rec.price > 0 && (
                                <div className="mt-2 pt-2 border-t border-dark-700/30 flex items-center justify-between text-xs text-dark-500">
                                  <span>당시 가격</span>
                                  <span>{formatPrice(rec.price)}원</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : selectedSlots && selectedDate ? (
                // Day Detail View (오전 8시 / 정오 두 시점 표시)
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{(selectedSlots.morning ?? selectedSlots.afternoon)?.theme.emoji ?? '📊'}</span>
                    <div>
                      <p className="text-lg font-bold text-dark-100">{selectedDate}</p>
                      <p className="text-sm text-dark-400">{(selectedSlots.morning ?? selectedSlots.afternoon)?.theme.name}</p>
                    </div>
                  </div>

                  {(['morning', 'afternoon'] as const).map((slotKey) => {
                    const v = selectedSlots[slotKey];
                    if (!v?.top5?.length) return null;
                    const slotLabel = slotKey === 'morning' ? '🌅 오전 8시 추천' : '🌆 오후 4시 추천';
                    return (
                      <div key={slotKey} className="mb-6">
                        <p className="text-sm font-medium text-dark-400 mb-2">{slotLabel}</p>
                        <div className="space-y-2">
                          {v.top5.map((stock) => {
                            const streakInfo = getStockStreakInfo(stock.symbol, v.date);
                            const isFirstDay = streakInfo?.firstDate === v.date;
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
                                      <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded font-medium">NEW</span>
                                    )}
                                    {streakInfo && streakInfo.streak > 1 && (
                                      <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded font-medium">🔥 {streakInfo.streak}일</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-dark-500">
                                    {stock.symbol}
                                    {streakInfo && streakInfo.totalDays > 1 && (
                                      <span className="ml-2 text-dark-600">· 총 {streakInfo.totalDays}회 추천</span>
                                    )}
                                  </p>
                                </div>
                                <div className={`text-lg font-bold ${getScoreColor(stock.avgScore)}`}>{stock.avgScore.toFixed(1)}</div>
                                <svg className="w-4 h-4 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            );
                          })}
                        </div>
                        {v.consensusSummary && (
                          <p className="mt-2 text-xs text-dark-500 leading-relaxed">{v.consensusSummary}</p>
                        )}
                      </div>
                    );
                  })}

                  <div className="mt-4 text-center">
                    <p className="text-xs text-dark-600">종목을 클릭하면 추천 이력과 수익률을 확인할 수 있습니다</p>
                  </div>
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

        {/* Date Detail Modal */}
        {showDetailModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeDetailModal}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-800 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{detailData?.theme?.emoji || '📊'}</span>
                    <div>
                      <p className="text-lg font-bold text-dark-100">
                        {selectedDate && new Date(selectedDate + 'T00:00:00+09:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      <p className="text-sm text-dark-400">{detailData?.theme?.name || '로딩 중...'}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className="p-2 hover:bg-dark-800 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-dark-400">AI 분석 데이터 로딩 중...</p>
                  </div>
                ) : detailData ? (
                  <div className="space-y-4">
                    {/* Top 5 List */}
                    {detailData.top5.map((stock) => {
                      const streakInfo = getStockStreakInfo(stock.symbol, detailData.date);

                      return (
                        <div
                          key={stock.symbol}
                          className={`p-4 rounded-xl border transition-all ${stock.isUnanimous
                            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
                            : 'bg-dark-800/60 border-dark-700/50 hover:border-dark-600'
                            }`}
                        >
                          {/* Stock Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${getRankBadge(stock.rank)}`}>
                              {stock.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-dark-100 truncate">{stock.name}</p>
                                {stock.isUnanimous && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full font-bold">✨ 만장일치</span>
                                )}
                                {streakInfo && streakInfo.streak > 1 && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full font-medium">🔥 {streakInfo.streak}일 연속</span>
                                )}
                              </div>
                              <p className="text-xs text-dark-500">
                                {stock.symbol}
                                {(stock.currentPrice ?? 0) > 0 && ` · ${(stock.currentPrice ?? 0).toLocaleString()}원`}
                              </p>
                            </div>
                            <div className={`text-xl font-bold ${getScoreColor(stock.avgScore)}`}>
                              {stock.avgScore.toFixed(1)}
                            </div>
                          </div>

                          {/* AI Individual Scores */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* Claude */}
                            <div className={`flex items-center gap-2 p-2 rounded-lg ${stock.claudeScore > 0
                              ? 'bg-purple-500/15 border border-purple-500/25'
                              : 'bg-dark-800/40 border border-dark-700/30'
                              }`}>
                              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                <Image src={CHARACTERS.claude.image} alt="Claude" width={24} height={24} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-bold ${stock.claudeScore > 0 ? 'text-purple-400' : 'text-dark-600'}`}>
                                  {stock.claudeScore > 0 ? stock.claudeScore.toFixed(1) : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Gemini */}
                            <div className={`flex items-center gap-2 p-2 rounded-lg ${stock.geminiScore > 0
                              ? 'bg-blue-500/15 border border-blue-500/25'
                              : 'bg-dark-800/40 border border-dark-700/30'
                              }`}>
                              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                <Image src={CHARACTERS.gemini.image} alt="Gemini" width={24} height={24} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-bold ${stock.geminiScore > 0 ? 'text-blue-400' : 'text-dark-600'}`}>
                                  {stock.geminiScore > 0 ? stock.geminiScore.toFixed(1) : '-'}
                                </p>
                              </div>
                            </div>

                            {/* GPT */}
                            <div className={`flex items-center gap-2 p-2 rounded-lg ${stock.gptScore > 0
                              ? 'bg-emerald-500/15 border border-emerald-500/25'
                              : 'bg-dark-800/40 border border-dark-700/30'
                              }`}>
                              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                <Image src={CHARACTERS.gpt.image} alt="GPT" width={24} height={24} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-bold ${stock.gptScore > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                                  {stock.gptScore > 0 ? stock.gptScore.toFixed(1) : '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Reasons */}
                          {stock.reasons && stock.reasons.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {stock.reasons.map((reason, i) => (
                                <p key={i} className="text-xs text-dark-400 leading-relaxed">💬 {reason}</p>
                              ))}
                            </div>
                          )}

                          {/* Stock history link button */}
                          <button
                            onClick={() => {
                              handleStockClick(stock.symbol);
                              closeDetailModal();
                            }}
                            className="mt-3 w-full text-center text-xs text-brand-400 hover:text-brand-300 py-1.5 rounded-lg hover:bg-brand-500/10 transition-colors"
                          >
                            📜 추천 이력 보기 →
                          </button>
                        </div>
                      );
                    })}

                    {/* Consensus Summary */}
                    {detailData.consensusSummary && (
                      <div className="p-4 bg-dark-800/40 rounded-xl border border-dark-700/50">
                        <p className="text-sm font-medium text-dark-300 mb-2">🤝 AI 합의 의견</p>
                        <p className="text-xs text-dark-400 leading-relaxed whitespace-pre-line">
                          {detailData.consensusSummary}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-5xl mb-4">📭</p>
                    <p className="text-dark-400">해당 날짜의 분석 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
