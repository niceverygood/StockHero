'use client';

/**
 * 운영자 가입 신청 페이지
 * /operator/register
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { OperatorRegisterForm } from '@/components/OperatorRegisterForm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import Link from 'next/link';

// 로딩 컴포넌트
function RegisterPageLoading() {
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
export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterPage />
    </Suspense>
  );
}

function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [alreadyOperator, setAlreadyOperator] = useState(false);
  const [checking, setChecking] = useState(true);

  // 이미 운영자인지 확인
  useEffect(() => {
    const checkOperator = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/operators/me');
        const result = await response.json();
        
        if (result.success && result.isOperator) {
          setAlreadyOperator(true);
        }
      } catch (error) {
        console.error('Operator check error:', error);
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkOperator();
    }
  }, [user, authLoading]);

  // 로딩 중
  if (authLoading || checking) {
    return <RegisterPageLoading />;
  }

  // 비로그인 상태
  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                로그인이 필요합니다
              </h1>
              <p className="text-dark-400 mb-8">
                파트너 신청을 하려면 먼저 StockHero 계정으로 로그인해주세요.
              </p>
              
              <Link
                href="/login?redirect=/operator/register"
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

  // 이미 운영자인 경우
  if (alreadyOperator) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                이미 파트너입니다!
              </h1>
              <p className="text-dark-400 mb-8">
                파트너 대시보드에서 실적을 확인하세요.
              </p>
              
              <Link
                href="/operator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all"
              >
                대시보드로 이동
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 가입 신청 폼
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        
        <div className="relative container-app">
          {/* 뒤로가기 */}
          <Link
            href="/operator"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            파트너 안내
          </Link>

          {/* 페이지 헤더 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-dark-100 mb-2">
              파트너 신청
            </h1>
            <p className="text-dark-400">
              아래 정보를 입력하고 파트너 프로그램에 참여하세요
            </p>
          </div>

          {/* 가입 폼 */}
          <OperatorRegisterForm />
        </div>
      </main>
    </>
  );
}
