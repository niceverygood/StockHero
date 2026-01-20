'use client';

import { Lock, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface BacktestSectionProps {
  stockSymbol: string;
  stockName: string;
  firstRecommendDate: string;
  firstRecommendPrice: number;
  currentPrice: number;
  isUnlocked: boolean;
  onUpgradeClick: () => void;
}

export function BacktestSection({ 
  stockName,
  firstRecommendDate, 
  firstRecommendPrice, 
  currentPrice,
  isUnlocked,
  onUpgradeClick 
}: BacktestSectionProps) {
  const returnRate = firstRecommendPrice > 0 
    ? ((currentPrice - firstRecommendPrice) / firstRecommendPrice * 100)
    : 0;
  const isPositive = returnRate >= 0;
  const profitAmount = Math.round(1000000 * returnRate / 100);

  if (!isUnlocked) {
    return (
      <div 
        className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-all group"
        onClick={onUpgradeClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-dark-400" />
            <span className="text-dark-400">백테스트 수익률</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 블러된 수익률 */}
            <span className={`text-lg font-bold blur-sm select-none ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{returnRate.toFixed(1)}%
            </span>
            <Lock className="w-4 h-4 text-dark-500 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>
        <p className="text-xs text-dark-500 mt-2 group-hover:text-amber-400/70 transition-colors">
          🔒 Pro 구독시 상세 백테스트 확인 가능
        </p>
      </div>
    );
  }

  // Pro 회원용 상세 백테스트
  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-400" />
          <span className="font-medium">첫 추천일 매수 시</span>
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Pro</span>
        </div>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
          <span className={`text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{returnRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-dark-900/50 rounded-lg p-3">
          <span className="text-dark-500 text-xs">종목명</span>
          <p className="font-medium mt-0.5">{stockName}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-3">
          <span className="text-dark-500 text-xs">첫 추천일</span>
          <p className="font-medium mt-0.5">{firstRecommendDate}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-3">
          <span className="text-dark-500 text-xs">당시 가격</span>
          <p className="font-medium mt-0.5">₩{firstRecommendPrice.toLocaleString()}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-3">
          <span className="text-dark-500 text-xs">현재 가격</span>
          <p className="font-medium mt-0.5">₩{currentPrice.toLocaleString()}</p>
        </div>
      </div>

      {/* 수익금 계산 */}
      <div className={`mt-3 p-3 rounded-lg ${isPositive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-300">100만원 투자시 수익금</span>
          <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}₩{profitAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
