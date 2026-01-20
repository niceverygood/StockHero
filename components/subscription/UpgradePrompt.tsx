'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useSubscription, 
  useCurrentPlan,
  PLAN_PRICES, 
  PLAN_DISPLAY_NAMES,
  FEATURE_ICONS,
  FEATURE_NAMES,
  getYearlyDiscount,
} from '@/lib/subscription';

interface UpgradePromptProps {
  type?: 'inline' | 'modal' | 'banner' | 'toast';
  feature?: string;
  recommendedPlan?: 'basic' | 'pro' | 'vip';
  successStory?: {
    text: string;
    value: string;
    emoji?: string;
  };
  onClose?: () => void;
  className?: string;
}

// 성공 스토리 기본 데이터
const DEFAULT_SUCCESS_STORIES = [
  { text: '지난주 VIP 추천 수익률', value: '+18.7%', emoji: '🚀' },
  { text: '이번 달 만장일치 종목', value: '+12.3%', emoji: '🎯' },
  { text: '프로 회원 평균 수익률', value: '+8.5%', emoji: '📈' },
];

export function UpgradePrompt({
  type = 'inline',
  feature,
  recommendedPlan = 'basic',
  successStory,
  onClose,
  className = '',
}: UpgradePromptProps) {
  const router = useRouter();
  const { planName } = useCurrentPlan();
  const [isVisible, setIsVisible] = useState(true);
  const [currentStory, setCurrentStory] = useState(successStory || DEFAULT_SUCCESS_STORIES[0]);

  // 성공 스토리 로테이션 (모달/배너용)
  useEffect(() => {
    if (type !== 'modal' && type !== 'banner') return;
    if (successStory) return;

    const interval = setInterval(() => {
      setCurrentStory(prev => {
        const currentIndex = DEFAULT_SUCCESS_STORIES.findIndex(s => s.text === prev.text);
        return DEFAULT_SUCCESS_STORIES[(currentIndex + 1) % DEFAULT_SUCCESS_STORIES.length];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [type, successStory]);

  const handleUpgrade = () => {
    router.push('/subscription');
    onClose?.();
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const planPrice = PLAN_PRICES[recommendedPlan];
  const planDisplayName = PLAN_DISPLAY_NAMES[recommendedPlan];
  const yearlyDiscount = getYearlyDiscount(recommendedPlan);
  const featureIcon = feature ? FEATURE_ICONS[feature] : '✨';
  const featureName = feature ? FEATURE_NAMES[feature] : '프리미엄 기능';

  // ====== INLINE 타입 ======
  if (type === 'inline') {
    return (
      <div className={`p-4 bg-gradient-to-r from-dark-800/80 to-dark-800/60 
                       rounded-xl border border-dark-700/50 ${className}`}>
        <div className="flex items-center gap-4">
          {/* 아이콘 */}
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-2xl">
            {featureIcon}
          </div>

          {/* 텍스트 */}
          <div className="flex-1">
            <p className="text-dark-100 font-medium">
              {featureName}을(를) 사용하려면
            </p>
            <p className="text-dark-400 text-sm">
              <span className="text-brand-400 font-semibold">{planDisplayName}</span> 플랜이 필요합니다
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white 
                       font-medium rounded-lg transition-colors text-sm"
          >
            업그레이드
          </button>
        </div>

        {/* 성공 스토리 */}
        {currentStory && (
          <div className="mt-3 pt-3 border-t border-dark-700/50 flex items-center gap-2">
            <span className="text-lg">{currentStory.emoji}</span>
            <span className="text-dark-400 text-sm">{currentStory.text}</span>
            <span className="text-emerald-400 font-bold">{currentStory.value}</span>
          </div>
        )}
      </div>
    );
  }

  // ====== BANNER 타입 ======
  if (type === 'banner') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-brand-600 via-purple-600 to-brand-600 
                        py-3 px-4 animate-gradient-x">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* 성공 스토리 */}
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl animate-bounce">{currentStory.emoji}</span>
              <div>
                <span className="text-white/80 text-sm">{currentStory.text}</span>
                <span className="ml-2 font-bold text-lg">{currentStory.value}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpgrade}
                className="px-5 py-2 bg-white text-brand-600 font-bold rounded-full
                           hover:bg-gray-100 transition-colors text-sm whitespace-nowrap"
              >
                {planDisplayName} 시작하기 →
              </button>
              <button
                onClick={handleClose}
                className="text-white/60 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* 반짝이는 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                        -translate-x-full animate-shimmer pointer-events-none" />
      </div>
    );
  }

  // ====== TOAST 타입 ======
  if (type === 'toast') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 animate-slideUp ${className}`}>
        <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl 
                        p-4 max-w-sm">
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-dark-500 hover:text-dark-300 p-1"
          >
            ✕
          </button>

          {/* 콘텐츠 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500
                            flex items-center justify-center text-xl flex-shrink-0">
              {featureIcon}
            </div>
            <div>
              <p className="text-dark-100 font-medium pr-6">
                {featureName} 제한에 도달했습니다
              </p>
              <p className="text-dark-400 text-sm mt-1">
                {planDisplayName}으로 업그레이드하고 더 많이 이용하세요
              </p>
            </div>
          </div>

          {/* 성공 스토리 */}
          <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg flex items-center gap-2">
            <span>{currentStory.emoji}</span>
            <span className="text-dark-300 text-xs">{currentStory.text}</span>
            <span className="text-emerald-400 text-sm font-bold">{currentStory.value}</span>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            className="w-full mt-4 py-2.5 bg-gradient-to-r from-brand-500 to-purple-500
                       text-white font-semibold rounded-xl hover:from-brand-400 hover:to-purple-400
                       transition-all"
          >
            월 {planPrice.monthly.toLocaleString()}원으로 업그레이드
          </button>
        </div>
      </div>
    );
  }

  // ====== MODAL 타입 ======
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="relative bg-dark-900 rounded-3xl shadow-2xl max-w-md w-full 
                      border border-dark-700 overflow-hidden animate-scaleIn">
        {/* 상단 그라데이션 */}
        <div className="h-2 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />

        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-dark-500 hover:text-dark-300 
                     w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center"
        >
          ✕
        </button>

        <div className="p-6">
          {/* 아이콘 */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20
                          flex items-center justify-center text-4xl mb-4">
            {featureIcon}
          </div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold text-center text-dark-100 mb-2">
            {featureName}
          </h2>
          <p className="text-center text-dark-400 mb-6">
            <span className="text-brand-400 font-semibold">{planDisplayName}</span> 플랜에서 
            이용할 수 있습니다
          </p>

          {/* 성공 스토리 카드 */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 
                          rounded-xl p-4 mb-6 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentStory.emoji}</span>
                <span className="text-dark-300 text-sm">{currentStory.text}</span>
              </div>
              <span className="text-emerald-400 text-xl font-bold">{currentStory.value}</span>
            </div>
          </div>

          {/* 가격 */}
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-dark-100">
                {planPrice.monthly.toLocaleString()}
              </span>
              <span className="text-dark-400">원/월</span>
            </div>
            {yearlyDiscount > 0 && (
              <p className="text-brand-400 text-sm mt-1">
                연간 결제 시 {yearlyDiscount}% 할인
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            className="w-full py-4 bg-gradient-to-r from-brand-500 to-purple-500
                       text-white font-bold text-lg rounded-xl
                       hover:from-brand-400 hover:to-purple-400
                       transform hover:scale-[1.02] transition-all duration-200
                       shadow-lg shadow-brand-500/25"
          >
            🚀 {planDisplayName} 시작하기
          </button>

          {/* 부가 정보 */}
          <p className="text-center text-dark-500 text-xs mt-4">
            언제든지 취소 가능 • 7일 무료 체험
          </p>
        </div>
      </div>
    </div>
  );
}

// 업그레이드 모달 (전역 사용)
export function UpgradeModal() {
  const { upgradeModal, closeUpgradeModal } = useSubscription();

  if (!upgradeModal.isOpen) return null;

  return (
    <UpgradePrompt
      type="modal"
      feature={upgradeModal.feature}
      recommendedPlan={upgradeModal.recommendedPlan}
      onClose={closeUpgradeModal}
    />
  );
}

export default UpgradePrompt;
