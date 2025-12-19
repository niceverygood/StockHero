'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CharacterAvatar } from './CharacterAvatar';
import type { CharacterType } from '@/lib/llm/types';

interface MissedPick {
  symbol: string;
  name: string;
  pickedDate: string;
  entryPrice: number;
  currentPrice: number;
  returnPct: number;
  pickedBy: CharacterType[];
  isUnanimous: boolean;
}

// 최근 AI 추천 종목 (실제로는 API에서 가져와야 함)
function generateMissedPicks(): MissedPick[] {
  const today = new Date();
  
  const picks: MissedPick[] = [
    {
      symbol: '000660',
      name: 'SK하이닉스',
      pickedDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      entryPrice: 185000,
      currentPrice: 210000,
      returnPct: 13.5,
      pickedBy: ['claude', 'gemini', 'gpt'],
      isUnanimous: true,
    },
    {
      symbol: '373220',
      name: 'LG에너지솔루션',
      pickedDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      entryPrice: 380000,
      currentPrice: 415000,
      returnPct: 9.2,
      pickedBy: ['gemini', 'gpt'],
      isUnanimous: false,
    },
    {
      symbol: '005930',
      name: '삼성전자',
      pickedDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      entryPrice: 72000,
      currentPrice: 76500,
      returnPct: 6.3,
      pickedBy: ['claude', 'gemini'],
      isUnanimous: false,
    },
  ];
  
  return picks;
}

export function MissedProfitCalculator() {
  const [investmentAmount, setInvestmentAmount] = useState(10000000); // 1000만원
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedProfit, setDisplayedProfit] = useState(0);
  
  const missedPicks = useMemo(() => generateMissedPicks(), []);
  
  // 총 놓친 수익 계산
  const totalMissedProfit = useMemo(() => {
    // 각 종목에 균등 분배 가정
    const perStock = investmentAmount / missedPicks.length;
    return missedPicks.reduce((sum, pick) => {
      return sum + (perStock * pick.returnPct / 100);
    }, 0);
  }, [investmentAmount, missedPicks]);
  
  const avgReturnPct = useMemo(() => {
    return missedPicks.reduce((sum, p) => sum + p.returnPct, 0) / missedPicks.length;
  }, [missedPicks]);
  
  // 숫자 애니메이션
  useEffect(() => {
    setIsAnimating(true);
    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayedProfit;
    const endValue = totalMissedProfit;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      
      setDisplayedProfit(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [totalMissedProfit]);
  
  const presets = [
    { value: 1000000, label: '100만원' },
    { value: 5000000, label: '500만원' },
    { value: 10000000, label: '1,000만원' },
    { value: 50000000, label: '5,000만원' },
  ];
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/40 via-orange-950/30 to-amber-950/40 border border-red-500/20">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/10 to-red-500/5 animate-pulse" />
      
      {/* Fire/Urgent icon pattern */}
      <div className="absolute top-4 right-4 text-6xl opacity-10">🔥</div>
      
      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">이번 주 놓친 수익</h3>
            <p className="text-sm text-red-300/80">AI 추천을 따랐다면...</p>
          </div>
        </div>
        
        {/* Main profit display */}
        <div className="text-center py-6 mb-6">
          <div className="text-sm text-orange-300 mb-2">당신이 놓친 예상 수익</div>
          <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent ${isAnimating ? 'animate-pulse' : ''}`}>
            +{Math.round(displayedProfit).toLocaleString()}원
          </div>
          <div className="mt-2 text-lg text-orange-200">
            평균 수익률 <span className="font-bold text-amber-400">+{avgReturnPct.toFixed(1)}%</span>
          </div>
        </div>
        
        {/* Investment amount selector */}
        <div className="mb-6">
          <label className="text-xs text-dark-400 block mb-2">투자금 설정</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setInvestmentAmount(preset.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  investmentAmount === preset.value
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Missed picks list */}
        <div className="space-y-3 mb-6">
          <div className="text-xs text-dark-400 mb-2">놓친 AI 추천 ({missedPicks.length}건)</div>
          {missedPicks.map((pick) => (
            <Link
              key={pick.symbol}
              href={`/battle/${pick.symbol}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-dark-900/50 hover:bg-dark-900 border border-dark-800/50 hover:border-orange-500/30 transition-all group"
            >
              {/* Stock info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark-100 group-hover:text-white transition-colors">
                    {pick.name}
                  </span>
                  {pick.isUnanimous && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      만장일치
                    </span>
                  )}
                </div>
                <div className="text-xs text-dark-500">
                  {pick.pickedDate} 추천 · {pick.entryPrice.toLocaleString()}원 → {pick.currentPrice.toLocaleString()}원
                </div>
              </div>
              
              {/* AI avatars */}
              <div className="flex -space-x-1">
                {pick.pickedBy.map((ai) => (
                  <div key={ai} className="w-6 h-6 rounded-full border-2 border-dark-900 overflow-hidden">
                    <CharacterAvatar character={ai} size="sm" />
                  </div>
                ))}
              </div>
              
              {/* Return */}
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">
                  +{pick.returnPct.toFixed(1)}%
                </div>
                <div className="text-xs text-dark-500">
                  +{Math.round((investmentAmount / missedPicks.length) * pick.returnPct / 100).toLocaleString()}원
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/verdict"
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-center hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            오늘의 AI 추천 보기
          </Link>
          <Link
            href="/consulting"
            className="py-3 px-6 rounded-xl bg-dark-800 text-dark-200 font-medium text-center hover:bg-dark-700 hover:text-white transition-all border border-dark-700"
          >
            AI에게 상담받기
          </Link>
        </div>
        
        {/* Urgency message */}
        <div className="mt-4 text-center">
          <p className="text-xs text-red-400/80 animate-pulse">
            ⚡ 다음 추천을 놓치지 마세요! AI가 매일 새로운 기회를 찾고 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}

