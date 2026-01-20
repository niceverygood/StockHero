'use client';

import { Lock } from 'lucide-react';

interface BlurredStockCardProps {
  rank: number;
  score: number;
  onUpgradeClick: () => void;
}

export function BlurredStockCard({ rank, score, onUpgradeClick }: BlurredStockCardProps) {
  // 랭크별 색상
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black';
      case 2: return 'bg-gradient-to-br from-gray-300 to-gray-400 text-black';
      case 3: return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
      default: return 'bg-dark-600 text-white';
    }
  };

  return (
    <div 
      className="relative bg-dark-800/50 border border-dark-700 rounded-xl p-4 cursor-pointer group hover:border-brand-500/50 transition-all"
      onClick={onUpgradeClick}
    >
      {/* 블러된 내용 */}
      <div className="blur-sm select-none pointer-events-none">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(rank)}`}>
            {rank}
          </span>
          <div className="flex-1">
            <div className="h-5 w-28 bg-dark-600 rounded animate-pulse" />
            <div className="h-3 w-20 bg-dark-700 rounded mt-1 animate-pulse" />
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-dark-400 text-sm">AI 평균 점수</span>
          <span className="text-emerald-400 font-bold text-lg">{score.toFixed(1)}</span>
        </div>
      </div>

      {/* 호버시 잠금 오버레이 */}
      <div className="absolute inset-0 bg-dark-900/70 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
        <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mb-2">
          <Lock className="w-5 h-5 text-brand-400" />
        </div>
        <span className="text-sm font-medium text-white">Premium 구독시 확인</span>
        <span className="text-xs text-dark-400 mt-1">클릭하여 업그레이드</span>
      </div>

      {/* 우측 상단 잠금 아이콘 (항상 표시) */}
      <div className="absolute top-3 right-3 opacity-60 group-hover:opacity-0 transition-opacity">
        <Lock className="w-4 h-4 text-dark-500" />
      </div>

      {/* Premium 배지 */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold rounded-full shadow-lg">
        PREMIUM
      </div>
    </div>
  );
}
