'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Header } from '@/components';
import { CHARACTERS, type CharacterInfo } from '@/lib/characters';
import { CharacterDetailModal } from '@/components/CharacterDetailModal';
import { PerformanceTeaser } from '@/components/PerformanceTeaser';
import { useCurrentPlan, useSubscription } from '@/lib/subscription/hooks';
import { SparklesIcon, X, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Calendar } from '@/components';
import { MarketSentiment } from '@/components/MarketSentiment';

const AI_EMOJIS: Record<string, string> = {
  claude: '🔵',
  gemini: '🟣',
  gpt: '🟢',
};

interface AITop5Item {
  rank: number;
  symbol: string;
  name: string;
  score: number;
  reason: string;
}

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
  reasons?: string[];
}

interface AIReasons {
  [symbol: string]: {
    claude: string | null;
    gemini: string | null;
    gpt: string | null;
  };
}

interface TodayVerdict {
  date: string;
  theme: { name: string; emoji: string };
  top5: Top5Item[];
  consensusSummary: string;
  aiReasons?: AIReasons;
  claudeTop5?: AITop5Item[];
  geminiTop5?: AITop5Item[];
  gptTop5?: AITop5Item[];
}

export default function HomePage() {
  const [verdict, setVerdict] = useState<TodayVerdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterInfo | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Top5Item | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);

  // 모달 열기/닫기 with history (안드로이드 뒤로가기 지원)
  const openStockModal = useCallback((stock: Top5Item) => {
    setSelectedStock(stock);
    setShowStockModal(true);
    window.history.pushState({ modal: 'stock' }, '');
  }, []);

  const closeStockModal = useCallback(() => {
    setShowStockModal(false);
    setSelectedStock(null);
  }, []);

  const openCharacterModal = useCallback((char: CharacterInfo) => {
    setSelectedCharacter(char);
    setShowCharacterModal(true);
    window.history.pushState({ modal: 'character' }, '');
  }, []);

  const closeCharacterModal = useCallback(() => {
    setShowCharacterModal(false);
    setSelectedCharacter(null);
  }, []);

  // 안드로이드 뒤로가기 핸들러
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showStockModal) {
        setShowStockModal(false);
        setSelectedStock(null);
      } else if (showCharacterModal) {
        setShowCharacterModal(false);
        setSelectedCharacter(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showStockModal, showCharacterModal]);
  const [marketBuyWeight, setMarketBuyWeight] = useState<number | null>(null);
  const [marketScore, setMarketScore] = useState<number | null>(null);

  // 구독 정보
  const { isPremium } = useCurrentPlan();
  const { openUpgradeModal } = useSubscription();

  useEffect(() => {
    fetchTodayVerdict();
    fetchMarketSentiment();
  }, []);

  const fetchMarketSentiment = async () => {
    try {
      const res = await fetch('/api/market/sentiment');
      const data = await res.json();
      if (data.success && data.data) {
        setMarketBuyWeight(data.data.adjustment.buyWeight);
        setMarketScore(data.data.compositeScore);
      }
    } catch (e) {
      console.error('Failed to fetch market sentiment:', e);
    }
  };

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

  // 투자 판정 함수
  const getInvestmentVerdict = (weightedScore: number) => {
    if (weightedScore >= 3.5) return { label: '적극 매수', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
    if (weightedScore >= 2.5) return { label: '분할 매수', emoji: '🔵', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
    if (weightedScore >= 1.5) return { label: '관망', emoji: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
    return { label: '매수 금지', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
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

          {/* AI 3대장 소개 카드 */}
          <div className="max-w-4xl mx-auto mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                const char = CHARACTERS[charId];
                return (
                  <button
                    key={charId}
                    onClick={() => openCharacterModal(char)}
                    className={`relative group p-4 rounded-2xl border ${char.borderColor} ${char.bgColor} hover:scale-[1.02] transition-all text-left`}
                  >
                    {/* Character Avatar & Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-14 h-14 rounded-xl overflow-hidden ring-2 ${char.borderColor} group-hover:ring-4 transition-all`}>
                        <Image
                          src={char.image}
                          alt={char.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold ${char.color}`}>{char.nameKo}</h3>
                        <p className="text-dark-400 text-xs">{char.name}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <p className="text-dark-300 text-sm mb-3">{char.roleKo}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {char.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs rounded-full ${char.bgColor} border ${char.borderColor} ${char.color}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-dark-800/50">
                      <div>
                        <p className={`text-lg font-bold ${char.color}`}>{char.accuracy}%</p>
                        <p className="text-xs text-dark-500">적중률</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-dark-400">{char.totalAnalyses.toLocaleString()}</p>
                        <p className="text-xs text-dark-500">총 분석</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs ${char.bgColor} border ${char.borderColor} ${char.color} rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <SparklesIcon className="w-3 h-3" />
                        세계관
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
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
                  데이터를 불러오는 중...
                </p>
              </div>
            </div>
          )}

          {/* Today's Theme & Date */}
          {!loading && verdict && (
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

              {/* Performance Teaser for Free Users */}
              {!isPremium && (
                <div className="max-w-3xl mx-auto mb-6">
                  <PerformanceTeaser
                    monthlyReturn={15.2}
                    topStockName={verdict.top5[0]?.name}
                    onUpgradeClick={() => openUpgradeModal('backtest', '백테스트 성과를 확인하려면 Pro 플랜이 필요합니다')}
                  />
                </div>
              )}

              {/* Market Timing Signal */}
              <div className="max-w-3xl mx-auto mb-8">
                <MarketSentiment />
              </div>

              {/* Top 5 List */}
              <div className="max-w-3xl mx-auto space-y-4">
                {verdict.top5.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => openStockModal(stock)}
                    className="w-full bg-dark-900/80 border border-dark-800 rounded-2xl p-4 sm:p-5 hover:border-brand-500/50 hover:bg-dark-800/80 transition-all group text-left"
                  >
                    {/* 모바일: 2줄 레이아웃, PC: 1줄 */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Row 1: 랭크 + 종목명 + 뱃지 */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 ${getRankStyle(stock.rank)}`}>
                          {stock.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-dark-50 truncate">{stock.name}</h3>
                            {stock.isUnanimous && (
                              <span className="px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 whitespace-nowrap">
                                만장일치
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-dark-500">{stock.symbol}</p>
                        </div>
                      </div>

                      {/* Row 2: Scores */}
                      <div className="flex items-center gap-2 sm:gap-3 ml-[52px] sm:ml-0">
                        <div className="text-center min-w-[36px]">
                          <p className="text-[10px] sm:text-xs text-dark-500 mb-0.5">Claude</p>
                          <p className={`text-xs sm:text-sm font-bold ${stock.claudeScore > 0 ? getScoreColor(stock.claudeScore) : 'text-dark-600'}`}>
                            {stock.claudeScore > 0 ? stock.claudeScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="text-center min-w-[36px]">
                          <p className="text-[10px] sm:text-xs text-dark-500 mb-0.5">Gemini</p>
                          <p className={`text-xs sm:text-sm font-bold ${stock.geminiScore > 0 ? getScoreColor(stock.geminiScore) : 'text-dark-600'}`}>
                            {stock.geminiScore > 0 ? stock.geminiScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="text-center min-w-[36px]">
                          <p className="text-[10px] sm:text-xs text-dark-500 mb-0.5">GPT</p>
                          <p className={`text-xs sm:text-sm font-bold ${stock.gptScore > 0 ? getScoreColor(stock.gptScore) : 'text-dark-600'}`}>
                            {stock.gptScore > 0 ? stock.gptScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="w-px h-8 sm:h-10 bg-dark-700" />
                        <div className="text-center" title="3개 AI의 추천 점수 평균">
                          <p className="text-[10px] sm:text-xs text-dark-500 mb-0.5">평균</p>
                          <p className={`text-base sm:text-lg font-bold ${getScoreColor(stock.avgScore)}`}>
                            {stock.avgScore.toFixed(1)}
                          </p>
                        </div>
                        {marketBuyWeight !== null && (() => {
                          const wScore = stock.avgScore * marketBuyWeight;
                          const verdict = getInvestmentVerdict(wScore);
                          return (
                            <>
                              <div className="w-px h-8 sm:h-10 bg-dark-700" />
                              <div
                                className="text-center cursor-help"
                                title={`평균 ${stock.avgScore.toFixed(1)} × ${(marketBuyWeight * 100).toFixed(0)}% = ${wScore.toFixed(1)} → ${verdict.label}`}
                              >
                                <p className="text-[9px] sm:text-[10px] text-brand-400/70 mb-0.5 whitespace-nowrap">가중 매수</p>
                                <p className={`text-base sm:text-lg font-black ${(() => {
                                  if (wScore >= 3.5) return 'text-emerald-400';
                                  if (wScore >= 2.5) return 'text-yellow-400';
                                  if (wScore >= 1.5) return 'text-orange-400';
                                  return 'text-red-400';
                                })()}`}>
                                  {wScore.toFixed(1)}
                                </p>
                                <p className={`text-[8px] sm:text-[9px] font-bold mt-0.5 ${verdict.color}`}>{verdict.emoji} {verdict.label}</p>
                              </div>
                            </>
                          );
                        })()}
                        {/* Click indicator - only on desktop */}
                        <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                          <TrendingUp className="w-5 h-5 text-brand-400" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <div className="max-w-3xl mx-auto mt-10">
                <h2 className="text-xl font-bold text-dark-100 mb-4 flex items-center gap-2">
                  📅 일별 추천 달력
                </h2>
                <Calendar />
              </div>

              {/* Consensus Summary */}
              <div className="max-w-3xl mx-auto mt-8">
                <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
                    🤝 AI 합의 의견
                  </h3>
                  <div className="text-dark-300 leading-relaxed whitespace-pre-line">{verdict.consensusSummary}</div>

                  {/* 각 종목별 간단 요약 */}
                  <div className="mt-6 pt-4 border-t border-dark-700 space-y-3">
                    <h4 className="text-sm font-medium text-dark-400 mb-3">📋 종목별 AI 평가 요약</h4>
                    {verdict.top5.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => {
                          setSelectedStock(stock);
                          setShowStockModal(true);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-800/50 hover:bg-dark-700/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(stock.rank)}`}>
                            {stock.rank}
                          </span>
                          <span className="text-dark-200 font-medium">{stock.name}</span>
                          {stock.isUnanimous ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> 만장일치
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <AlertCircle className="w-3 h-3" /> 의견 차이
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`${stock.claudeScore > 0 ? 'text-purple-400' : 'text-dark-600'}`}>
                            🔵 {stock.claudeScore > 0 ? stock.claudeScore.toFixed(1) : '미선정'}
                          </span>
                          <span className={`${stock.geminiScore > 0 ? 'text-blue-400' : 'text-dark-600'}`}>
                            🟣 {stock.geminiScore > 0 ? stock.geminiScore.toFixed(1) : '미선정'}
                          </span>
                          <span className={`${stock.gptScore > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                            🟢 {stock.gptScore > 0 ? stock.gptScore.toFixed(1) : '미선정'}
                          </span>
                          <span className="text-dark-500 group-hover:text-brand-400 transition-colors ml-2">
                            상세보기 →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No Data State */}
          {!loading && !verdict && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-8 text-center">
                <p className="text-6xl mb-4">🤔</p>
                <h3 className="text-xl font-bold text-dark-100 mb-2">오늘의 추천이 없습니다</h3>
                <p className="text-dark-400">잠시 후 다시 확인해주세요</p>
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

      {/* Character Detail Modal */}
      {selectedCharacter && (
        <CharacterDetailModal
          character={selectedCharacter}
          isOpen={showCharacterModal}
          onClose={closeCharacterModal}
        />
      )}

      {/* Stock Detail Modal */}
      {showStockModal && selectedStock && verdict && (
        <StockDetailModal
          stock={selectedStock}
          verdict={verdict}
          onClose={closeStockModal}
        />
      )}
    </>
  );
}

// 종목 상세 모달 컴포넌트
function StockDetailModal({
  stock,
  verdict,
  onClose,
}: {
  stock: Top5Item;
  verdict: TodayVerdict;
  onClose: () => void;
}) {
  const [debateRounds, setDebateRounds] = useState<any[]>([]);
  const [debateLoading, setDebateLoading] = useState(false);

  // 각 AI별 의견 찾기
  const claudeItem = verdict.claudeTop5?.find(c => c.symbol === stock.symbol);
  const geminiItem = verdict.geminiTop5?.find(g => g.symbol === stock.symbol);
  const gptItem = verdict.gptTop5?.find(g => g.symbol === stock.symbol);

  // 점수별 분석 내용 생성 (fallback)
  const generateAnalysis = (aiId: string, score: number, name: string) => {
    const stockName = stock.name;
    if (aiId === 'claude') {
      if (score >= 4) return `제 분석으로는 ${stockName}의 펀더멘털이 매우 견고합니다. ${score}점을 부여했습니다. 재무 건전성과 수익성이 우수한 기업으로, 밸류에이션 관점에서 강력 추천합니다.`;
      if (score >= 3) return `${stockName}은 펀더멘털이 양호합니다. ${score}점을 부여했습니다. 경쟁력은 있으나 밸류에이션이 다소 부담될 수 있습니다.`;
      if (score >= 1) return `${stockName}은 펀더멘털은 괜찮지만, 다른 종목 대비 매력도가 떨어집니다. ${score}점으로 하위 순위에 배치했습니다.`;
      return `${stockName}은 현재 밸류에이션 부담이 있어 이번 추천에서는 제외했습니다. PER과 PBR 기준으로 다른 종목이 더 매력적입니다.`;
    }
    if (aiId === 'gemini') {
      if (score >= 4) return `솔직히 ${stockName}의 성장 잠재력은 현재 주가에 충분히 반영되지 않았다고 봅니다. ${score}점 부여! This is THE play!`;
      if (score >= 3) return `${stockName}은 성장 가능성이 있습니다. ${score}점을 줬습니다. 기회가 있지만 확실한 카탈리스트가 필요합니다.`;
      if (score >= 1) return `${stockName}은 솔직히 제 Top pick은 아닙니다. ${score}점으로 하위 순위에 넣었어요. Not my favorite play.`;
      return `${stockName}보다 성장 잠재력이 더 높은 종목들이 있습니다. This is NOT the play right now.`;
    }
    // gpt
    if (score >= 4) return `내 40년 경험에 비추어 보면, ${stockName}은 거시경제 환경을 고려해도 훌륭한 투자처입니다. ${score}점을 부여합니다. 리스크 대비 기대 수익률이 매우 양호합니다.`;
    if (score >= 3) return `${stockName}은 투자 가치가 있다고 봅니다. ${score}점입니다. 다만 거시 리스크 요인을 모니터링해야 합니다.`;
    if (score >= 1) return `${stockName}에 대해서는 솔직히 확신이 부족합니다. ${score}점으로 하위 순위에 배치했습니다. 리스크 대비 수익률이 다른 종목만 못합니다.`;
    return `현재 금리 수준과 경기 사이클을 감안하면, ${stockName}에 대해서는 신중한 접근이 필요합니다. 살아남아야 게임을 계속할 수 있어.`;
  };

  // AI별 분석 정보
  const aiAnalysis = [
    {
      id: 'claude',
      name: '클로드 리',
      emoji: '🔵',
      score: stock.claudeScore,
      reason: claudeItem?.reason || verdict.aiReasons?.[stock.symbol]?.claude || generateAnalysis('claude', stock.claudeScore, stock.name),
      character: CHARACTERS.claude,
      selected: stock.claudeScore > 0,
    },
    {
      id: 'gemini',
      name: '제미 나인',
      emoji: '🟣',
      score: stock.geminiScore,
      reason: geminiItem?.reason || verdict.aiReasons?.[stock.symbol]?.gemini || generateAnalysis('gemini', stock.geminiScore, stock.name),
      character: CHARACTERS.gemini,
      selected: stock.geminiScore > 0,
    },
    {
      id: 'gpt',
      name: '지피 테일러',
      emoji: '🟢',
      score: stock.gptScore,
      reason: gptItem?.reason || verdict.aiReasons?.[stock.symbol]?.gpt || generateAnalysis('gpt', stock.gptScore, stock.name),
      character: CHARACTERS.gpt,
      selected: stock.gptScore > 0,
    },
  ];

  // 토론 데이터 가져오기
  useEffect(() => {
    const fetchDebate = async () => {
      setDebateLoading(true);
      try {
        const res = await fetch(`/api/debate/history?symbol=${stock.symbol}&date=${verdict.date}`);
        const data = await res.json();
        if (data.success && data.data?.rounds) {
          setDebateRounds(data.data.rounds);
        }
      } catch (e) {
        console.error('debate fetch error', e);
      } finally {
        setDebateLoading(false);
      }
    };
    fetchDebate();
  }, [stock.symbol, verdict.date]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 4.0) return 'text-green-400';
    if (score >= 3.5) return 'text-yellow-400';
    if (score >= 3.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 4.0) return 'bg-green-500/20 border-green-500/30';
    if (score >= 3.5) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 3.0) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 3) return { label: `추천 (${score.toFixed(1)}점)`, style: getScoreBg(score), text: getScoreColor(score) };
    if (score >= 1) return { label: `하위순위 (${score.toFixed(1)}점)`, style: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400' };
    return { label: '미선정', style: 'bg-dark-700 border-dark-600', text: 'text-dark-400' };
  };

  // 모달 닫을 때 history.back()도 호출
  const handleClose = useCallback(() => {
    onClose();
    // popstate에서 이미 닫힌 경우가 아닌 경우에만 back
    if (window.history.state?.modal) {
      window.history.back();
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal - 모바일에서는 풀스크린에 가깝게 */}
      <div className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-dark-900 border-b border-dark-800 p-4 sm:p-6">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-dark-800/80 hover:bg-dark-700 transition-colors z-10"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>

            <div className="flex items-center gap-3 sm:gap-4 pr-10">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 ${stock.rank === 1 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black' :
                stock.rank === 2 ? 'bg-gradient-to-r from-slate-400 to-slate-300 text-black' :
                  stock.rank === 3 ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white' :
                    'bg-dark-700 text-dark-300'
                }`}>
                {stock.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-dark-50 truncate">{stock.name}</h2>
                <p className="text-dark-400 text-sm">{stock.symbol}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm text-dark-500">평균 점수</p>
                <p className={`text-2xl sm:text-3xl font-bold ${getScoreColor(stock.avgScore)}`}>
                  {stock.avgScore.toFixed(1)}
                </p>
              </div>
            </div>

            {/* 만장일치 여부 */}
            <div className="mt-3 sm:mt-4">
              {stock.isUnanimous ? (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-medium text-sm whitespace-nowrap">만장일치!</span>
                  <span className="text-emerald-300/70 text-xs sm:text-sm">3명의 AI 모두 이 종목을 Top 5에 선정했습니다</span>
                </div>
              ) : (
                <div className="flex items-start sm:items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-amber-400 font-medium text-sm whitespace-nowrap">의견 차이</span>
                    <span className="text-amber-300/70 text-xs sm:text-sm">
                      {aiAnalysis.filter(a => a.score < 3).map(a => a.name).join(', ')}은(는) 다른 종목을 더 선호했습니다
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI 의견 목록 */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-dark-100 mb-3 sm:mb-4">🤖 각 AI의 분석 의견</h3>

            {aiAnalysis.map((ai) => {
              const badge = getScoreBadge(ai.score);
              return (
                <div
                  key={ai.id}
                  className={`p-4 sm:p-5 rounded-2xl border ${ai.score >= 3
                    ? `${ai.character.bgColor} ${ai.character.borderColor}`
                    : ai.score >= 1
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-dark-800/50 border-dark-700'
                    }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* AI 아바타 */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ${ai.character.borderColor} flex-shrink-0`}>
                      <Image
                        src={ai.character.image}
                        alt={ai.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 의견 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                        <span className={`font-bold text-sm sm:text-base ${ai.character.color} whitespace-nowrap`}>{ai.name}</span>
                        <span className="text-dark-500 text-xs sm:text-sm whitespace-nowrap">{ai.character.roleKo}</span>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold border whitespace-nowrap ${badge.style} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-dark-300 text-sm sm:text-base leading-relaxed">{ai.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 토론 라운드 - 채팅 스타일 */}
            <div className="mt-6">
              <h3 className="text-base sm:text-lg font-bold text-dark-100 mb-4">🎙️ AI 토론 과정</h3>
              {debateLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-dark-400">토론 내용 로딩 중...</span>
                </div>
              ) : debateRounds.length > 0 ? (
                <DebateChat rounds={debateRounds} stock={stock} getScoreBadge={getScoreBadge} />
              ) : (
                <p className="text-sm text-dark-500 text-center py-4">토론 데이터를 불러올 수 없습니다.</p>
              )}
            </div>

            {/* 추가 정보 */}
            <div className="mt-6 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
              <h4 className="text-sm font-medium text-dark-400 mb-2">📊 점수 산정 & 투자 판정 기준</h4>
              <p className="text-dark-500 text-sm leading-relaxed mb-3">
                각 AI가 해당 종목을 Top 5에 선정하면 순위에 따라 5.0~1.0점이 부여됩니다.
                3점 이상은 적극 추천, 1~2점은 하위 순위, 0점은 미선정입니다.
                가중 매수 점수 = AI 평균 점수 × 시장 보정 계수.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 3.5+ 적극 매수</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">🔵 2.5+ 분할 매수</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">🟡 1.5+ 관망</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">🔴 1.5↓ 매수 금지</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// === 채팅 스타일 토론 컴포넌트 ===
function DebateChat({ rounds, stock, getScoreBadge }: {
  rounds: any[];
  stock: Top5Item;
  getScoreBadge: (score: number) => { label: string; style: string; text: string };
}) {
  // 모든 메시지를 순서대로 펼침 (round 정보 포함)
  const allMessages = rounds.flatMap((round: any) =>
    round.messages.map((msg: any, mi: number) => ({
      ...msg,
      roundNum: round.round,
      roundTitle: round.round === 1 ? '초기 분석' : round.round === 2 ? '의견 조율' : '최종 합의',
      isFirstInRound: mi === 0,
      isLastInRound: mi === round.messages.length - 1,
    }))
  );

  // 현재까지 보여줄 메시지 인덱스
  const [visibleCount, setVisibleCount] = useState(0);
  // 현재 타이핑 중인 메시지 인덱스 (-1이면 없음)
  const [typingIndex, setTypingIndex] = useState(-1);
  // 타이핑 중인 텍스트 길이
  const [typedLength, setTypedLength] = useState(0);
  // 라운드 끝에서 다음 버튼 대기 중
  const [waitingForNext, setWaitingForNext] = useState(false);
  // 채팅 영역 ref
  const chatRef = useRef<HTMLDivElement>(null);
  // 타이머 ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleCount, typedLength, waitingForNext]);

  // 첫 메시지 자동 시작
  useEffect(() => {
    if (allMessages.length > 0 && visibleCount === 0 && typingIndex === -1) {
      startTyping(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages.length]);

  const startTyping = (idx: number) => {
    if (idx >= allMessages.length) return;
    setTypingIndex(idx);
    setTypedLength(0);
    setWaitingForNext(false);

    const text = allMessages[idx].analysis || '분석 내용 없음';
    let charIdx = 0;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      charIdx++;
      setTypedLength(charIdx);
      if (charIdx >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        // 메시지 완료
        setTypingIndex(-1);
        setVisibleCount(idx + 1);

        // 라운드의 마지막 메시지이고, 다음 라운드가 있으면 대기
        const msg = allMessages[idx];
        if (msg.isLastInRound && idx < allMessages.length - 1) {
          setWaitingForNext(true);
        } else if (idx < allMessages.length - 1) {
          // 같은 라운드 내 다음 메시지 → 짧은 딜레이 후 자동 시작
          setTimeout(() => startTyping(idx + 1), 600);
        }
      }
    }, 8); // 타이핑 속도 (ms per char - 빠르게)
  };

  const handleNextRound = () => {
    setWaitingForNext(false);
    startTyping(visibleCount);
  };

  const charColors: Record<string, { bg: string; border: string; color: string; bubbleBg: string }> = {
    claude: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', color: 'text-purple-400', bubbleBg: 'bg-purple-500/8' },
    gemini: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', color: 'text-blue-400', bubbleBg: 'bg-blue-500/8' },
    gpt: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', color: 'text-emerald-400', bubbleBg: 'bg-emerald-500/8' },
  };

  return (
    <div ref={chatRef} className="space-y-1 max-h-[50vh] overflow-y-auto scroll-smooth pr-1">
      {/* 완료된 메시지 */}
      {allMessages.slice(0, visibleCount).map((msg: any, i: number) => {
        const cc = charColors[msg.character] || charColors.claude;
        const char = CHARACTERS[msg.character as keyof typeof CHARACTERS];

        return (
          <div key={i}>
            {/* 라운드 구분선 */}
            {msg.isFirstInRound && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-dark-700/50" />
                <span className="text-[11px] text-dark-500 font-medium px-2 py-0.5 rounded-full bg-dark-800/60 border border-dark-700/40 whitespace-nowrap">
                  🎙️ {msg.roundTitle}
                </span>
                <div className="flex-1 h-px bg-dark-700/50" />
              </div>
            )}
            {/* 채팅 버블 */}
            <div className="flex items-start gap-2.5 py-1.5">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden ring-1 ${cc.border} shrink-0 mt-0.5`}>
                <Image src={char?.image || ''} alt={msg.characterName} width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${cc.color}`}>{msg.characterName}</span>
                  <span className="text-[10px] text-dark-600">·</span>
                  <span className="text-[10px] text-dark-600">{msg.roundTitle}</span>
                </div>
                <div className={`rounded-2xl rounded-tl-md px-3 sm:px-4 py-2.5 sm:py-3 ${cc.bubbleBg} border ${cc.border}`}>
                  <p className="text-[13px] sm:text-sm text-dark-200 leading-relaxed">{msg.analysis || '분석 내용 없음'}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 현재 타이핑 중인 메시지 */}
      {typingIndex >= 0 && typingIndex < allMessages.length && (() => {
        const msg = allMessages[typingIndex];
        const cc = charColors[msg.character] || charColors.claude;
        const char = CHARACTERS[msg.character as keyof typeof CHARACTERS];
        const fullText = msg.analysis || '분석 내용 없음';
        const displayText = fullText.substring(0, typedLength);

        return (
          <div>
            {msg.isFirstInRound && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-dark-700/50" />
                <span className="text-[11px] text-dark-500 font-medium px-2 py-0.5 rounded-full bg-dark-800/60 border border-dark-700/40 whitespace-nowrap">
                  🎙️ {msg.roundTitle}
                </span>
                <div className="flex-1 h-px bg-dark-700/50" />
              </div>
            )}
            <div className="flex items-start gap-2.5 py-1.5">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden ring-1 ${cc.border} shrink-0 mt-0.5`}>
                <Image src={char?.image || ''} alt={msg.characterName} width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${cc.color}`}>{msg.characterName}</span>
                  <span className="text-[10px] text-dark-600">·</span>
                  <span className="text-[10px] text-dark-600">{msg.roundTitle}</span>
                </div>
                <div className={`rounded-2xl rounded-tl-md px-3 sm:px-4 py-2.5 sm:py-3 ${cc.bubbleBg} border ${cc.border}`}>
                  <p className="text-[13px] sm:text-sm text-dark-200 leading-relaxed">
                    {displayText}
                    <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 다음 라운드 버튼 */}
      {waitingForNext && (
        <div className="flex justify-center py-3">
          <button
            onClick={handleNextRound}
            className="px-5 py-2.5 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-400 text-sm font-semibold hover:bg-brand-500/30 transition-all active:scale-95"
          >
            다음 대화 보기 →
          </button>
        </div>
      )}

      {/* 토론 완료 */}
      {visibleCount >= allMessages.length && typingIndex === -1 && !waitingForNext && visibleCount > 0 && (
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 h-px bg-brand-500/30" />
          <span className="text-[11px] text-brand-400 font-medium px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30">
            ✅ 토론 완료
          </span>
          <div className="flex-1 h-px bg-brand-500/30" />
        </div>
      )}
    </div>
  );
}
