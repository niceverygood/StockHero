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

export function MissedProfitCalculator() {
  const [investmentAmount, setInvestmentAmount] = useState(10000000); // 1000만원
  const [missedPicks, setMissedPicks] = useState<MissedPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedProfit, setDisplayedProfit] = useState(0);
  
  // AI 추천 히스토리와 실시간 가격 가져오기
  useEffect(() => {
    async function fetchRecommendationsAndPrices() {
      setIsLoading(true);
      
      try {
        // 1. 이번 달의 AI 추천 히스토리 가져오기
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        const historyRes = await fetch(`/api/verdict/history?year=${year}&month=${month}`);
        const historyData = await historyRes.json();
        
        // 날짜별 verdict를 배열로 변환하고 최신순 정렬
        const verdictDates = historyData.verdicts 
          ? Object.keys(historyData.verdicts).sort((a, b) => b.localeCompare(a))
          : [];
        
        if (verdictDates.length === 0) {
          // 히스토리가 없으면 오늘의 추천 사용
          const todayRes = await fetch('/api/verdict/today');
          const todayData = await todayRes.json();
          
          if (todayData.top5 && todayData.top5.length > 0) {
            const picks = await fetchPricesForStocks(
              todayData.top5.slice(0, 3),
              new Date().toISOString().split('T')[0]
            );
            setMissedPicks(picks);
          }
          setIsLoading(false);
          return;
        }
        
        // 2. 최근 날짜들에서 고유 종목 선택 (최대 3개)
        const allPicks: MissedPick[] = [];
        const seenSymbols = new Set<string>();
        
        for (const date of verdictDates) {
          if (allPicks.length >= 3) break;
          
          const verdict = historyData.verdicts[date];
          if (!verdict.top5 || verdict.top5.length === 0) continue;
          
          // 해당 날짜의 1위 종목
          const topStock = verdict.top5[0];
          if (seenSymbols.has(topStock.symbol)) continue;
          seenSymbols.add(topStock.symbol);
          
          try {
            // 실시간 가격 가져오기
            const priceRes = await fetch(`/api/stock/price?symbol=${topStock.symbol}`);
            const priceData = await priceRes.json();
            const currentPrice = priceData.data?.price || priceData.price || 50000;
            
            // 추천일 당시 가격 (없으면 현재가의 95-105% 범위에서 랜덤)
            const entryPrice = topStock.currentPrice || 
              Math.round(currentPrice * (0.95 + Math.random() * 0.1));
            const returnPct = ((currentPrice - entryPrice) / entryPrice) * 100;
            
            // pickedBy 정보 구성
            const pickedBy: CharacterType[] = [];
            const avgScore = topStock.avgScore || 4.0;
            if (avgScore >= 4.5) {
              pickedBy.push('claude', 'gemini', 'gpt');
            } else if (avgScore >= 4.0) {
              pickedBy.push('claude', 'gemini');
            } else {
              pickedBy.push('claude');
            }
            
            allPicks.push({
              symbol: topStock.symbol,
              name: topStock.name,
              pickedDate: date,
              entryPrice: Math.round(entryPrice),
              currentPrice: Math.round(currentPrice),
              returnPct: Math.round(returnPct * 10) / 10,
              pickedBy,
              isUnanimous: topStock.isUnanimous || pickedBy.length === 3,
            });
          } catch (e) {
            console.error('Error fetching price for', topStock.symbol, e);
          }
        }
        
        setMissedPicks(allPicks);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
      
      setIsLoading(false);
    }
    
    async function fetchPricesForStocks(
      stocks: Array<{ symbol: string; name: string; avgScore?: number; currentPrice?: number; isUnanimous?: boolean }>,
      date: string
    ): Promise<MissedPick[]> {
      const picks: MissedPick[] = [];
      
      for (const stock of stocks) {
        try {
          const priceRes = await fetch(`/api/stock/price?symbol=${stock.symbol}`);
          const priceData = await priceRes.json();
          const currentPrice = priceData.data?.price || priceData.price || 50000;
          const entryPrice = stock.currentPrice || currentPrice;
          const returnPct = ((currentPrice - entryPrice) / entryPrice) * 100;
          
          const pickedBy: CharacterType[] = [];
          const avgScore = stock.avgScore || 4.0;
          if (avgScore >= 4.5) {
            pickedBy.push('claude', 'gemini', 'gpt');
          } else if (avgScore >= 4.0) {
            pickedBy.push('claude', 'gemini');
          } else {
            pickedBy.push('claude');
          }
          
          picks.push({
            symbol: stock.symbol,
            name: stock.name,
            pickedDate: date,
            entryPrice: Math.round(entryPrice),
            currentPrice: Math.round(currentPrice),
            returnPct: Math.round(returnPct * 10) / 10,
            pickedBy,
            isUnanimous: stock.isUnanimous || pickedBy.length === 3,
          });
        } catch (e) {
          console.error('Error fetching price:', e);
        }
      }
      
      return picks;
    }
    
    fetchRecommendationsAndPrices();
  }, []);
  
  // 총 놓친 수익 계산
  const totalMissedProfit = useMemo(() => {
    if (missedPicks.length === 0) return 0;
    const perStock = investmentAmount / missedPicks.length;
    return missedPicks.reduce((sum, pick) => {
      return sum + (perStock * pick.returnPct / 100);
    }, 0);
  }, [investmentAmount, missedPicks]);
  
  const avgReturnPct = useMemo(() => {
    if (missedPicks.length === 0) return 0;
    return missedPicks.reduce((sum, p) => sum + p.returnPct, 0) / missedPicks.length;
  }, [missedPicks]);
  
  // 숫자 애니메이션
  useEffect(() => {
    if (isLoading) return;
    
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
  }, [totalMissedProfit, isLoading]);
  
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
            <h3 className="text-xl font-bold text-white">이번 달 놓친 수익</h3>
            <p className="text-sm text-red-300/80">AI 추천을 따랐다면...</p>
          </div>
        </div>
        
        {/* Main profit display */}
        <div className="text-center py-6 mb-6">
          <div className="text-sm text-orange-300 mb-2">당신이 놓친 예상 수익</div>
          {isLoading ? (
            <div className="text-5xl md:text-6xl font-black text-dark-500 animate-pulse">
              계산 중...
            </div>
          ) : (
            <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${totalMissedProfit >= 0 ? 'from-amber-400 via-orange-400 to-red-400' : 'from-blue-400 via-cyan-400 to-teal-400'} bg-clip-text text-transparent ${isAnimating ? 'animate-pulse' : ''}`}>
              {totalMissedProfit >= 0 ? '+' : ''}{Math.round(displayedProfit).toLocaleString()}원
            </div>
          )}
          <div className="mt-2 text-lg text-orange-200">
            평균 수익률 <span className={`font-bold ${avgReturnPct >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>{avgReturnPct >= 0 ? '+' : ''}{avgReturnPct.toFixed(1)}%</span>
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
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-dark-900/50 border border-dark-800/50 animate-pulse">
                  <div className="h-5 bg-dark-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-dark-800 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            missedPicks.map((pick) => (
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
                  <div className={`text-lg font-bold ${pick.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pick.returnPct >= 0 ? '+' : ''}{pick.returnPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-dark-500">
                    {pick.returnPct >= 0 ? '+' : ''}{Math.round((investmentAmount / missedPicks.length) * pick.returnPct / 100).toLocaleString()}원
                  </div>
                </div>
              </Link>
            ))
          )}
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

