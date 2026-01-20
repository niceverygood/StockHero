'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentPlan } from '@/lib/subscription';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { SignalFeed } from '@/components/vip/SignalFeed';
import { ExclusiveStockCard } from '@/components/vip/ExclusiveStockCard';

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

export default function VIPPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan: currentPlan, planName, isVip, isLoading: planLoading } = useCurrentPlan();
  const router = useRouter();

  const [vipStocks, setVipStocks] = useState<VIPStock[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stocks' | 'signals' | 'debate'>('stocks');
  
  // 커스텀 토론
  const [debateSymbol, setDebateSymbol] = useState('');
  const [debateQuestion, setDebateQuestion] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateResult, setDebateResult] = useState<any>(null);

  const isVIP = !planLoading && currentPlan?.name === 'vip';
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
