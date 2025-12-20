'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HiddenGem {
  rank: number;
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  marketCap: string;
  potentialReturn: string;
  timeframe: string;
  reason: string;
  catalyst: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  conviction: number;
  currentPrice: number;
  change: number;
  changePercent: number;
}

interface HiddenGemsData {
  title: string;
  subtitle: string;
  description: string;
  generatedAt: string;
  displayTime: string;
  gems: HiddenGem[];
  disclaimer: string;
}

const RISK_COLORS = {
  high: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

const RISK_LABELS = {
  high: '고위험',
  medium: '중위험',
  low: '저위험',
};

function GemCard({ gem, index, isPremium }: { gem: HiddenGem; index: number; isPremium: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_COLORS[gem.riskLevel];
  
  // 무료 유저는 첫 번째 종목만 부분 공개
  const isLocked = !isPremium && index > 0;
  const isPartiallyVisible = !isPremium && index === 0;
  
  if (isLocked) {
    return (
      <div className="relative rounded-2xl border border-dark-700/50 bg-dark-800/30 p-6 overflow-hidden">
        {/* 블러 처리된 콘텐츠 */}
        <div className="blur-md select-none pointer-events-none">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {gem.rank}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-dark-100">████████</span>
                <span className="px-2 py-0.5 rounded-full bg-dark-700 text-xs text-dark-400">██████</span>
              </div>
              <div className="text-sm text-dark-500">████ ████████</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-400">+██~██%</div>
              <div className="text-xs text-dark-500">██개월</div>
            </div>
          </div>
        </div>
        
        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm text-dark-300 font-medium">프리미엄 전용</p>
            <p className="text-xs text-dark-500 mt-1">숨은 보석 #{gem.rank} 종목</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`rounded-2xl border transition-all ${
      expanded 
        ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5' 
        : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/50'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-4">
          {/* Rank Badge */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25 shrink-0">
            {gem.rank}
          </div>
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Link 
                href={`/battle/${gem.symbol}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-lg text-dark-100 hover:text-violet-400 transition-colors"
              >
                {gem.name}
              </Link>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium">
                {gem.theme}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.text}`}>
                {RISK_LABELS[gem.riskLevel]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-dark-500">{gem.sector}</span>
              <span className="text-dark-600">•</span>
              <span className="text-dark-500">시총 {gem.marketCap}</span>
              {gem.currentPrice > 0 && (
                <>
                  <span className="text-dark-600">•</span>
                  <span className={gem.changePercent >= 0 ? 'text-rose-400' : 'text-blue-400'}>
                    {gem.currentPrice.toLocaleString()}원 {gem.changePercent >= 0 ? '▲' : '▼'} {Math.abs(gem.changePercent).toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Return Info */}
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-emerald-400">{gem.potentialReturn}</div>
            <div className="text-xs text-dark-500">{gem.timeframe}</div>
          </div>
          
          {/* Expand Icon */}
          <svg 
            className={`w-5 h-5 text-dark-500 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* Conviction Bar */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-dark-500">AI 확신도</span>
          <div className="flex-1 h-2 rounded-full bg-dark-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${gem.conviction}%` }}
            />
          </div>
          <span className="text-xs font-bold text-violet-400">{gem.conviction}%</span>
        </div>
      </button>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* 부분 공개 (무료 유저) */}
          {isPartiallyVisible && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                미리보기 모드
              </div>
              <p className="text-xs text-dark-400">
                프리미엄 회원은 전체 분석과 나머지 숨은 보석 종목을 확인할 수 있습니다.
              </p>
            </div>
          )}
          
          {/* Selection Reason */}
          <div className="p-4 rounded-xl bg-dark-900/50">
            <div className="flex items-center gap-2 text-violet-400 text-sm font-medium mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              선정 이유
            </div>
            <p className="text-sm text-dark-300 leading-relaxed">
              {isPartiallyVisible ? gem.reason.substring(0, 100) + '...' : gem.reason}
            </p>
          </div>
          
          {/* Catalyst */}
          {!isPartiallyVisible && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                주가 상승 촉매
              </div>
              <p className="text-sm text-dark-300">{gem.catalyst}</p>
            </div>
          )}
          
          {/* Risk Factors */}
          {!isPartiallyVisible && (
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-medium mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                리스크 요인
              </div>
              <ul className="text-sm text-dark-400 space-y-1">
                {gem.riskFactors.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 mt-1">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* CTA for partial view */}
          {isPartiallyVisible && (
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25">
              🔓 프리미엄으로 전체 분석 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HiddenGemsSection() {
  const [data, setData] = useState<HiddenGemsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false); // TODO: 실제 프리미엄 상태 연동
  
  useEffect(() => {
    async function fetchGems() {
      try {
        const res = await fetch('/api/premium/hidden-gems');
        const json = await res.json();
        
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load');
        }
      } catch (err) {
        setError('네트워크 오류');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGems();
  }, []);
  
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
            <span className="text-xl">🔮</span>
          </div>
          <div>
            <div className="h-5 w-32 bg-dark-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-48 bg-dark-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-dark-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-dark-400">숨은 보석을 불러오지 못했습니다</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <span className="text-2xl">🔮</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-dark-100 flex items-center gap-2">
              {data.title}
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium">
                PREMIUM
              </span>
            </h3>
            <p className="text-sm text-dark-500">{data.subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-dark-500">업데이트</div>
          <div className="text-sm text-dark-400 font-medium">{data.displayTime}</div>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-dark-400 mb-6 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
        💎 {data.description}
      </p>
      
      {/* Premium Teaser Banner (for non-premium users) */}
      {!isPremium && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-dark-200">
                프리미엄 회원은 3개 종목 모두 확인 가능!
              </p>
              <p className="text-xs text-dark-400 mt-0.5">
                무료 회원은 첫 번째 종목만 미리보기로 제공됩니다
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors shrink-0">
              업그레이드
            </button>
          </div>
        </div>
      )}
      
      {/* Gems List */}
      <div className="space-y-4">
        {data.gems.map((gem, index) => (
          <GemCard 
            key={gem.symbol} 
            gem={gem} 
            index={index} 
            isPremium={isPremium} 
          />
        ))}
      </div>
      
      {/* Disclaimer */}
      <div className="mt-6 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-dark-400">
            {data.disclaimer}
          </p>
        </div>
      </div>
      
      {/* Premium CTA */}
      {!isPremium && (
        <div className="mt-6">
          <button className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            프리미엄 구독하고 모든 숨은 보석 확인하기
          </button>
          <p className="text-center text-xs text-dark-500 mt-2">
            월 9,900원 • 언제든 해지 가능
          </p>
        </div>
      )}
    </div>
  );
}

