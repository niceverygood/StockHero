'use client';

/**
 * 회원가입 (추천 코드 입력) 페이지
 * /join?ref=CODE
 * 
 * 추천 링크로 접속한 유저가 가입할 때 사용하는 페이지
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, ReferralCodeInput } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  SparklesIcon,
  GiftIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LoaderIcon,
} from 'lucide-react';
import Link from 'next/link';

// 로딩 컴포넌트
function JoinPageLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="container-app">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">로딩 중...</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// 메인 페이지 래퍼
export default function JoinPageWrapper() {
  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPage />
    </Suspense>
  );
}

function JoinPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [applyingReferral, setApplyingReferral] = useState(false);

  // URL에서 ref 파라미터 읽기
  const refParam = searchParams.get('ref');

  // 이미 로그인된 유저이면서 추천코드가 있으면 적용
  useEffect(() => {
    const applyReferralCode = async () => {
      if (!user || !verifiedCode || applyingReferral) return;

      // localStorage에서 이미 적용 시도했는지 확인
      const appliedKey = `referral_applied_${user.id}`;
      if (localStorage.getItem(appliedKey)) {
        return;
      }

      setApplyingReferral(true);

      try {
        const response = await fetch('/api/referral/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            referralCode: verifiedCode,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // 성공 - 적용 완료 표시
          localStorage.setItem(appliedKey, 'true');
          // localStorage에서 저장된 코드 삭제
          localStorage.removeItem('pending_referral_code');
        }
      } catch (error) {
        console.error('Referral apply error:', error);
      } finally {
        setApplyingReferral(false);
      }
    };

    applyReferralCode();
  }, [user, verifiedCode, applyingReferral]);

  // 로그인 상태인데 추천코드가 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && user && !refParam) {
      router.push('/');
    }
  }, [user, authLoading, refParam, router]);

  // 추천코드 검증 완료 핸들러
  const handleCodeVerified = (code: string, opName: string) => {
    setVerifiedCode(code);
    setOperatorName(opName);
    // localStorage에 추천코드 저장 (OAuth 후 사용)
    localStorage.setItem('pending_referral_code', code);
  };

  // 추천코드 클리어 핸들러
  const handleCodeCleared = () => {
    setVerifiedCode(null);
    setOperatorName(null);
    localStorage.removeItem('pending_referral_code');
  };

  // Google 로그인
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // 추천코드가 있으면 localStorage에 저장
      if (verifiedCode) {
        localStorage.setItem('pending_referral_code', verifiedCode);
      }
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setIsSigningIn(false);
    }
  };

  // 로딩 중
  if (authLoading) {
    return <JoinPageLoading />;
  }

  // 이미 로그인된 유저 + 추천코드 적용 중
  if (user && verifiedCode && applyingReferral) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-dark-100 mb-2">추천코드 적용 중...</h2>
              <p className="text-dark-400">{operatorName}님의 추천으로 가입 처리 중입니다.</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 이미 로그인된 유저 + 추천코드 적용 완료
  if (user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                환영합니다! 🎉
              </h1>
              
              {operatorName && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                  <p className="text-emerald-400">
                    <GiftIcon className="w-5 h-5 inline mr-2" />
                    {operatorName}님의 추천으로 가입되었습니다
                  </p>
                </div>
              )}
              
              <p className="text-dark-400 mb-8">
                AI 주식 분석 서비스를 시작해보세요!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all"
                >
                  오늘의 추천 보기
                </Link>
                <Link
                  href="/pricing"
                  className="px-6 py-3 bg-dark-800 text-dark-200 font-medium rounded-xl hover:bg-dark-700 transition-all"
                >
                  구독 플랜 확인
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 비로그인 상태 - 가입 폼
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        
        <div className="relative container-app">
          <div className="max-w-md mx-auto">
            {/* 헤더 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-dark-100 mb-2">
                StockHero 가입하기
              </h1>
              <p className="text-dark-400">
                AI 주식 분석 서비스를 무료로 시작하세요
              </p>
            </div>

            {/* 추천코드 영역 */}
            {refParam && (
              <div className="mb-6">
                <ReferralCodeInput
                  initialCode={refParam}
                  onCodeVerified={handleCodeVerified}
                  onCodeCleared={handleCodeCleared}
                />
              </div>
            )}

            {/* 추천 혜택 안내 */}
            {verifiedCode && operatorName && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <GiftIcon className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-medium text-dark-100">
                      {operatorName}님의 추천 링크
                    </p>
                    <p className="text-sm text-dark-400">
                      가입하면 특별한 혜택을 받을 수 있습니다
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 서비스 소개 */}
            <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700 mb-6">
              <h3 className="font-bold text-dark-100 mb-4">StockHero 특징</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3 text-dark-300">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  매일 AI 3인이 토론해서 선정한 Top 5 종목
                </li>
                <li className="flex items-center gap-3 text-dark-300">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  과학적 교차검증으로 높은 적중률
                </li>
                <li className="flex items-center gap-3 text-dark-300">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  무료 플랜으로 기본 기능 이용 가능
                </li>
              </ul>
            </div>

            {/* Google 로그인 버튼 */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-4 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {isSigningIn ? (
                <>
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google로 시작하기
                </>
              )}
            </button>

            <p className="text-xs text-dark-500 text-center mt-4">
              가입 시{' '}
              <Link href="/terms" className="text-emerald-400 hover:underline">
                이용약관
              </Link>
              {' '}및{' '}
              <Link href="/privacy" className="text-emerald-400 hover:underline">
                개인정보처리방침
              </Link>
              에 동의하게 됩니다.
            </p>

            {/* 이미 계정이 있으신가요? */}
            <div className="text-center mt-6 pt-6 border-t border-dark-700">
              <p className="text-dark-400 text-sm">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={handleGoogleSignIn}
                  className="text-emerald-400 hover:underline"
                >
                  로그인
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
