'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { 
  useCurrentPlan, 
  PLAN_FEATURES, 
  PLAN_PRICES, 
  PLAN_DISPLAY_NAMES,
  getYearlyDiscount,
  formatPrice,
  generateOrderId,
  createPaymentConfig,
} from '@/lib/subscription';
import * as PortOne from '@portone/browser-sdk/v2';

// 플랜 테마 색상
const PLAN_THEMES = {
  free: {
    gradient: 'from-slate-600 to-slate-700',
    border: 'border-slate-600/50',
    badge: 'bg-slate-500',
    button: 'bg-slate-600 hover:bg-slate-500',
    highlight: 'text-slate-400',
    icon: '🆓',
  },
  basic: {
    gradient: 'from-blue-600 to-cyan-600',
    border: 'border-blue-500/50',
    badge: 'bg-blue-500',
    button: 'bg-blue-600 hover:bg-blue-500',
    highlight: 'text-blue-400',
    icon: '💎',
  },
  pro: {
    gradient: 'from-purple-600 to-pink-600',
    border: 'border-purple-500/50',
    badge: 'bg-purple-500',
    button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
    highlight: 'text-purple-400',
    icon: '🚀',
  },
  vip: {
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/50',
    badge: 'bg-amber-500',
    button: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400',
    highlight: 'text-amber-400',
    icon: '👑',
  },
};

// 기능 목록 정의
const FEATURE_LIST = [
  { key: 'dailyConsultationLimit', name: 'AI 상담', unit: '회/일' },
  { key: 'top5VisibleCount', name: 'Top 5 종목 보기', unit: '개' },
  { key: 'showTargetPrice', name: '목표가 확인', type: 'boolean' },
  { key: 'showTargetDate', name: '목표 날짜 확인', type: 'boolean' },
  { key: 'dailyDebateLimit', name: '실시간 토론', unit: '회/일' },
  { key: 'backtestDays', name: '백테스트', unit: '일' },
  { key: 'portfolioStockLimit', name: '포트폴리오 종목', unit: '개' },
  { key: 'dailyPortfolioAnalysis', name: '포트폴리오 분석', unit: '회/일' },
  { key: 'alertsPerDay', name: '실시간 알림', unit: '회/일' },
  { key: 'hasRealTimeSignal', name: '실시간 매매 신호', type: 'boolean' },
  { key: 'hasVipStocks', name: 'VIP 전용 추천', type: 'boolean' },
  { key: 'hasPrioritySupport', name: '우선 지원', type: 'boolean' },
  { key: 'adFree', name: '광고 제거', type: 'boolean' },
  { key: 'reportDownload', name: '리포트 다운로드', unit: '회/일' },
];

