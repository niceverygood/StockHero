'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Header } from '@/components/Header';
import { DisclaimerBar } from '@/components/DisclaimerBar';

export default function SubscriptionSuccessPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);

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
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };

    fetchSubscription();
  }, [user]);

  return (
    <main className="min-h-screen bg-dark-900">
      <DisclaimerBar />
      <Header />
      
      <div className="container-app pt-28 pb-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* 성공 애니메이션 */}
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <span className="text-6xl">🎉</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                <span className="text-xl">✨</span>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          <h1 className="text-4xl font-bold text-dark-100 mb-4">
            구독 완료! 🚀
          </h1>
          
          {subscription && (
            <div className="bg-dark-800 rounded-2xl p-8 mb-8 border border-brand-500/30">
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="text-5xl">{subscription.plan?.icon || '⭐'}</span>
                <div className="text-left">
                  <p className="text-dark-500 text-sm">활성화된 플랜</p>
                  <p className={`text-3xl font-bold ${subscription.plan?.color || 'text-brand-400'}`}>
                    {subscription.plan?.nameKo || subscription.tier}
                  </p>
                </div>
              </div>
              
              {subscription.subscription?.currentPeriodEnd && (
                <p className="text-dark-400">
                  다음 결제일: {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          )}

          <p className="text-xl text-dark-300 mb-8">
            이제 모든 AI 분석 기능을 자유롭게 이용하실 수 있습니다!
          </p>

          {/* 새로운 기능 안내 */}
          <div className="bg-dark-800 rounded-2xl p-8 mb-8 text-left border border-dark-700">
            <h2 className="text-xl font-bold text-dark-200 mb-6 text-center">
              🎁 이제 이용 가능한 기능
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🇺🇸', title: '미국 주식 분석', desc: 'Top 5 미국 주식 추천' },
                { icon: '🔥', title: '핫 테마 분석', desc: '트렌드 테마별 종목 분석' },
                { icon: '💬', title: 'AI 상담 확장', desc: '더 많은 AI 상담 가능' },
                { icon: '⚔️', title: '토론 요청', desc: '원하는 종목 토론 생성' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-dark-700 rounded-xl">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <p className="font-bold text-dark-200">{feature.title}</p>
                    <p className="text-dark-500 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/verdict"
              className="px-8 py-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-lg"
            >
              Top 5 추천 보러가기 →
            </Link>
            <Link
              href="/us-stocks"
              className="px-8 py-4 bg-dark-700 text-dark-200 rounded-xl font-bold hover:bg-dark-600 transition-colors"
            >
              🇺🇸 미국 주식 분석
            </Link>
          </div>

          {/* 영수증 안내 */}
          <p className="text-dark-500 text-sm mt-8">
            결제 영수증이 이메일로 발송되었습니다.
            <br />
            문의사항이 있으시면 고객센터로 연락해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}

