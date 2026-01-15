'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  AlertCircleIcon,
  BellIcon,
  ArrowRightIcon,
  EyeOffIcon,
  ZapIcon,
} from 'lucide-react';
import Link from 'next/link';

interface MissedStock {
  name: string;
  symbol: string;
  alertPrice: number;
  currentPrice: number;
  changePercent: number;
  alertTime: string;
  alertType: 'PRICE_SURGE' | 'BUY_SIGNAL';
}

interface MissedOpportunityProps {
  variant?: 'card' | 'banner' | 'modal';
  targetPlan?: 'basic' | 'pro' | 'vip';
  onCtaClick?: () => void;
}

export function MissedOpportunity({
  variant = 'card',
  targetPlan = 'pro',
  onCtaClick,
}: MissedOpportunityProps) {
  const [missedStocks, setMissedStocks] = useState<MissedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 실제 급등 데이터 로드
  useEffect(() => {
    const fetchMissedOpportunities = async () => {
      try {
        // 최근 PRO/VIP 알림 중 급등 종목 조회
        const response = await fetch('/api/marketing/missed-opportunities');
        const data = await response.json();

        if (data.success && data.stocks?.length > 0) {
          setMissedStocks(data.stocks);
        } else {
          // 폴백: 최근 급등 데이터 사용
          setMissedStocks([
            {
              name: '에코프로',
              symbol: '086520',
              alertPrice: 520000,
              currentPrice: 582400,
              changePercent: 12.0,
              alertTime: '어제 오전 9:15',
              alertType: 'BUY_SIGNAL',
            },
            {
              name: '두산에너빌리티',
              symbol: '034020',
              alertPrice: 18500,
              currentPrice: 21200,
              changePercent: 14.6,
              alertTime: '어제 오후 2:30',
              alertType: 'PRICE_SURGE',
            },
            {
              name: 'HD현대일렉트릭',
              symbol: '267260',
              alertPrice: 285000,
              currentPrice: 312000,
              changePercent: 9.5,
              alertTime: '어제 오전 10:45',
              alertType: 'BUY_SIGNAL',
            },
          ]);
        }
      } catch (error) {
        // 폴백 데이터
        setMissedStocks([
          {
            name: 'HD현대일렉트릭',
            symbol: '267260',
            alertPrice: 285000,
            currentPrice: 312000,
            changePercent: 9.5,
            alertTime: '어제 오전 10:45',
            alertType: 'BUY_SIGNAL',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMissedOpportunities();
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (missedStocks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % missedStocks.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [missedStocks.length]);

  const currentStock = missedStocks[currentIndex];

  const planLabels = {
    basic: { name: 'BASIC', color: 'blue' },
    pro: { name: 'PRO', color: 'purple' },
    vip: { name: 'VIP', color: 'amber' },
  };

  const plan = planLabels[targetPlan];

  if (loading || !currentStock) {
    return (
      <div className="bg-dark-800/50 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-dark-700 rounded mb-4" />
        <div className="h-16 w-full bg-dark-700 rounded" />
      </div>
    );
  }

  // 배너 스타일
  if (variant === 'banner') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-xl p-4">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
              <AlertCircleIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-red-300">
                <span className="font-bold">{currentStock.name}</span>이{' '}
                <span className="text-red-400 font-bold">+{currentStock.changePercent}%</span> 상승했습니다.
              </p>
              <p className="text-xs text-dark-400">
                {plan.name} 회원은 {currentStock.alertTime}에 알림을 받았습니다.
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            onClick={onCtaClick}
            className={`px-4 py-2 bg-${plan.color}-500 text-white text-sm font-medium rounded-lg hover:bg-${plan.color}-600 transition-colors whitespace-nowrap`}
          >
            지금 {plan.name} 시작하기
          </Link>
        </div>
      </div>
    );
  }

  // 카드 스타일 (기본)
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-dark-800/80 via-red-500/5 to-dark-800/80 border border-red-500/20 rounded-xl p-6">
      {/* 배경 이펙트 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[60px]" />
      <div className="absolute inset-0 bg-grid opacity-5" />

      <div className="relative">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
            <BellIcon className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">
              어제 {plan.name} 회원이 받은 알림
            </span>
          </div>
        </div>

        {/* 놓친 종목 정보 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-dark-100">{currentStock.name}</span>
            <span className="text-sm text-dark-500">({currentStock.symbol})</span>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-xs text-dark-500">알림 시점</p>
              <p className="text-lg font-bold text-dark-300">
                {currentStock.alertPrice.toLocaleString()}원
              </p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-dark-600" />
            <div>
              <p className="text-xs text-dark-500">현재가</p>
              <p className="text-lg font-bold text-green-400">
                {currentStock.currentPrice.toLocaleString()}원
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
            <TrendingUpIcon className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold text-xl">
              +{currentStock.changePercent}%
            </span>
            <span className="text-dark-400 text-sm">상승</span>
          </div>
        </div>

        {/* FOMO 메시지 */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-dark-900/50 rounded-lg">
          <EyeOffIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-dark-300 text-sm">
            <span className="text-red-400 font-medium">당신은 이 기회를 놓쳤습니다.</span>{' '}
            {plan.name} 회원이었다면 {currentStock.alertTime}에 알림을 받았을 거예요.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/pricing"
          onClick={onCtaClick}
          className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-${plan.color}-500 to-${plan.color}-600 text-white font-medium rounded-xl hover:from-${plan.color}-600 hover:to-${plan.color}-700 transition-all group`}
        >
          <ZapIcon className="w-5 h-5 group-hover:animate-pulse" />
          지금 {plan.name} 시작하기
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* 인디케이터 */}
        {missedStocks.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {missedStocks.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-red-400' : 'bg-dark-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MissedOpportunity;
