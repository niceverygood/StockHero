'use client';

import { useState, useEffect } from 'react';
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
                    onClick={() => {
                      setSelectedCharacter(char);
                      setShowCharacterModal(true);
                    }}
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
                    onClick={() => {
                      setSelectedStock(stock);
                      setShowStockModal(true);
                    }}
                    className="w-full bg-dark-900/80 border border-dark-800 rounded-2xl p-5 hover:border-brand-500/50 hover:bg-dark-800/80 transition-all group text-left"
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
                          <p className={`text-sm font-bold ${stock.claudeScore > 0 ? getScoreColor(stock.claudeScore) : 'text-dark-600'}`}>
                            {stock.claudeScore > 0 ? stock.claudeScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">Gemini</p>
                          <p className={`text-sm font-bold ${stock.geminiScore > 0 ? getScoreColor(stock.geminiScore) : 'text-dark-600'}`}>
                            {stock.geminiScore > 0 ? stock.geminiScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">GPT</p>
                          <p className={`text-sm font-bold ${stock.gptScore > 0 ? getScoreColor(stock.gptScore) : 'text-dark-600'}`}>
                            {stock.gptScore > 0 ? stock.gptScore.toFixed(1) : '-'}
                          </p>
                        </div>
                        <div className="w-px h-10 bg-dark-700 mx-1" />
                        <div className="text-center">
                          <p className="text-xs text-dark-500 mb-1">평균</p>
                          <p className={`text-lg font-bold ${getScoreColor(stock.avgScore)}`}>
                            {stock.avgScore.toFixed(1)}
                          </p>
                        </div>
                        {marketBuyWeight !== null && (
                          <>
                            <div className="w-px h-10 bg-dark-700 mx-1" />
                            <div className="text-center min-w-[52px]">
                              <p className="text-[10px] text-brand-400/70 mb-1 whitespace-nowrap">가중 매수</p>
                              <p className={`text-lg font-black ${(() => {
                                  const w = stock.avgScore * marketBuyWeight;
                                  if (w >= 3.5) return 'text-emerald-400';
                                  if (w >= 2.5) return 'text-yellow-400';
                                  if (w >= 1.5) return 'text-orange-400';
                                  return 'text-red-400';
                                })()
                                }`}>
                                {(stock.avgScore * marketBuyWeight).toFixed(1)}
                              </p>
                              <p className="text-[9px] text-dark-600">×{(marketBuyWeight * 100).toFixed(0)}%</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Click indicator */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrendingUp className="w-5 h-5 text-brand-400" />
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
          onClose={() => setShowCharacterModal(false)}
        />
      )}

      {/* Stock Detail Modal */}
      {showStockModal && selectedStock && verdict && (
        <StockDetailModal
          stock={selectedStock}
          verdict={verdict}
          onClose={() => {
            setShowStockModal(false);
            setSelectedStock(null);
          }}
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
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-dark-900 border-b border-dark-800 p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-dark-800/80 hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${stock.rank === 1 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black' :
                stock.rank === 2 ? 'bg-gradient-to-r from-slate-400 to-slate-300 text-black' :
                  stock.rank === 3 ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white' :
                    'bg-dark-700 text-dark-300'
                }`}>
                {stock.rank}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-dark-50">{stock.name}</h2>
                <p className="text-dark-400">{stock.symbol}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-dark-500">평균 점수</p>
                <p className={`text-3xl font-bold ${getScoreColor(stock.avgScore)}`}>
                  {stock.avgScore.toFixed(1)}
                </p>
              </div>
            </div>

            {/* 만장일치 여부 */}
            <div className="mt-4">
              {stock.isUnanimous ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">만장일치!</span>
                  <span className="text-emerald-300/70 text-sm">3명의 AI 모두 이 종목을 Top 5에 선정했습니다</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-medium">의견 차이</span>
                  <span className="text-amber-300/70 text-sm">
                    {aiAnalysis.filter(a => a.score < 3).map(a => a.name).join(', ')}은(는) 다른 종목을 더 선호했습니다
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI 의견 목록 */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-dark-100 mb-4">🤖 각 AI의 분석 의견</h3>

            {aiAnalysis.map((ai) => {
              const badge = getScoreBadge(ai.score);
              return (
                <div
                  key={ai.id}
                  className={`p-5 rounded-2xl border ${ai.score >= 3
                    ? `${ai.character.bgColor} ${ai.character.borderColor}`
                    : ai.score >= 1
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-dark-800/50 border-dark-700'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    {/* AI 아바타 */}
                    <div className={`w-12 h-12 rounded-xl overflow-hidden ring-2 ${ai.character.borderColor} flex-shrink-0`}>
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${ai.character.color}`}>{ai.name}</span>
                          <span className="text-dark-500 text-sm">{ai.character.roleKo}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${badge.style} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-dark-300 leading-relaxed">{ai.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 토론 라운드 */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-dark-100 mb-4">🎙️ AI 토론 과정</h3>
              {debateLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-dark-400">토론 내용 로딩 중...</span>
                </div>
              ) : debateRounds.length > 0 ? (
                <div className="space-y-2">
                  {debateRounds.map((round: any) => {
                    const isOpen = expandedRound === round.round;
                    return (
                      <div key={round.round} className="rounded-xl border border-dark-700/40 overflow-hidden">
                        <button
                          onClick={() => setExpandedRound(isOpen ? null : round.round)}
                          className="w-full flex items-center justify-between p-3 bg-dark-800/40 hover:bg-dark-800/70 transition-colors text-left"
                        >
                          <span className="text-sm font-semibold text-dark-300">
                            🎙️ 라운드 {round.round} - {round.round === 1 ? '초기 분석' : round.round === 2 ? '의견 조율' : '최종 합의'}
                          </span>
                          <TrendingUp className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-brand-400' : 'text-dark-500'}`} />
                        </button>
                        {isOpen && (
                          <div className="p-3 space-y-3">
                            {round.messages.map((msg: any, mi: number) => {
                              const charColors: Record<string, { bg: string; border: string; color: string }> = {
                                claude: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', color: 'text-purple-400' },
                                gemini: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', color: 'text-blue-400' },
                                gpt: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', color: 'text-emerald-400' },
                              };
                              const cc = charColors[msg.character] || charColors.claude;
                              const aiScore = msg.character === 'claude' ? stock.claudeScore
                                : msg.character === 'gemini' ? stock.geminiScore : stock.gptScore;
                              const sBadge = getScoreBadge(aiScore);

                              return (
                                <div key={mi} className={`p-3 rounded-xl ${cc.bg} border ${cc.border}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg overflow-hidden ring-1 ${cc.border}`}>
                                      <Image
                                        src={CHARACTERS[msg.character as keyof typeof CHARACTERS]?.image || ''}
                                        alt={msg.characterName}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <span className={`text-sm font-semibold ${cc.color}`}>{msg.characterName}</span>
                                    <span className={`ml-auto px-2 py-0.5 text-xs rounded-full border ${sBadge.style} ${sBadge.text} font-bold`}>
                                      {sBadge.label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">{msg.analysis || '분석 내용 없음'}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-dark-500 text-center py-4">토론 데이터를 불러올 수 없습니다.</p>
              )}
            </div>

            {/* 추가 정보 */}
            <div className="mt-6 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
              <h4 className="text-sm font-medium text-dark-400 mb-2">📊 점수 산정 기준</h4>
              <p className="text-dark-500 text-sm leading-relaxed">
                각 AI가 해당 종목을 Top 5에 선정하면 순위에 따라 5.0~1.0점이 부여됩니다.
                3점 이상은 적극 추천, 1~2점은 하위 순위(소극적 포함), 0점은 해당 AI가 다른 종목을 추천한 것입니다.
                최종 순위는 3개 AI 점수의 합산으로 결정됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
