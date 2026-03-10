'use client';

/**
 * 관리자 운영자 관리 페이지
 * /admin/operators
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { AdminOperatorPanel } from '@/components/AdminOperatorPanel';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  ShieldIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import Link from 'next/link';
import { ADMIN_EMAILS } from '@/lib/affiliate';

// 로딩 컴포넌트
function AdminPageLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="container-app">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">관리자 페이지 로딩 중...</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// 메인 페이지 래퍼
export default function AdminOperatorsPageWrapper() {
  return (
    <Suspense fallback={<AdminPageLoading />}>
      <AdminOperatorsPage />
    </Suspense>
  );
}

function AdminOperatorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // 관리자 권한 확인
  useEffect(() => {
    if (!authLoading && user) {
      const adminCheck = user.email && ADMIN_EMAILS.includes(user.email);
      setIsAdmin(!!adminCheck);
    } else if (!authLoading) {
      setIsAdmin(false);
    }
  }, [user, authLoading]);

  // 로딩 중
  if (authLoading || isAdmin === null) {
    return <AdminPageLoading />;
  }

  // 비로그인 또는 권한 없음
  if (!user || !isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 pb-12">
          <div className="fixed inset-0 bg-grid opacity-30" />
          <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px]" />
          
          <div className="relative container-app text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
                <AlertTriangleIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-100 mb-4">
                접근 권한 없음
              </h1>
              <p className="text-dark-400 mb-8">
                이 페이지는 관리자만 접근할 수 있습니다.
              </p>
              
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-dark-800 text-dark-200 font-medium rounded-xl hover:bg-dark-700 transition-all"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // 관리자 페이지
  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/4 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        
        <div className="relative container-app">
          {/* 뒤로가기 */}
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            관리자 대시보드
          </Link>

          {/* 페이지 헤더 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
              <ShieldIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-100">운영자 관리</h1>
              <p className="text-sm text-dark-500">파트너 승인 및 정산 관리</p>
            </div>
          </div>

          {/* 관리 패널 */}
          <AdminOperatorPanel />
        </div>
      </main>
    </>
  );
}
