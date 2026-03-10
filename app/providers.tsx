'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { useApplyReferral } from '@/lib/hooks/useApplyReferral';

// 추천코드 자동 적용 컴포넌트
function ReferralApplicator({ children }: { children: ReactNode }) {
  useApplyReferral();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ReferralApplicator>
          {children}
        </ReferralApplicator>
      </ToastProvider>
    </AuthProvider>
  );
}


