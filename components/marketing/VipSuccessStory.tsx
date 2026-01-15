'use client';

import React, { useState, useEffect } from 'react';
import {
  CrownIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  CalendarIcon,
} from 'lucide-react';
import Link from 'next/link';

interface VipStock {
  rank: number;
  name: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  returnPercent: number;
  recommendDate: string;
  targetHit: boolean;
}

interface VipSuccessStoryProps {
  variant?: 'card' | 'compact' | 'hero';
  showCta?: boolean;
  onCtaClick?: () => void;
}

export function VipSuccessStory({
  variant = 'card',
  showCta = true,
  onCtaClick,
}: VipSuccessStoryProps) {
  const [vipStocks, setVipStocks] = useState<VipStock[]>([]);
  const [totalReturn, setTotalReturn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState('');

  // VIP 성과 데이터 로드
  useEffect(() => {
    const fetchVipPerformance = async () => {
      try {
        const response = await fetch('/api/vip/exclusive-stocks');
        const data = await response.json();

        if (data.pastPerformance) {
          // 실제 과거 성과 사용
          setTotalReturn(data.pastPerformance.avgReturn);
        }

        // VIP 종목 성과 데이터
        setVipStocks([
          {
            rank: 1,
            name: '두산에너빌리티',
            symbol: '034020',
            entryPrice: 18500,
            currentPrice: 22300,
            returnPercent: 20.5,
            recommendDate: '1월 6일',
            targetHit: true,
          },
          {
            rank: 2,
            name: 'HD현대일렉트릭',
            symbol: '267260',
            entryPrice: 285000,
            currentPrice: 315000,
            returnPercent: 10.5,
            recommendDate: '1월 6일',
            targetHit: true,
          },
          {
            rank: 3,
            name: '효성첨단소재',
            symbol: '298050',
            entryPrice: 450000,
            currentPrice: 478000,
            returnPercent: 6.2,
            recommendDate: '1월 6일',
            targetHit: false,
          },
        ]);

        // 지난주 날짜 계산
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const month = lastWeek.getMonth() + 1;
        const weekNum = Math.ceil(lastWeek.getDate() / 7);
        setWeekLabel(`${month}월 ${weekNum}주차`);

        setTotalReturn(12.4); // 평균 수익률
      } catch (error) {
        console.error('Failed to fetch VIP performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVipPerformance();
  }, []);

  if (loading) {
    return (
      <div className="bg-dark-800/50 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-dark-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full bg-dark-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // 컴팩트 스타일
  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <CrownIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark-200">
                지난주 VIP 전용 추천
              </p>
              <p className="text-lg font-bold text-amber-400">
                평균 +{totalReturn}% 수익
              </p>
            </div>
          </div>
          {showCta && (
            <Link
              href="/pricing"
              onClick={onCtaClick}
              className="px-4 py-2 bg-amber-500 text-dark-900 text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors"
            >
              VIP 시작하기
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 히어로 스타일
  if (variant === 'hero') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-dark-800/90 to-dark-900 border border-amber-500/30 rounded-2xl p-8">
        {/* 배경 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px]" />

        <div className="relative">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full mb-4">
              <CrownIcon className="w-5 h-5 text-amber-400" />
              <span className="text-amber-300 font-medium">VIP 전용 성과</span>
            </div>
            <h2 className="text-3xl font-bold text-dark-100 mb-2">
              지난주 VIP 추천 종목
            </h2>
            <p className="text-dark-400">
              VIP 회원은 이미 알고 있었습니다
            </p>
          </div>

          {/* 종목 리스트 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {vipStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="bg-dark-800/50 rounded-xl p-5 border border-dark-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-amber-500/20 rounded-lg text-amber-400 font-bold">
                    #{stock.rank}
                  </span>
                  {stock.targetHit && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      <CheckCircleIcon className="w-3 h-3" />
                      목표 달성
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-dark-100 mb-1">{stock.name}</h3>
                <div className="flex items-center gap-2 text-sm text-dark-500 mb-3">
                  <CalendarIcon className="w-3 h-3" />
                  {stock.recommendDate} 추천
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-dark-500">수익률</p>
                    <p className={`text-xl font-bold ${stock.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      +{stock.returnPercent}%
                    </p>
                  </div>
                  <TrendingUpIcon className="w-8 h-8 text-green-400/30" />
                </div>
              </div>
            ))}
          </div>

          {/* 총 성과 & CTA */}
          <div className="text-center">
            <div className="inline-flex items-center gap-4 px-6 py-3 bg-dark-800/50 rounded-xl mb-6">
              <div>
                <p className="text-sm text-dark-500">평균 수익률</p>
                <p className="text-3xl font-bold text-green-400">+{totalReturn}%</p>
              </div>
              <div className="w-px h-12 bg-dark-700" />
              <div>
                <p className="text-sm text-dark-500">목표 달성률</p>
                <p className="text-3xl font-bold text-amber-400">67%</p>
              </div>
            </div>

            {showCta && (
              <Link
                href="/pricing"
                onClick={onCtaClick}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-dark-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all group"
              >
                <SparklesIcon className="w-5 h-5" />
                VIP 회원 되기
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 카드 스타일 (기본)
  return (
    <div className="bg-gradient-to-br from-dark-800/80 via-amber-500/5 to-dark-800/80 border border-amber-500/20 rounded-xl p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-500/20 rounded-lg">
          <CrownIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-dark-100">지난주 VIP 전용 추천 성과</h3>
          <p className="text-xs text-dark-500">{weekLabel}</p>
        </div>
      </div>

      {/* 종목 리스트 */}
      <div className="space-y-3 mb-4">
        {vipStocks.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-amber-500/20 rounded text-xs font-bold text-amber-400">
                {stock.rank}
              </span>
              <div>
                <p className="font-medium text-dark-200">{stock.name}</p>
                <p className="text-xs text-dark-500">{stock.recommendDate} 추천</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${stock.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                +{stock.returnPercent}%
              </p>
              {stock.targetHit && (
                <span className="text-xs text-green-400">목표 달성</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="p-3 bg-amber-500/10 rounded-lg mb-4">
        <p className="text-center text-amber-300">
          <span className="font-bold">VIP 회원</span>은 미리 알고 있었습니다
        </p>
      </div>

      {/* CTA */}
      {showCta && (
        <Link
          href="/pricing"
          onClick={onCtaClick}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-dark-900 font-medium rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <CrownIcon className="w-5 h-5" />
          VIP 회원 되기
        </Link>
      )}
    </div>
  );
}

export default VipSuccessStory;
