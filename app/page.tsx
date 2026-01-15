'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';

const AI_EMOJIS: Record<string, string> = {
  claude: '🔵',
  gemini: '🟣',
  gpt: '🟡',
};

interface Top5Item {
  rank: number;
  symbol: string;
  name: string;
  avgScore: number;
  claudeScore: number;
  geminiScore: number;
  gptScore: number;
  isUnanimous: boolean;
  reason?: string;
}

interface TodayVerdict {
  date: string;
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  consensusSummary: string;
}

export default function HomePage() {
  const [verdict, setVerdict] = useState<TodayVerdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDebating, setIsDebating] = useState(false);

  useEffect(() => {
    fetchTodayVerdict();
  }, []);

  const fetchTodayVerdict = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/verdict/today');
      const data = await res.json();
      if (data.success && data.verdict) {
        setVerdict(data.verdict);
      }
    } catch (error) {
      console.error('Failed to fetch verdict:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewVerdict = async () => {
    try {
      setIsDebating(true);
      const res = await fetch('/api/cron/daily-verdict?force=true');
      const data = await res.json();
      if (data.success) {
        await fetchTodayVerdict();
      }
    } catch (error) {
      console.error('Failed to generate verdict:', error);
    } finally {
      setIsDebating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 4.0) return 'text-green-400';
    if (score >= 3.5) return 'text-yellow-400';
    if (score >= 3.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-slate-400 to-slate-300 text-black';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700 to-amber-600 text-white';
    return 'bg-dark-700 text-dark-300';
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />
        <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />

        <div className="relative container-app">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/80 border border-dark-700 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-dark-300">3개 AI가 토론해서 선정</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
              <span className="text-dark-100">오늘의</span>{' '}
              <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">AI Top 5</span>
            </h1>
            
            <p className="text-dark-400 text-lg max-w-xl mx-auto">
              Claude, Gemini, GPT 세 AI가 실시간으로 분석하고 토론해서 선정한 종목입니다
            </p>
          </div>

          {/* AI Analysts Bar */}
          <div className="flex justify-center gap-4 mb-8">
            {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
              const char = CHARACTERS[charId];
              return (
                <div key={charId} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-900/80 border border-dark-800">
                  <div className={`w-8 h-8 rounded-lg ${char.bgColor} flex items-center justify-center`}>
                    <span className="text-lg">{AI_EMOJIS[charId]}</span>
                  </div>
                  <span className="text-sm text-dark-300 hidden sm:block">{char.name}</span>
                </div>
              );
            })}
          </div>

          {/* Loading / Debating State */}
          {(loading || isDebating) && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-8 text-center">
                <div className="flex justify-center gap-3 mb-6">
                  {(['claude', 'gemini', 'gpt'] as const).map((charId, i) => {
                    const char = CHARACTERS[charId];
                    return (
                      <div 
                        key={charId}
                        className={`w-12 h-12 rounded-xl ${char.bgColor} flex items-center justify-center animate-bounce`}
                        style={{ animationDelay: `${i * 0.2}s` }}
                      >
                        <span className="text-2xl">{AI_EMOJIS[charId]}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-dark-300 text-lg font-medium">
                  {isDebating ? 'AI들이 토론 중입니다...' : '데이터를 불러오는 중...'}
                </p>
                <p className="text-dark-500 text-sm mt-2">
                  {isDebating ? '잠시만 기다려주세요' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Today's Theme & Date */}
          {!loading && !isDebating && verdict && (
            <>
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-dark-900/80 border border-dark-800">
                  <span className="text-3xl">{verdict.theme.emoji}</span>
                  <div>
                    <p className="text-xs text-dark-500">오늘의 테마</p>
                    <p className="text-lg font-bold text-dark-100">{verdict.theme.name}</p>
                  </div>
                  <div className="w-px h-10 bg-dark-700 mx-2" />
                  <div>
                    <p className="text-xs text-dark-500">분석 날짜</p>
                    <p className="text-lg font-medium text-dark-300">{verdict.date}</p>
                  </div>
                </div>
              </div>

              {/* Top 5 List */}
              <div className="max-w-3xl mx-auto space-y-4">
                {verdict.top5.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5 hover:border-dark-700 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${getRankStyle(stock.rank)}`}>
                        {stock.rank}
                      </div>

                      {/* Stock Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-dark-50 truncate">{stock.name}</h3>
                          {stock.isUnanimous && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              만장일치
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-dark-500">{stock.symbol}</p>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">Claude</p>
                          <p className={`text-sm font-bold ${getScoreColor(stock.claudeScore)}`}>
                            {stock.claudeScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">Gemini</p>
                          <p className={`text-sm font-bold ${getScoreColor(stock.geminiScore)}`}>
                            {stock.geminiScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">GPT</p>
                          <p className={`text-sm font-bold ${getScoreColor(stock.gptScore)}`}>
                            {stock.gptScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="w-px h-10 bg-dark-700 mx-1" />
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">평균</p>
                          <p className={`text-lg font-bold ${getScoreColor(stock.avgScore)}`}>
                            {stock.avgScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consensus Summary */}
              <div className="max-w-3xl mx-auto mt-8">
                <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-dark-100 mb-3 flex items-center gap-2">
                    🤝 AI 합의 의견
                  </h3>
                  <p className="text-dark-300 leading-relaxed">{verdict.consensusSummary}</p>
                </div>
              </div>

              {/* Regenerate Button */}
              <div className="text-center mt-8">
                <button
                  onClick={generateNewVerdict}
                  disabled={isDebating}
                  className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  🔄 새로운 토론 시작하기
                </button>
              </div>
            </>
          )}

          {/* No Data State */}
          {!loading && !isDebating && !verdict && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-8 text-center">
                <p className="text-6xl mb-4">🤔</p>
                <h3 className="text-xl font-bold text-dark-100 mb-2">오늘의 추천이 없습니다</h3>
                <p className="text-dark-400 mb-6">AI들에게 토론을 요청해보세요!</p>
                <button
                  onClick={generateNewVerdict}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all"
                >
                  🎯 AI 토론 시작하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="relative mt-16 pt-8 border-t border-dark-800/50">
          <div className="container-app">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-dark-500">
                투자 자문이 아닌 엔터테인먼트 콘텐츠입니다
              </p>
              <p className="text-sm text-dark-600">
                © 2026 StockHero
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
