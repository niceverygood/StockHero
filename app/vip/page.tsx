'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentPlan } from '@/lib/subscription';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CrownIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  TargetIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  ClockIcon,
  SearchIcon,
  BarChart3Icon,
} from 'lucide-react';
import { SignalFeed } from '@/components/vip/SignalFeed';
import { ExclusiveStockCard } from '@/components/vip/ExclusiveStockCard';

// Suspense fallback component
function VIPPageLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="container-app">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">VIP 페이지 로딩 중...</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Wrapper component with Suspense
export default function VIPPageWrapper() {
  return (
    <Suspense fallback={<VIPPageLoading />}>
      <VIPPage />
    </Suspense>
  );
}

interface VIPStock {
  rank: number;
  symbol: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  expectedReturn: string;
  reason: string;
  risks: string[];
  holdingPeriod: string;
  conviction: string;
  isLocked?: boolean;
}

interface Signal {
  id: string;
  symbol: string;
  name: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'TAKE_PROFIT' | 'STOP_LOSS';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  current_price: number;
  change_percent: number;
  reason: string;
  created_at: string;
}

interface PerformanceStats {
  totalStocks: number;
  avgReturn: number;
  winRate: number;
  bestPerformer: any;
  worstPerformer: any;
}

// 백테스트 관련 인터페이스
interface BacktestResult {
  symbol: string;
  name: string;
  firstRecommendDate: string;
  firstRecommendPrice: number;
  currentPrice: number;
  returnPercent: number;
  totalRecommendations: number;
  avgRank: number;
  unanimousCount: number;
}

interface BacktestSummary {
  period: { start: string; end: string };
  totalDays: number;
  totalStocks: number;
  avgReturn: number;
  positiveCount: number;
  negativeCount: number;
  winRate: number;
  bestReturn: { symbol: string; name: string; returnPercent: number } | null;
  worstReturn: { symbol: string; name: string; returnPercent: number } | null;
  strategies: {
    allStocks: { avgReturn: number; stockCount: number };
    unanimousOnly: { avgReturn: number; stockCount: number };
    top1Only: { avgReturn: number; stockCount: number };
  };
}

function VIPPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan: currentPlan, planName, isVip, isLoading: planLoading } = useCurrentPlan();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vipStocks, setVipStocks] = useState<VIPStock[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // URL 파라미터에서 초기 탭 결정
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && ['stocks', 'signals', 'debate', 'backtest'].includes(tabFromUrl) 
    ? tabFromUrl as 'stocks' | 'signals' | 'debate' | 'backtest'
    : 'stocks';
  const [activeTab, setActiveTab] = useState<'stocks' | 'signals' | 'debate' | 'backtest'>(initialTab);
  
  // 커스텀 토론
  const [debateSymbol, setDebateSymbol] = useState('');
  const [debateQuestion, setDebateQuestion] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateResult, setDebateResult] = useState<any>(null);
  
  // 백테스트
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // isVip은 useCurrentPlan에서 이미 계산됨 (무료 모드에서는 true)
  const isVIP = !planLoading && isVip;
  const isLoading = authLoading || planLoading;

  // VIP 종목 로드
  const fetchVIPStocks = async () => {
    try {
      const response = await fetch('/api/vip/exclusive-stocks');
      const data = await response.json();

      if (data.success) {
        setVipStocks(data.stocks || []);
        setWeekStart(data.weekStart);
        setPerformance(data.pastPerformance || null);
      }
    } catch (error) {
      console.error('Failed to fetch VIP stocks:', error);
    }
  };

  // 시그널 로드
  const fetchSignals = async () => {
    if (!isVIP) return;

    try {
      const response = await fetch('/api/vip/signals?limit=20');
      const data = await response.json();

      if (data.success) {
        setSignals(data.signals || []);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    }
  };

  // 백테스트 로드
  const fetchBacktest = async () => {
    setBacktestLoading(true);
    try {
      const res = await fetch(`/api/backtest?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (data.success) {
        setBacktestSummary(data.summary);
        setBacktestResults(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch backtest:', error);
    } finally {
      setBacktestLoading(false);
    }
  };

  // 수익률 색상
  const getReturnColor = (returnPct: number) => {
    if (returnPct > 10) return 'text-red-400';
    if (returnPct > 0) return 'text-red-300';
    if (returnPct < -10) return 'text-blue-400';
    if (returnPct < 0) return 'text-blue-300';
    return 'text-dark-400';
  };

  const getReturnBg = (returnPct: number) => {
    if (returnPct > 20) return 'bg-red-500/20';
    if (returnPct > 10) return 'bg-red-500/10';
    if (returnPct < -20) return 'bg-blue-500/20';
    if (returnPct < -10) return 'bg-blue-500/10';
    return '';
  };

  const getReturnSign = (returnPct: number) => returnPct > 0 ? '+' : '';
  const formatPrice = (price: number) => price.toLocaleString('ko-KR');

  // 커스텀 토론 시작
  const startCustomDebate = async () => {
    if (!debateSymbol) return;

    setDebateLoading(true);
    setDebateResult(null);

    try {
      const response = await fetch('/api/vip/custom-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: debateSymbol,
          question: debateQuestion || undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setDebateResult(data);
      } else {
        alert(data.error || '분석 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to start debate:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setDebateLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchVIPStocks();
      await fetchSignals();
      setLoading(false);
    };

    if (!isLoading) {
      loadData();
    }
  }, [isLoading, isVIP]);

  // 비VIP 유저 리다이렉트 안내
  if (!isLoading && !isVIP) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full mb-6">
              <CrownIcon className="w-10 h-10 text-amber-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-dark-100 mb-4">VIP 전용 페이지</h1>
            <p className="text-dark-400 mb-8 max-w-md mx-auto">
              VIP 회원만 접근할 수 있는 프리미엄 기능입니다.<br />
              VIP 전용 종목, 실시간 매매 시그널, 커스텀 AI 토론을 이용해보세요.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-dark-800/50 rounded-xl p-4 text-left">
                <SparklesIcon className="w-6 h-6 text-amber-400 mb-2" />
                <h3 className="font-medium text-dark-100 mb-1">VIP 전용 종목</h3>
                <p className="text-xs text-dark-500">매주 3개 엄선된 고수익 종목</p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-4 text-left">
                <TrendingUpIcon className="w-6 h-6 text-green-400 mb-2" />
                <h3 className="font-medium text-dark-100 mb-1">실시간 시그널</h3>
                <p className="text-xs text-dark-500">AI 기반 매수/매도 타이밍</p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-4 text-left">
                <MessageSquareIcon className="w-6 h-6 text-purple-400 mb-2" />
                <h3 className="font-medium text-dark-100 mb-1">커스텀 토론</h3>
                <p className="text-xs text-dark-500">원하는 종목 심층 분석</p>
              </div>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all"
            >
              <CrownIcon className="w-5 h-5" />
              VIP 업그레이드하기
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />

        <div className="relative container-app">
          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
              <CrownIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-100">VIP Dashboard</h1>
              <p className="text-sm text-dark-500">프리미엄 투자 인사이트</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { id: 'stocks', label: 'VIP 종목', icon: SparklesIcon },
              { id: 'signals', label: '실시간 시그널', icon: TrendingUpIcon },
              { id: 'backtest', label: '백테스트', icon: BarChart3Icon },
              { id: 'debate', label: '커스텀 토론', icon: MessageSquareIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-dark-800/50 text-dark-400 hover:text-dark-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* VIP 종목 탭 */}
          {activeTab === 'stocks' && (
            <div className="space-y-6">
              {/* 이번 주 종목 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-dark-100">이번 주 VIP 종목</h2>
                    <p className="text-xs text-dark-500">{weekStart} 기준</p>
                  </div>
                  <button
                    onClick={fetchVIPStocks}
                    className="p-2 text-dark-400 hover:text-dark-200"
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-64 bg-dark-800/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {vipStocks.map((stock) => (
                      <ExclusiveStockCard
                        key={stock.symbol}
                        stock={stock}
                        isVIP={isVIP}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 과거 성과 */}
              {performance && (
                <div className="bg-dark-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-dark-100 mb-4">최근 4주 성과</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-dark-100">{performance.totalStocks}</p>
                      <p className="text-xs text-dark-500">추천 종목</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${performance.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {performance.avgReturn >= 0 ? '+' : ''}{performance.avgReturn}%
                      </p>
                      <p className="text-xs text-dark-500">평균 수익률</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{performance.winRate}%</p>
                      <p className="text-xs text-dark-500">승률</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        +{performance.bestPerformer?.actualReturn?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-dark-500">최고 수익</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 실시간 시그널 탭 */}
          {activeTab === 'signals' && (
            <SignalFeed signals={signals} onRefresh={fetchSignals} />
          )}

          {/* 백테스트 탭 */}
          {activeTab === 'backtest' && (
            <div className="space-y-6">
              {/* 기간 선택 */}
              <div className="bg-dark-800/50 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-dark-400">시작일</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-dark-400">종료일</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100"
                    />
                  </div>
                  <button
                    onClick={fetchBacktest}
                    disabled={backtestLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium text-black transition-colors"
                  >
                    {backtestLoading ? '분석 중...' : '백테스트 실행'}
                  </button>
                </div>
                <p className="text-xs text-amber-400/70 mt-2">
                  💎 VIP 전용: 무제한 기간 백테스트 가능
                </p>
              </div>

              {backtestLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-dark-400">백테스트 분석 중...</p>
                  </div>
                </div>
              ) : backtestSummary ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-amber-400">{backtestSummary.totalDays}일</p>
                      <p className="text-xs text-dark-500 mt-1">분석 기간</p>
                    </div>
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-purple-400">{backtestSummary.totalStocks}개</p>
                      <p className="text-xs text-dark-500 mt-1">추천 종목</p>
                    </div>
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.avgReturn)}`}>
                        {getReturnSign(backtestSummary.avgReturn)}{backtestSummary.avgReturn.toFixed(1)}%
                      </p>
                      <p className="text-xs text-dark-500 mt-1">평균 수익률</p>
                    </div>
                    <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                      <p className={`text-3xl font-bold ${backtestSummary.winRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {backtestSummary.winRate}%
                      </p>
                      <p className="text-xs text-dark-500 mt-1">승률</p>
                    </div>
                  </div>

                  {/* Strategy Comparison */}
                  <div>
                    <h3 className="text-lg font-bold text-dark-100 mb-4">📊 전략별 수익률 비교</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-dark-800/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">📈</span>
                          <h4 className="font-medium text-dark-200">전체 추천 종목</h4>
                        </div>
                        <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.strategies.allStocks.avgReturn)}`}>
                          {getReturnSign(backtestSummary.strategies.allStocks.avgReturn)}
                          {backtestSummary.strategies.allStocks.avgReturn.toFixed(1)}%
                        </p>
                        <p className="text-xs text-dark-500 mt-2">
                          {backtestSummary.strategies.allStocks.stockCount}개 종목 평균
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🏆</span>
                          <h4 className="font-medium text-amber-200">만장일치 종목만</h4>
                        </div>
                        <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.strategies.unanimousOnly.avgReturn)}`}>
                          {getReturnSign(backtestSummary.strategies.unanimousOnly.avgReturn)}
                          {backtestSummary.strategies.unanimousOnly.avgReturn.toFixed(1)}%
                        </p>
                        <p className="text-xs text-dark-500 mt-2">
                          {backtestSummary.strategies.unanimousOnly.stockCount}개 종목 평균
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🥇</span>
                          <h4 className="font-medium text-emerald-200">1위 종목만</h4>
                        </div>
                        <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.strategies.top1Only.avgReturn)}`}>
                          {getReturnSign(backtestSummary.strategies.top1Only.avgReturn)}
                          {backtestSummary.strategies.top1Only.avgReturn.toFixed(1)}%
                        </p>
                        <p className="text-xs text-dark-500 mt-2">
                          {backtestSummary.strategies.top1Only.stockCount}개 종목 평균
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Best & Worst */}
                  {(backtestSummary.bestReturn || backtestSummary.worstReturn) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {backtestSummary.bestReturn && (
                        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-5">
                          <p className="text-sm text-dark-400 mb-2">🚀 최고 수익률</p>
                          <p className="text-xl font-bold text-dark-100">{backtestSummary.bestReturn.name}</p>
                          <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.bestReturn.returnPercent)}`}>
                            +{backtestSummary.bestReturn.returnPercent.toFixed(1)}%
                          </p>
                        </div>
                      )}
                      {backtestSummary.worstReturn && (
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                          <p className="text-sm text-dark-400 mb-2">📉 최저 수익률</p>
                          <p className="text-xl font-bold text-dark-100">{backtestSummary.worstReturn.name}</p>
                          <p className={`text-3xl font-bold ${getReturnColor(backtestSummary.worstReturn.returnPercent)}`}>
                            {backtestSummary.worstReturn.returnPercent.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Results Table */}
                  <div>
                    <h3 className="text-lg font-bold text-dark-100 mb-4">📋 종목별 수익률</h3>
                    <div className="bg-dark-800/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-dark-700">
                              <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">종목</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">첫 추천일</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">최초 추천가</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">현재가</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">수익률</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">추천횟수</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-700">
                            {backtestResults.map((result, idx) => (
                              <tr key={result.symbol} className={`${getReturnBg(result.returnPercent)} hover:bg-dark-700/50 transition-colors`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-dark-500">{idx + 1}</span>
                                    <div>
                                      <p className="font-medium text-dark-100">{result.name}</p>
                                      <p className="text-xs text-dark-500">{result.symbol}</p>
                                    </div>
                                    {result.unanimousCount > 0 && (
                                      <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                                        🏆 {result.unanimousCount}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-dark-400">
                                  {result.firstRecommendDate}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-dark-400">
                                  {formatPrice(result.firstRecommendPrice)}원
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-dark-200">
                                  {formatPrice(result.currentPrice)}원
                                </td>
                                <td className={`px-4 py-3 text-right text-sm font-bold ${getReturnColor(result.returnPercent)}`}>
                                  {getReturnSign(result.returnPercent)}{result.returnPercent.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-dark-400">
                                  {result.totalRecommendations}회
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-dark-800/30 border border-dark-700 rounded-xl p-4">
                    <p className="text-xs text-dark-500 leading-relaxed">
                      ⚠️ <strong>투자 유의사항:</strong> 이 백테스트 결과는 과거 데이터를 기반으로 한 시뮬레이션이며, 
                      미래 수익을 보장하지 않습니다. 실제 투자 시에는 매매 수수료, 세금, 슬리피지 등이 발생하여 
                      결과가 달라질 수 있습니다.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <BarChart3Icon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400 mb-2">백테스트를 실행해보세요</p>
                  <p className="text-sm text-dark-600">기간을 선택하고 분석 버튼을 클릭하세요</p>
                </div>
              )}
            </div>
          )}

          {/* 커스텀 토론 탭 */}
          {activeTab === 'debate' && (
            <div className="space-y-6">
              {/* 입력 폼 */}
              <div className="bg-dark-800/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-dark-100 mb-4">
                  원하는 종목 심층 분석
                </h3>
                <p className="text-sm text-dark-400 mb-4">
                  종목 코드를 입력하면 AI 전문가 3인이 심층 분석을 제공합니다.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-400 mb-2">종목 코드</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={debateSymbol}
                        onChange={(e) => setDebateSymbol(e.target.value)}
                        placeholder="예: 005930 (삼성전자)"
                        className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:border-amber-500 focus:outline-none"
                      />
                      <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-400 mb-2">질문 (선택)</label>
                    <textarea
                      value={debateQuestion}
                      onChange={(e) => setDebateQuestion(e.target.value)}
                      placeholder="특정 질문이 있다면 입력하세요. 예: 현재 시점에서 매수해도 될까요?"
                      className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:border-amber-500 focus:outline-none resize-none h-24"
                    />
                  </div>

                  <button
                    onClick={startCustomDebate}
                    disabled={!debateSymbol || debateLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {debateLoading ? (
                      <>
                        <RefreshCwIcon className="w-5 h-5 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <MessageSquareIcon className="w-5 h-5" />
                        심층 분석 시작
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 분석 결과 */}
              {debateResult && (
                <div className="space-y-4">
                  <div className="bg-dark-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-dark-100">{debateResult.stock.name}</h3>
                      <span className="text-sm text-dark-500">({debateResult.stock.symbol})</span>
                      <span className={`text-sm font-medium ${debateResult.stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {debateResult.stock.changePercent >= 0 ? '+' : ''}{debateResult.stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-lg font-bold text-dark-100">
                      {debateResult.stock.price?.toLocaleString()}원
                    </p>
                  </div>

                  {debateResult.analyses.map((analysis: any) => (
                    <div key={analysis.character} className="bg-dark-800/50 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                          analysis.character === 'claude' ? 'bg-orange-500' :
                          analysis.character === 'gemini' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {analysis.character === 'claude' ? 'C' :
                           analysis.character === 'gemini' ? 'G' : 'T'}
                        </div>
                        <span className="font-medium text-dark-100">
                          {analysis.character === 'claude' ? 'Claude Lee' :
                           analysis.character === 'gemini' ? 'Gemi Nine' : 'G.P. Taylor'}
                        </span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="text-dark-300 whitespace-pre-wrap text-sm leading-relaxed">
                          {analysis.analysis}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