// FAQ 데이터
const FAQ_DATA = [
  {
    q: '언제든 해지할 수 있나요?',
    a: '네, 언제든지 해지 가능합니다. 해지 후에도 결제 기간이 끝날 때까지는 프리미엄 기능을 이용할 수 있습니다. 해지 시 자동 갱신만 중단되며, 남은 기간에 대한 환불은 제공되지 않습니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '첫 결제 후 7일 이내에 요청하시면 전액 환불해 드립니다. 7일 이후에는 남은 기간에 대한 부분 환불이 가능합니다. 환불 요청은 고객센터로 문의해 주세요.',
  },
  {
    q: '플랜 변경은 어떻게 하나요?',
    a: '마이페이지 > 구독 관리에서 언제든 플랜을 변경할 수 있습니다. 업그레이드 시 차액만 결제되고, 다운그레이드 시 현재 결제 기간이 끝난 후 변경됩니다.',
  },
  {
    q: '연간 결제의 장점은 무엇인가요?',
    a: '연간 결제 시 최대 25% 할인된 가격으로 이용할 수 있습니다. 또한 연간 구독자에게는 추가 혜택(VIP 리포트 등)이 제공됩니다.',
  },
  {
    q: '결제 수단은 무엇이 있나요?',
    a: '신용카드, 체크카드, 카카오페이, 토스페이 등 다양한 결제 수단을 지원합니다. 자동 결제 등록 시 매월 같은 날짜에 자동으로 결제됩니다.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { planName: currentPlan, isLoading } = useCurrentPlan();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [backtestData, setBacktestData] = useState<any>(null);

  // 백테스트 데이터 로드
  useEffect(() => {
    async function fetchBacktest() {
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const res = await fetch(`/api/backtest?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        if (data.success) {
          setBacktestData(data.summary);
        }
      } catch (err) {
        console.error('Failed to fetch backtest:', err);
      }
    }
    fetchBacktest();
  }, []);

  const plans = ['free', 'basic', 'pro', 'vip'] as const;

  const getPrice = (plan: string) => {
    const prices = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
    return billingCycle === 'monthly' ? prices.monthly : Math.round(prices.yearly / 12);
  };

  const getFeatureValue = (plan: string, featureKey: string) => {
    const features = PLAN_FEATURES[plan];
    return (features as any)[featureKey];
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (plan: string) => {
    if (plan === 'free') {
      router.push('/');
      return;
    }
    
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      // 1. 서버에서 결제 정보 생성
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: plan, 
          billingCycle,
        }),
      });
      
      const paymentData = await res.json();
      
      if (!paymentData.success) {
        throw new Error(paymentData.error || '결제 정보 생성 실패');
      }
      
      // 2. 포트원 결제창 호출
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: paymentData.orderId,
        orderName: paymentData.orderName,
        totalAmount: paymentData.amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: {
          email: paymentData.customerEmail,
          fullName: paymentData.customerName,
        },
      });
      
      if (response?.code) {
        // 사용자 취소 또는 에러
        console.error('Payment error:', response.message);
        alert(response.message || '결제가 취소되었습니다.');
        return;
      }
      
      // 3. 결제 성공 - 서버에서 확인
      const confirmRes = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: response?.paymentId,
          orderId: paymentData.orderId,
        }),
      });
      
      const confirmData = await confirmRes.json();
      
      if (confirmData.success) {
        router.push('/subscription/success');
      } else {
        throw new Error(confirmData.error || '결제 확인 실패');
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-dark-950 pt-20 pb-16">
        {/* 배경 효과 */}
        <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative container-app">
          {/* ====== 헤더 섹션 ====== */}
          <section className="text-center py-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-dark-100">투자 성과를 높이는</span>
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                가장 확실한 방법
              </span>
            </h1>
            <p className="text-dark-400 text-lg mb-8 max-w-2xl mx-auto">
              AI 전문가들의 분석을 활용해 더 스마트한 투자를 시작하세요.
              <br />
              7일 무료 체험으로 부담 없이 시작할 수 있습니다.
            </p>

            {/* 월간/연간 토글 */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-dark-800 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all
                  ${billingCycle === 'monthly' 
                    ? 'bg-brand-500 text-white shadow-lg' 
                    : 'text-dark-400 hover:text-dark-200'}`}
              >
                월간
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                  ${billingCycle === 'yearly' 
                    ? 'bg-brand-500 text-white shadow-lg' 
                    : 'text-dark-400 hover:text-dark-200'}`}
              >
                연간
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  최대 25% 할인
                </span>
              </button>
            </div>
          </section>

          {/* ====== 플랜 카드 그리드 ====== */}
          <section className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const theme = PLAN_THEMES[plan];
                const features = PLAN_FEATURES[plan];
                const price = getPrice(plan);
                const yearlyDiscount = getYearlyDiscount(plan);
                const isCurrentPlan = currentPlan === plan;
                const isPro = plan === 'pro';

                return (
                  <div
                    key={plan}
                    className={`relative rounded-2xl overflow-hidden
                      ${isPro ? 'ring-2 ring-purple-500 scale-105 z-10' : ''}
                      ${isCurrentPlan ? 'ring-2 ring-brand-500' : ''}`}
                  >
                    {/* 인기 배지 */}
                    {isPro && (
                      <div className="absolute top-0 left-0 right-0 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-center">
                        <span className="text-white text-xs font-bold">🔥 가장 인기</span>
                      </div>
                    )}

                    <div className={`h-full bg-dark-900/80 border ${theme.border} backdrop-blur-sm
                                    ${isPro ? 'pt-10' : 'pt-6'} pb-6 px-6`}>
                      {/* 플랜 아이콘 & 이름 */}
                      <div className="text-center mb-4">
                        <span className="text-4xl mb-2 block">{theme.icon}</span>
                        <h3 className="text-xl font-bold text-dark-100">
                          {PLAN_DISPLAY_NAMES[plan]}
                        </h3>
                      </div>

                      {/* 가격 */}
                      <div className="text-center mb-6">
                        {price === 0 ? (
                          <div className="text-3xl font-bold text-dark-100">무료</div>
                        ) : (
                          <>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-sm text-dark-400">₩</span>
                              <span className="text-3xl font-bold text-dark-100">
                                {price.toLocaleString()}
                              </span>
                              <span className="text-dark-400">/월</span>
                            </div>
                            {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                              <p className="text-emerald-400 text-sm mt-1">
                                연간 결제 시 {yearlyDiscount}% 할인
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* 주요 기능 리스트 */}
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2 text-sm">
                          <span className={theme.highlight}>✓</span>
                          <span className="text-dark-300">
                            AI 상담 {features.dailyConsultationLimit === -1 ? '무제한' : `${features.dailyConsultationLimit}회/일`}
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <span className={theme.highlight}>✓</span>
                          <span className="text-dark-300">
                            Top {features.top5VisibleCount} 종목 확인
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {features.showTargetPrice ? (
                            <span className={theme.highlight}>✓</span>
                          ) : (
                            <span className="text-dark-600">✗</span>
                          )}
                          <span className={features.showTargetPrice ? 'text-dark-300' : 'text-dark-500'}>
                            목표가 확인
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {(features.backtestDays as number) > 0 ? (
                            <span className={theme.highlight}>✓</span>
                          ) : (
                            <span className="text-dark-600">✗</span>
                          )}
                          <span className={(features.backtestDays as number) > 0 ? 'text-dark-300' : 'text-dark-500'}>
                            백테스트 {(features.backtestDays as number) > 0 ? `${features.backtestDays}일` : ''}
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {features.hasRealTimeSignal ? (
                            <span className={theme.highlight}>✓</span>
                          ) : (
                            <span className="text-dark-600">✗</span>
                          )}
                          <span className={features.hasRealTimeSignal ? 'text-dark-300' : 'text-dark-500'}>
                            실시간 매매 신호
                          </span>
                        </li>
                        {plan === 'vip' && (
                          <li className="flex items-center gap-2 text-sm">
                            <span className={theme.highlight}>✓</span>
                            <span className="text-dark-300 font-medium">
                              VIP 전용 추천 종목
                            </span>
                          </li>
                        )}
                      </ul>

                      {/* CTA 버튼 */}
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrentPlan}
                        className={`w-full py-3 rounded-xl font-semibold text-white transition-all
                          ${isCurrentPlan 
                            ? 'bg-dark-700 cursor-default' 
                            : `${theme.button} transform hover:scale-[1.02]`}`}
                      >
                        {isCurrentPlan ? '현재 플랜' : plan === 'free' ? '시작하기' : '선택하기'}
                      </button>

                      {/* 무료 체험 안내 */}
                      {plan !== 'free' && !isCurrentPlan && (
                        <p className="text-center text-dark-500 text-xs mt-3">
                          7일 무료 체험 가능
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ====== 기능 비교 테이블 ====== */}
          <section className="py-12">
            <h2 className="text-2xl font-bold text-dark-100 text-center mb-8">
              상세 기능 비교
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 bg-dark-900/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-dark-700">
                    <th className="py-4 px-4 text-left text-dark-400 font-medium">기능</th>
                    {plans.map((plan) => (
                      <th key={plan} className="py-4 px-4 text-center">
                        <span className={`font-bold ${PLAN_THEMES[plan].highlight}`}>
                          {PLAN_DISPLAY_NAMES[plan]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_LIST.map((feature, idx) => (
                    <tr 
                      key={feature.key}
                      className={`border-b border-dark-800 ${idx % 2 === 0 ? 'bg-dark-900/30' : ''}`}
                    >
                      <td className="py-4 px-4 text-dark-300">{feature.name}</td>
                      {plans.map((plan) => {
                        const value = getFeatureValue(plan, feature.key);
                        const theme = PLAN_THEMES[plan];

                        return (
                          <td key={plan} className="py-4 px-4 text-center">
                            {feature.type === 'boolean' ? (
                              value ? (
                                <span className={`text-xl ${theme.highlight}`}>✓</span>
                              ) : (
                                <span className="text-dark-600">✗</span>
                              )
                            ) : value === -1 ? (
                              <span className={`font-medium ${theme.highlight}`}>무제한</span>
                            ) : value === 0 ? (
                              <span className="text-dark-600">-</span>
                            ) : (
                              <span className="text-dark-200">
                                {value}{feature.unit}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ====== 성과 증명 섹션 ====== */}
          <section className="py-12">
            <div className="bg-gradient-to-r from-dark-800/80 to-dark-900/80 rounded-3xl border border-dark-700 p-8">
              <h2 className="text-2xl font-bold text-dark-100 text-center mb-2">
                📈 지난 한 달 AI 추천 성과
              </h2>
              <p className="text-dark-400 text-center mb-8">
                실제 백테스트 데이터 기반
              </p>

              {backtestData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                    <p className="text-dark-500 text-sm mb-1">분석 기간</p>
                    <p className="text-2xl font-bold text-brand-400">
                      {backtestData.totalDays}일
                    </p>
                  </div>
                  <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                    <p className="text-dark-500 text-sm mb-1">추천 종목</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {backtestData.totalStocks}개
                    </p>
                  </div>
                  <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                    <p className="text-dark-500 text-sm mb-1">평균 수익률</p>
                    <p className={`text-2xl font-bold ${backtestData.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {backtestData.avgReturn >= 0 ? '+' : ''}{backtestData.avgReturn}%
                    </p>
                  </div>
                  <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                    <p className="text-dark-500 text-sm mb-1">승률</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {backtestData.winRate}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-dark-800/50 rounded-xl p-4 h-20 animate-pulse" />
                  ))}
                </div>
              )}

              <p className="text-center text-dark-500 text-sm mt-6">
                * 과거 성과가 미래 수익을 보장하지 않습니다. 투자에는 항상 리스크가 있습니다.
              </p>
            </div>
          </section>

          {/* ====== FAQ 아코디언 ====== */}
          <section className="py-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-dark-100 text-center mb-8">
              자주 묻는 질문
            </h2>

            <div className="space-y-3">
              {FAQ_DATA.map((faq, idx) => (
                <div 
                  key={idx}
                  className="bg-dark-900/80 border border-dark-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left
                               hover:bg-dark-800/50 transition-colors"
                  >
                    <span className="text-dark-100 font-medium">{faq.q}</span>
                    <span className={`text-dark-400 text-xl transition-transform duration-200
                                     ${expandedFaq === idx ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300
                                  ${expandedFaq === idx ? 'max-h-40' : 'max-h-0'}`}>
                    <p className="px-6 pb-4 text-dark-400 text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ====== 최종 CTA ====== */}
          <section className="py-12 text-center">
            <div className="bg-gradient-to-r from-brand-600/20 via-purple-600/20 to-pink-600/20 
                            rounded-3xl border border-brand-500/30 p-8 md:p-12">
              <h2 className="text-3xl font-bold text-dark-100 mb-4">
                지금 시작하면 7일 무료!
              </h2>
              <p className="text-dark-400 mb-8 max-w-lg mx-auto">
                부담 없이 모든 프리미엄 기능을 체험해 보세요.
                마음에 들지 않으면 언제든 해지 가능합니다.
              </p>
              <button
                onClick={() => handleSelectPlan('pro')}
                className="px-8 py-4 bg-gradient-to-r from-brand-500 to-purple-500
                           text-white font-bold text-lg rounded-full
                           hover:from-brand-400 hover:to-purple-400
                           transform hover:scale-105 transition-all duration-200
                           shadow-lg shadow-brand-500/25"
              >
                🚀 PRO 무료 체험 시작하기
              </button>
              <p className="text-dark-500 text-sm mt-4">
                신용카드 등록 필요 없음 • 자동 결제 없음
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
