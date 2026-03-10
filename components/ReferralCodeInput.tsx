'use client';

/**
 * 추천코드 입력 컴포넌트
 * - URL ?ref=CODE 파라미터 자동 채움
 * - 500ms debounce로 실시간 검증
 * - 유효/무효 상태 표시
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon, LoaderIcon, GiftIcon } from 'lucide-react';

interface ReferralCodeInputProps {
  onCodeVerified?: (code: string, operatorName: string) => void;
  onCodeCleared?: () => void;
  className?: string;
  initialCode?: string;
}

export function ReferralCodeInput({
  onCodeVerified,
  onCodeCleared,
  className = '',
  initialCode,
}: ReferralCodeInputProps) {
  const searchParams = useSearchParams();
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    operatorName?: string;
    error?: string;
  } | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // URL 파라미터 또는 초기값으로 코드 설정
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setCode(refParam.toUpperCase());
    } else if (initialCode) {
      setCode(initialCode.toUpperCase());
    }
  }, [searchParams, initialCode]);

  // 코드 검증 함수
  const verifyCode = useCallback(async (inputCode: string) => {
    if (!inputCode || inputCode.length < 4) {
      setVerificationResult(null);
      onCodeCleared?.();
      return;
    }

    setIsVerifying(true);
    
    try {
      const response = await fetch(`/api/referral/verify?code=${encodeURIComponent(inputCode)}`);
      const data = await response.json();

      if (data.success && data.valid) {
        setVerificationResult({
          valid: true,
          operatorName: data.operatorName,
        });
        onCodeVerified?.(inputCode, data.operatorName);
      } else {
        setVerificationResult({
          valid: false,
          error: data.error || '유효하지 않은 추천코드입니다.',
        });
        onCodeCleared?.();
      }
    } catch (error) {
      console.error('Referral code verification error:', error);
      setVerificationResult({
        valid: false,
        error: '검증 중 오류가 발생했습니다.',
      });
      onCodeCleared?.();
    } finally {
      setIsVerifying(false);
    }
  }, [onCodeVerified, onCodeCleared]);

  // Debounced 검증
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (code.length >= 4) {
      debounceRef.current = setTimeout(() => {
        verifyCode(code);
      }, 500);
    } else {
      setVerificationResult(null);
      onCodeCleared?.();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [code, verifyCode, onCodeCleared]);

  // 코드 자동 검증 (초기값이 있는 경우)
  useEffect(() => {
    const refParam = searchParams.get('ref');
    const codeToVerify = refParam || initialCode;
    
    if (codeToVerify && codeToVerify.length >= 4) {
      verifyCode(codeToVerify.toUpperCase());
    }
  }, []); // 최초 마운트 시 1회만 실행

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_가-힣]/g, '');
    setCode(value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-dark-300">
        <span className="flex items-center gap-2">
          <GiftIcon className="w-4 h-4 text-emerald-400" />
          추천코드 (선택)
        </span>
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="추천코드가 있다면 입력하세요"
          maxLength={20}
          className={`
            w-full px-4 py-3 bg-dark-800 border rounded-xl
            text-dark-100 placeholder-dark-500
            focus:outline-none focus:ring-2 transition-all
            ${verificationResult?.valid 
              ? 'border-emerald-500/50 focus:ring-emerald-500/30' 
              : verificationResult?.valid === false 
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-dark-700 focus:ring-blue-500/30 focus:border-blue-500/50'
            }
          `}
        />
        
        {/* 상태 아이콘 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isVerifying && (
            <LoaderIcon className="w-5 h-5 text-dark-400 animate-spin" />
          )}
          {!isVerifying && verificationResult?.valid && (
            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
          )}
          {!isVerifying && verificationResult?.valid === false && (
            <XCircleIcon className="w-5 h-5 text-red-400" />
          )}
        </div>
      </div>

      {/* 검증 결과 메시지 */}
      {verificationResult && !isVerifying && (
        <div className={`
          text-sm px-3 py-2 rounded-lg
          ${verificationResult.valid 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }
        `}>
          {verificationResult.valid ? (
            <span className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />
              <span>{verificationResult.operatorName}님의 추천</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <XCircleIcon className="w-4 h-4" />
              <span>{verificationResult.error}</span>
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-dark-500">
        리딩방 운영자의 추천코드가 있다면 입력해주세요. 
        특별한 혜택을 받을 수 있습니다.
      </p>
    </div>
  );
}

export default ReferralCodeInput;
