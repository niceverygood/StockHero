'use client';

/**
 * 운영자 대시보드 페이지
 * /operator
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  UsersIcon, 
  SparklesIcon,
  ArrowRightIcon,
  LoaderIcon,
} from 'lucide-react';
import Link from 'next/link';

// 로딩 컴포넌트
function OperatorPageLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="container-app">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">운영자 대시보드 로딩 중...</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// 메인 페이지 래퍼
export default function OperatorPageWrapper() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorPage />
    </Suspense>
  );
}

function OperatorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const [checkingOperator, setCheckingOperator] = useState(true);

  // 운영자 여부 확인
  useEffect(() => {
    const checkOperator = async () => {
      if (!user) {
        setCheckingOperator(false);
        return;
      }

      try {
        const response = await fetch('/api/operators/me');
        const result = await response.json();
        
        setIsOperator(result.success && result.isOperator);
      } catch (error) {
        console.error('Operator check error:', error);
        setIsOperator(false);
      } finally {
        setCheckingOperator(false);
      }
    };

    if (!authLoading) {
      checkOperator();
    }
  }, [user, authLoading]);

  // 로딩 중
  if (authLoading || checkingOperator) {
    return <OperatorPageLoading />;
  }

  // 비로그인 상태
  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                운영자 로그인 필요
              </h1>
              <p className="text-dark-400 mb-8">
                운영자 대시보드를 이용하려면 먼저 로그인해주세요.
              </p>
              
              <Link
                href="/login?redirect=/operator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all"
              >
                로그인하기
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 운영자 아닌 경우 - 가입 안내
  if (!isOperator) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
          
          <div className="relative container-app">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                StockHero <span className="text-emerald-400">파트너</span> 프로그램
              </h1>
              <p className="text-dark-400 mb-8 max-w-lg mx-auto">
                리딩방 운영자라면 StockHero와 함께하세요!
                추천 유저의 구독 수익을 나눠드립니다.
              </p>

              {/* 혜택 소개 */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-dark-800/50 rounded-xl p-5 border border-dark-700">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">20~35%</div>
                  <p className="text-sm text-dark-400">수익 쉐어</p>
                </div>
                <div className="bg-dark-800/50 rounded-xl p-5 border border-dark-700">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">무제한</div>
                  <p className="text-sm text-dark-400">추천 가능</p>
                </div>
                <div className="bg-dark-800/50 rounded-xl p-5 border border-dark-700">
                  <div className="text-3xl font-bold text-purple-400 mb-2">매월</div>
                  <p className="text-sm text-dark-400">정산 지급</p>
                </div>
              </div>

              {/* 티어 안내 */}
              <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700 mb-8">
                <h3 className="text-lg font-bold text-dark-100 mb-4">파트너 등급 혜택</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-amber-700/10">
                    <span className="text-lg">🥉</span>
                    <p className="text-xs text-amber-700 mt-1">브론즈</p>
                    <p className="text-sm font-bold text-dark-100">20%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-400/10">
                    <span className="text-lg">🥈</span>
                    <p className="text-xs text-gray-400 mt-1">실버</p>
                    <p className="text-sm font-bold text-dark-100">25%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-400/10">
                    <span className="text-lg">🥇</span>
                    <p className="text-xs text-amber-400 mt-1">골드</p>
                    <p className="text-sm font-bold text-dark-100">30%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-400/10">
                    <span className="text-lg">💎</span>
                    <p className="text-xs text-cyan-400 mt-1">다이아</p>
                    <p className="text-sm font-bold text-dark-100">35%</p>
                  </div>
                </div>
                <p className="text-xs text-dark-500 mt-4">
                  추천 유저 수에 따라 등급이 자동으로 올라갑니다
                </p>
              </div>
              
              <Link
                href="/operator/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/30"
              >
                파트너 신청하기
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              
              <p className="text-xs text-dark-500 mt-4">
                신청 후 관리자 승인이 필요합니다
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 운영자 대시보드
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        
        <div className="relative container-app">
          {/* 페이지 헤더 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-100">파트너 대시보드</h1>
              <p className="text-sm text-dark-500">추천 실적과 수익을 확인하세요</p>
            </div>
          </div>

          {/* 대시보드 컴포넌트 */}
          <OperatorDashboard />
        </div>
      </main>
    </>
  );
}
