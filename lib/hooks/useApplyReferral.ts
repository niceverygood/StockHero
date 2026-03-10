'use client';

/**
 * 추천코드 자동 적용 훅
 * 로그인 후 localStorage에 저장된 추천코드가 있으면 자동으로 적용
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

export function useApplyReferral() {
  const { user } = useAuth();
  const hasApplied = useRef(false);

  useEffect(() => {
    const applyPendingReferral = async () => {
      // 이미 시도했거나 유저가 없으면 스킵
      if (hasApplied.current || !user) return;

      // localStorage에서 대기 중인 추천코드 확인
      const pendingCode = localStorage.getItem('pending_referral_code');
      if (!pendingCode) return;

      // 이미 이 유저에게 적용했는지 확인
      const appliedKey = `referral_applied_${user.id}`;
      if (localStorage.getItem(appliedKey)) {
        // 이미 적용됨 - 대기 코드 삭제
        localStorage.removeItem('pending_referral_code');
        return;
      }

      hasApplied.current = true;

      try {
        console.log('[Referral] Applying pending referral code:', pendingCode);

        const response = await fetch('/api/referral/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            referralCode: pendingCode,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log('[Referral] Successfully applied referral code');
          // 성공 - 적용 완료 표시
          localStorage.setItem(appliedKey, 'true');
        } else {
          console.log('[Referral] Failed to apply:', result.error);
        }
      } catch (error) {
        console.error('[Referral] Error applying referral code:', error);
      } finally {
        // 어떤 경우든 대기 코드 삭제
        localStorage.removeItem('pending_referral_code');
      }
    };

    applyPendingReferral();
  }, [user]);
}

export default useApplyReferral;
