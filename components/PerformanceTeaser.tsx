'use client';

import { TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

interface PerformanceTeaserProps {
  monthlyReturn: number;
  topStockName?: string;
  onUpgradeClick: () => void;
}

export function PerformanceTeaser({ monthlyReturn, topStockName, onUpgradeClick }: PerformanceTeaserProps) {
  const isPositive = monthlyReturn >= 0;

  return (
    <div 
      className="bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-6 cursor-pointer hover:border-amber-500/50 transition-all group"
      onClick={onUpgradeClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <p className="text-amber-400 font-medium">Pro 회원 전용 백테스트</p>
            </div>
            <p className="text-sm text-dark-300 mt-0.5">
              이번 달 Top 1 종목들 평균 수익률: 
              <span className={`font-bold ml-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{monthlyReturn.toFixed(1)}%
              </span>
              {topStockName && (
                <span className="text-dark-400 ml-2">
                  (최고: {topStockName})
                </span>
              )}
            </p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-lg font-medium hover:opacity-90 transition-all group-hover:scale-105">
          확인하기
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// FOMO 배너 - 무료 사용자에게 보여줄 작은 배너
export function FOMOBanner({ missedProfit, onUpgradeClick }: { missedProfit: number; onUpgradeClick: () => void }) {
  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-dark-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl cursor-pointer hover:border-amber-500/50 transition-all z-40"
      onClick={onUpgradeClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">💰</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-400">놓친 수익</p>
          <p className="text-dark-300 text-xs truncate">
            Pro 회원이었다면 
            <span className="text-emerald-400 font-bold">
              +₩{missedProfit.toLocaleString()}
            </span>
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
      </div>
    </div>
  );
}
