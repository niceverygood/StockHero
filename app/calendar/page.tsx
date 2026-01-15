'use client';

import { useState, useEffect } from 'react';
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
}

interface DayVerdict {
  date: string;
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  consensusSummary: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [verdicts, setVerdicts] = useState<Record<string, DayVerdict>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchMonthVerdicts();
  }, [year, month]);

  const fetchMonthVerdicts = async () => {
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
      }
    } catch (error) {
      console.error('Failed to fetch verdicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // 빈 칸 채우기
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // 날짜 채우기
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
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const selectedVerdict = selectedDate ? verdicts[selectedDate] : null;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 4.0) return 'text-green-400';
    if (score >= 3.5) return 'text-yellow-400';
    return 'text-orange-400';
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

          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
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
                      onClick={() => hasData && setSelectedDate(dateStr)}
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

            {/* Selected Day Detail */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-dark-400">로딩 중...</p>
                  </div>
                </div>
              ) : selectedVerdict ? (
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
                    {selectedVerdict.top5.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          stock.rank === 1 ? 'bg-amber-500 text-black' :
                          stock.rank === 2 ? 'bg-slate-400 text-black' :
                          stock.rank === 3 ? 'bg-amber-700 text-white' :
                          'bg-dark-700 text-dark-300'
                        }`}>
                          {stock.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-dark-100 truncate">{stock.name}</p>
                          <p className="text-xs text-dark-500">{stock.symbol}</p>
                        </div>
                        <div className={`text-lg font-bold ${getScoreColor(stock.avgScore)}`}>
                          {stock.avgScore.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Consensus */}
                  {selectedVerdict.consensusSummary && (
                    <div className="mt-6 p-4 bg-dark-800/30 rounded-xl">
                      <p className="text-sm text-dark-300 leading-relaxed">
                        {selectedVerdict.consensusSummary}
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
