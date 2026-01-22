'use client';

import { Header } from '@/components';
import { useCurrentPlan } from '@/lib/subscription/hooks';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  CrownIcon, 
  BarChart3Icon,
  TrendingUpIcon,
  CheckIcon,
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  RefreshCwIcon,
} from 'lucide-react';

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

export default function BacktestPage() {
  const { isVip, isLoading: planLoading } = useCurrentPlan();
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBacktest();
  }, []);

  const fetchBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest');
      const data = await res.json();
      
      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary || null);
      } else {
        setError(data.error || '백테스트 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('백테스트 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원';
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // VIP 회원이면 VIP 페이지로 안내
  if (!planLoading && isVip) {
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
            
            <h1 className="text-3xl font-bold text-dark-100 mb-4">VIP 백테스트로 이동하세요!</h1>
            <p className="text-dark-400 mb-8 max-w-md mx-auto">
              VIP 회원님은 VIP 대시보드에서 무제한 기간 백테스트를 이용하실 수 있습니다.
            </p>

            <Link
              href="/vip?tab=backtest"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all"
            >
              <BarChart3Icon className="w-5 h-5" />
              VIP 백테스트 바로가기
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
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />

        <div className="relative container-app">
          {/* Hero Section */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl mb-6">
              <BarChart3Icon className="w-8 h-8 text-amber-400" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="text-dark-100">AI 추천</span>{' '}
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">백테스트</span>
            </h1>
            
            <p className="text-dark-400 text-base max-w-xl mx-auto mb-6">
              AI가 추천한 종목을 추천 당시 가격에 매수했다면 지금 얼마나 벌었을까요?
            </p>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <p className="text-3xl font-bold text-red-400">{formatPercent(summary.avgReturn)}</p>
                    <p className="text-xs text-dark-500 mt-1">평균 수익률</p>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-400">{summary.winRate}%</p>
                    <p className="text-xs text-dark-500 mt-1">승률</p>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <p className="text-3xl font-bold text-purple-400">{summary.totalStocks}개</p>
                    <p className="text-xs text-dark-500 mt-1">분석 종목</p>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <p className="text-3xl font-bold text-amber-400">{formatPercent(summary.strategies.unanimousOnly.avgReturn)}</p>
                    <p className="text-xs text-dark-500 mt-1">만장일치 평균</p>
                  </div>
                </div>

                {/* Strategy Comparison */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-dark-800/30 rounded-lg">
                    <p className="text-lg font-bold text-dark-200">{formatPercent(summary.strategies.allStocks.avgReturn)}</p>
                    <p className="text-xs text-dark-500">전체 종목 ({summary.strategies.allStocks.stockCount}개)</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-lg font-bold text-amber-400">{formatPercent(summary.strategies.unanimousOnly.avgReturn)}</p>
                    <p className="text-xs text-amber-400/70">만장일치 ({summary.strategies.unanimousOnly.stockCount}개)</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-lg font-bold text-purple-400">{formatPercent(summary.strategies.top1Only.avgReturn)}</p>
                    <p className="text-xs text-purple-400/70">Top 1 ({summary.strategies.top1Only.stockCount}개)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className="max-w-5xl mx-auto mb-12">
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-dark-800">
                <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5 text-emerald-400" />
                  높은 수익률 종목
                </h2>
                <button 
                  onClick={fetchBacktest}
                  disabled={loading}
                  className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCwIcon className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
                  <p className="text-dark-400">백테스트 데이터 로딩 중...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={fetchBacktest}
                    className="px-4 py-2 bg-dark-800 text-dark-200 rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-dark-800/50 text-dark-400 text-sm">
                        <th className="py-3 px-4 text-left font-medium">종목</th>
                        <th className="py-3 px-4 text-center font-medium">추천일</th>
                        <th className="py-3 px-4 text-right font-medium">추천가</th>
                        <th className="py-3 px-4 text-right font-medium">현재가</th>
                        <th className="py-3 px-4 text-right font-medium">수익률</th>
                        <th className="py-3 px-4 text-center font-medium">만장일치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr 
                          key={result.symbol}
                          className={`border-t border-dark-800/50 hover:bg-dark-800/30 transition-colors ${
                            index < 3 ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {index < 3 && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  index === 0 ? 'bg-amber-500 text-dark-950' :
                                  index === 1 ? 'bg-gray-400 text-dark-950' :
                                  'bg-amber-700 text-dark-100'
                                }`}>
                                  {index + 1}
                                </span>
                              )}
                              <div>
                                <p className="font-medium text-dark-100">{result.name}</p>
                                <p className="text-xs text-dark-500">{result.symbol}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-dark-300 text-sm">
                            {formatDate(result.firstRecommendDate)}
                          </td>
                          <td className="py-3 px-4 text-right text-dark-300 text-sm">
                            {formatPrice(result.firstRecommendPrice)}
                          </td>
                          <td className="py-3 px-4 text-right text-dark-100 font-medium text-sm">
                            {formatPrice(result.currentPrice)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              result.returnPercent >= 0 ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {result.returnPercent >= 0 ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )}
                              {formatPercent(result.returnPercent)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {result.unanimousCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-sm">
                                <StarIcon className="w-3 h-3 fill-current" />
                                {result.unanimousCount}회
                              </span>
                            ) : (
                              <span className="text-dark-500 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* VIP CTA */}
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/20 rounded-xl mb-4">
                <CrownIcon className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-dark-100 mb-2">더 많은 분석이 필요하신가요?</h2>
              <p className="text-dark-400 mb-6">
                VIP 회원은 무제한 기간 백테스트와 더 상세한 분석을 이용할 수 있습니다.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-3 mb-6 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">무제한 기간 분석</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">전략별 상세 비교</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">실시간 시그널</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">히든젬 종목 공개</span>
                </div>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
              >
                <CrownIcon className="w-5 h-5" />
                VIP 업그레이드하기
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-dark-600">
              * 백테스트 결과는 과거 데이터 기반이며, 미래 수익을 보장하지 않습니다.<br />
              * 추천가는 해당 종목이 처음 추천된 날의 종가 기준입니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
