'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { DisclaimerBar } from '@/components/DisclaimerBar';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  SUBSCRIPTION_PLANS, 
  formatPrice,
  type SubscriptionTier 
} from '@/lib/subscription/config';

// PortOne은 전역으로 이미 선언됨 (pricing 페이지에서)

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');

  // 현재 구독 정보 조회
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      
      try {
        const { createBrowserClient } = await import('@/lib/supabase/client');
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) return;
        
        const response = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentTier(data.tier);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };

    fetchSubscription();
  }, [user]);

  // 포트원 SDK 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 쿠폰 검증
  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponDiscount(0);
      setCouponError('');
      return;
    }

    try {
      const response = await fetch(`/api/subscription/coupon?code=${code}`);
      const data = await response.json();
      
      if (data.valid) {
        setCouponDiscount(data.discountPercent);
        setCouponError('');
      } else {
        setCouponDiscount(0);
        setCouponError(data.error);
      }
    } catch {
      setCouponDiscount(0);
      setCouponError('쿠폰 확인에 실패했습니다.');
    }
  };

  // 결제 시작
  const handleSubscribe = async (planId: SubscriptionTier) => {
    if (!user) {
      router.push('/login?redirect=/subscription');
      return;
    }

    if (planId === 'free' || planId === currentTier) {
      return;
    }

    setIsLoading(true);

    try {
      const { createBrowserClient } = await import('@/lib/supabase/client');
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('로그인이 필요합니다.');
      }
      
      const token = session.access_token;
      
      // 결제 설정 생성
      const response = await fetch('/api/subscription/create-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          couponCode: couponDiscount > 0 ? couponCode : undefined,
        }),
      });

      const { paymentConfig, orderInfo } = await response.json();

      if (!window.PortOne) {
        throw new Error('PortOne SDK not loaded');
      }

      // 포트원 결제 요청
      const result = await window.PortOne.requestPayment(paymentConfig);

      if (!result || result.code === 'FAILURE') {
        throw new Error(result?.message || '결제 요청 실패');
      }

      // 결제 확인
      const confirmResponse = await fetch('/api/subscription/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: result.paymentId,
          planId,
          billingCycle,
          couponCode: orderInfo.couponCode,
        }),
      });

      if (confirmResponse.ok) {
        router.push('/subscription/success');
      } else {
        throw new Error('결제 확인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : '결제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = (planId: SubscriptionTier) => {
    if (planId === currentTier) return '현재 플랜';
    if (planId === 'free') return '무료 사용 중';
    return '구독하기';
  };

  const getButtonDisabled = (planId: SubscriptionTier) => {
    return planId === currentTier || planId === 'free' || isLoading;
  };

  return (
    <main className="min-h-screen bg-dark-900">
      <DisclaimerBar />
      <Header />
      
      <div className="container-app pt-28 pb-12">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
            AI 투자 파트너 구독
          </h1>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">
            전문 AI 분석으로 더 스마트한 투자를 시작하세요
          </p>
        </div>

        {/* 결제 주기 토글 */}
        <div className="flex justify-center mb-10">
          <div className="bg-dark-800 rounded-2xl p-1.5 inline-flex items-center">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              연간 결제
              <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                17% 할인
              </span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const isCurrentPlan = plan.id === currentTier;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  isPopular
                    ? 'bg-gradient-to-b from-brand-500/20 to-dark-800 border-2 border-brand-500 scale-105 shadow-2xl shadow-brand-500/20'
                    : 'bg-dark-800 border border-dark-700 hover:border-dark-600'
                } ${isCurrentPlan ? 'ring-2 ring-brand-400' : ''}`}
              >
                {/* 인기 뱃지 */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-brand-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                      🔥 가장 인기
                    </div>
                  </div>
                )}

                {/* 현재 플랜 표시 */}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full">
                      현재 플랜
                    </div>
                  </div>
                )}

                {/* 플랜 아이콘 & 이름 */}
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">{plan.icon}</div>
                  <h3 className={`text-2xl font-bold ${plan.color}`}>
                    {plan.nameKo}
                  </h3>
                  <p className="text-dark-500 text-sm mt-1">{plan.description}</p>
                </div>

                {/* 가격 */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-dark-100">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-dark-500">
                        /{billingCycle === 'monthly' ? '월' : '년'}
                      </span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-dark-500 text-sm mt-1">
                      월 {formatPrice(Math.floor(price / 12))} 환산
                    </p>
                  )}
                </div>

                {/* 기능 목록 */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-brand-400 mt-0.5">✓</span>
                      <span className="text-dark-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 구독 버튼 */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={getButtonDisabled(plan.id)}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isCurrentPlan
                      ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                      : plan.id === 'free'
                      ? 'bg-dark-700 text-dark-400 cursor-default'
                      : isPopular
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg hover:shadow-xl active:scale-98'
                      : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> 처리 중...
                    </span>
                  ) : (
                    getButtonText(plan.id)
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 쿠폰 입력 */}
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
            <h3 className="text-lg font-bold text-dark-200 mb-4">🎁 쿠폰 코드</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드 입력"
                className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => validateCoupon(couponCode)}
                className="px-6 py-3 bg-dark-600 text-dark-200 rounded-xl hover:bg-dark-500 transition-colors font-medium"
              >
                적용
              </button>
            </div>
            {couponError && (
              <p className="text-red-400 text-sm mt-2">{couponError}</p>
            )}
            {couponDiscount > 0 && (
              <p className="text-brand-400 text-sm mt-2">
                ✓ {couponDiscount}% 할인이 적용됩니다!
              </p>
            )}
          </div>
        </div>

        {/* FAQ 섹션 */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-dark-100 text-center mb-8">
            자주 묻는 질문
          </h2>
          
          <div className="space-y-4">
            {[
              {
                q: '구독은 언제든 취소할 수 있나요?',
                a: '네, 언제든지 취소할 수 있습니다. 취소 후에도 결제 기간이 끝날 때까지 서비스를 이용하실 수 있습니다.',
              },
              {
                q: '환불은 어떻게 받을 수 있나요?',
                a: '결제일로부터 7일 이내에 환불 요청하시면 전액 환불해 드립니다. 고객센터로 문의해 주세요.',
              },
              {
                q: '플랜을 업그레이드하면 어떻게 되나요?',
                a: '기존 플랜의 남은 기간만큼 비례 계산하여 차액만 결제됩니다.',
              },
              {
                q: 'AI 분석의 정확도는 어느 정도인가요?',
                a: 'AI의 분석은 참고용으로, 투자 결정은 본인의 판단으로 내려주세요. 투자의 책임은 투자자 본인에게 있습니다.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <h4 className="font-bold text-dark-200 mb-2">{faq.q}</h4>
                <p className="text-dark-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 보안 배지 */}
        <div className="flex items-center justify-center gap-8 mt-12 text-dark-500 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-xl">🔒</span> 안전한 SSL 결제
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xl">💳</span> 포트원 결제
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xl">📱</span> 간편결제 지원
          </span>
        </div>
      </div>

      <DisclaimerBar variant="bottom" compact />
    </main>
  );
}

