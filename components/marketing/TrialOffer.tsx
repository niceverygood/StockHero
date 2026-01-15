'use client';

import React, { useState } from 'react';
import {
  GiftIcon,
  CheckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BellIcon,
  ArrowRightIcon,
  SparklesIcon,
  InfoIcon,
  ClockIcon,
} from 'lucide-react';
import Link from 'next/link';

interface TrialOfferProps {
  /** 무료 체험 기간 (일) */
  trialDays?: number;
  /** 대상 플랜 */
  targetPlan?: 'basic' | 'pro' | 'vip';
  /** 스타일 변형 */
  variant?: 'card' | 'modal' | 'inline';
  /** 주요 기능 리스트 커스텀 */
  features?: string[];
  /** CTA 클릭 핸들러 */
  onCtaClick?: () => void;
  /** 닫기 핸들러 */
  onClose?: () => void;
}

const DEFAULT_FEATURES = {
  basic: [
    '모닝 브리핑 알림',
    '상담 1일 5회',
    '전체 Top 5 공개',
    '30일 백테스트',
  ],
  pro: [
    '실시간 가격 알림',
    '무제한 AI 상담',
    '전체 Top 5 + 목표가',
    '전체 백테스트 기간',
    '매수/매도 시그널',
  ],
  vip: [
    'VIP 전용 종목 3개',
    '실시간 매매 시그널',
    '커스텀 AI 토론',
    '심층 분석 리포트',
    '우선 고객 지원',
  ],
};

const PLAN_INFO = {
  basic: { name: 'BASIC', color: 'blue', gradient: 'from-blue-500 to-blue-600', price: '9,900' },
  pro: { name: 'PRO', color: 'purple', gradient: 'from-purple-500 to-purple-600', price: '29,900' },
  vip: { name: 'VIP', color: 'amber', gradient: 'from-amber-500 to-amber-600', price: '99,900' },
};

export function TrialOffer({
  trialDays = 7,
  targetPlan = 'pro',
  variant = 'card',
  features,
  onCtaClick,
  onClose,
}: TrialOfferProps) {
  const [isLoading, setIsLoading] = useState(false);

  const plan = PLAN_INFO[targetPlan];
  const featureList = features || DEFAULT_FEATURES[targetPlan];

  const handleStartTrial = async () => {
    setIsLoading(true);
    onCtaClick?.();
    // 실제로는 결제 페이지로 이동하거나 API 호출
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  // 인라인 스타일
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-between gap-4 p-4 bg-gradient-to-r ${plan.gradient} rounded-xl flex-wrap`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <GiftIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold">
              {plan.name} {trialDays}일 무료 체험
            </p>
            <p className="text-white/70 text-sm">
              카드 등록 후 {trialDays}일간 무료, 자동 결제 전 알림
            </p>
          </div>
        </div>
        <button
          onClick={handleStartTrial}
          disabled={isLoading}
          className="px-4 py-2 bg-white text-dark-900 font-medium rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {isLoading ? '처리 중...' : '무료 체험 시작'}
        </button>
      </div>
    );
  }

  // 모달 스타일
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="relative w-full max-w-md bg-dark-800 rounded-2xl overflow-hidden">
          {/* 헤더 배경 */}
          <div className={`relative h-32 bg-gradient-to-br ${plan.gradient}`}>
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 text-white/60 hover:text-white bg-white/10 rounded-full"
              >
                ✕
              </button>
            )}
            
            <div className="absolute bottom-4 left-6">
              <div className="flex items-center gap-2 mb-1">
                <GiftIcon className="w-6 h-6 text-white" />
                <span className="text-white font-bold text-xl">{plan.name} 무료 체험</span>
              </div>
              <p className="text-white/80">{trialDays}일간 모든 기능을 무료로</p>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-sm text-dark-400 mb-3">체험 기간 동안 이용 가능</h4>
              <ul className="space-y-2">
                {featureList.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-dark-200">
                    <CheckIcon className={`w-4 h-4 text-${plan.color}-400`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* 안내 */}
            <div className="p-3 bg-dark-900/50 rounded-lg mb-6">
              <div className="flex items-start gap-2 text-dark-400 text-sm">
                <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>• 결제 수단 등록이 필요합니다</p>
                  <p>• {trialDays}일 후 자동 결제 (월 {plan.price}원)</p>
                  <p>• 결제 1일 전 알림을 보내드려요</p>
                  <p>• 언제든 취소 가능</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleStartTrial}
              disabled={isLoading}
              className={`w-full py-3 bg-gradient-to-r ${plan.gradient} text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                '처리 중...'
              ) : (
                <>
                  <CreditCardIcon className="w-5 h-5" />
                  카드 등록하고 무료 체험 시작
                </>
              )}
            </button>

            <p className="text-center text-dark-500 text-xs mt-3">
              <ShieldCheckIcon className="w-3 h-3 inline mr-1" />
              안전한 결제, 언제든 취소 가능
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 카드 스타일 (기본)
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-dark-800/80 to-dark-900/80 border border-dark-700 rounded-2xl">
      {/* 배경 */}
      <div className={`absolute top-0 right-0 w-40 h-40 bg-${plan.color}-500/10 rounded-full blur-[60px]`} />
      
      <div className="relative p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-${plan.color}-500/20 rounded-xl`}>
            <GiftIcon className={`w-6 h-6 text-${plan.color}-400`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark-100">
              {plan.name} {trialDays}일 무료 체험
            </h3>
            <p className="text-sm text-dark-400">
              모든 기능을 무료로 체험해보세요
            </p>
          </div>
        </div>

        {/* 기능 리스트 */}
        <div className="mb-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {featureList.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-dark-300 text-sm">
                <CheckIcon className={`w-4 h-4 text-${plan.color}-400 flex-shrink-0`} />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* 타임라인 */}
        <div className="flex items-center gap-2 mb-6 p-3 bg-dark-800/50 rounded-lg">
          <ClockIcon className="w-5 h-5 text-dark-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">오늘</span>
              <span className="text-dark-500">→</span>
              <span className={`text-${plan.color}-400`}>{trialDays}일 무료</span>
              <span className="text-dark-500">→</span>
              <span className="text-dark-400">월 {plan.price}원</span>
            </div>
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="flex items-start gap-2 mb-6 text-dark-500 text-sm">
          <BellIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            결제 수단 등록 필요 · 자동 결제 1일 전 알림 · 언제든 취소 가능
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleStartTrial}
          disabled={isLoading}
          className={`w-full py-3.5 bg-gradient-to-r ${plan.gradient} text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group`}
        >
          {isLoading ? (
            '처리 중...'
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              무료 체험 시작하기
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1 mt-3 text-dark-500 text-xs">
          <ShieldCheckIcon className="w-3 h-3" />
          <span>안전한 결제 · 개인정보 보호</span>
        </div>
      </div>
    </div>
  );
}

export default TrialOffer;
