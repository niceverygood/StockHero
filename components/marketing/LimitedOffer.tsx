'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClockIcon,
  ZapIcon,
  SparklesIcon,
  ArrowRightIcon,
  GiftIcon,
  PercentIcon,
} from 'lucide-react';
import Link from 'next/link';

interface LimitedOfferProps {
  /** 할인율 (%) */
  discountPercent?: number;
  /** 종료 시간 (Date 객체 또는 시간 문자열) */
  endTime?: Date | string;
  /** 대상 플랜 */
  targetPlan?: 'basic' | 'pro' | 'vip';
  /** 스타일 변형 */
  variant?: 'banner' | 'floating' | 'inline';
  /** 닫기 가능 여부 */
  dismissible?: boolean;
  /** CTA 클릭 핸들러 */
  onCtaClick?: () => void;
  /** 닫기 핸들러 */
  onDismiss?: () => void;
}

// 타이머 계산 함수
function calculateTimeLeft(endTime: Date): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = endTime.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: false };
}

// 기본 종료 시간 (오늘 자정)
function getDefaultEndTime(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function LimitedOffer({
  discountPercent = 50,
  endTime,
  targetPlan = 'pro',
  variant = 'banner',
  dismissible = true,
  onCtaClick,
  onDismiss,
}: LimitedOfferProps) {
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
    isExpired: false,
  });

  const endDate = useMemo(() => {
    if (endTime instanceof Date) return endTime;
    if (typeof endTime === 'string') return new Date(endTime);
    return getDefaultEndTime();
  }, [endTime]);

  // 타이머 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endDate));
    }, 1000);

    // 초기 계산
    setTimeLeft(calculateTimeLeft(endDate));

    return () => clearInterval(timer);
  }, [endDate]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed || timeLeft.isExpired) return null;

  const planLabels = {
    basic: { name: 'BASIC', color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    pro: { name: 'PRO', color: 'purple', gradient: 'from-purple-500 to-purple-600' },
    vip: { name: 'VIP', color: 'amber', gradient: 'from-amber-500 to-amber-600' },
  };

  const plan = planLabels[targetPlan];

  // 타이머 디스플레이
  const TimerDisplay = () => (
    <div className="flex items-center gap-1 font-mono">
      <div className="flex items-center justify-center min-w-[2.5rem] h-9 bg-dark-900/50 rounded-lg px-2">
        <span className="text-lg font-bold text-white">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/50">:</span>
      <div className="flex items-center justify-center min-w-[2.5rem] h-9 bg-dark-900/50 rounded-lg px-2">
        <span className="text-lg font-bold text-white">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/50">:</span>
      <div className="flex items-center justify-center min-w-[2.5rem] h-9 bg-dark-900/50 rounded-lg px-2">
        <span className="text-lg font-bold text-red-400 animate-pulse">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );

  // 플로팅 스타일
  if (variant === 'floating') {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-bounce-in">
        <div className={`relative overflow-hidden bg-gradient-to-br ${plan.gradient} rounded-2xl p-5 shadow-2xl`}>
          {/* 배경 이펙트 */}
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

          <div className="relative">
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute top-0 right-0 p-1 text-white/60 hover:text-white"
              >
                ✕
              </button>
            )}

            <div className="flex items-center gap-2 mb-3">
              <GiftIcon className="w-5 h-5 text-white" />
              <span className="text-white font-bold">한정 특가!</span>
            </div>

            <p className="text-white/90 text-sm mb-3">
              첫 결제 <span className="text-2xl font-black">{discountPercent}%</span> 할인
            </p>

            <div className="mb-4">
              <p className="text-white/70 text-xs mb-1">남은 시간</p>
              <TimerDisplay />
            </div>

            <Link
              href="/pricing"
              onClick={onCtaClick}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-dark-900 font-bold rounded-xl hover:bg-white/90 transition-colors"
            >
              <ZapIcon className="w-4 h-4" />
              지금 {plan.name} 시작하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 인라인 스타일
  if (variant === 'inline') {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-r ${plan.gradient} rounded-xl p-4`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <PercentIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold">
                첫 결제 {discountPercent}% 할인
              </p>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <ClockIcon className="w-3 h-3" />
                <span>
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')} 남음
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            onClick={onCtaClick}
            className="px-4 py-2 bg-white text-dark-900 font-medium rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            할인 받기
          </Link>
        </div>
      </div>
    );
  }

  // 배너 스타일 (기본)
  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${plan.gradient} border-b border-white/10`}>
      {/* 애니메이션 배경 */}
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative container-app py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-bold">🎉 한정 특가</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/30" />
            <p className="text-white/90">
              첫 결제 <span className="font-black text-lg">{discountPercent}%</span> 할인
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/80">
              <ClockIcon className="w-4 h-4" />
              <TimerDisplay />
            </div>

            <Link
              href="/pricing"
              onClick={onCtaClick}
              className="flex items-center gap-2 px-4 py-2 bg-white text-dark-900 font-bold rounded-lg hover:bg-white/90 transition-colors group"
            >
              {plan.name} 시작하기
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1 text-white/60 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LimitedOffer;
