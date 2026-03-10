'use client';

/**
 * 운영자 가입 신청 폼 컴포넌트
 */

import React, { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  LinkIcon, 
  BanknoteIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { BANK_LIST } from '@/lib/affiliate';

interface FormData {
  name: string;
  email: string;
  phone: string;
  channelName: string;
  channelUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

interface FormErrors {
  [key: string]: string;
}

export function OperatorRegisterForm() {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: user?.email || '',
    phone: '',
    channelName: '',
    channelUrl: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreements, setAgreements] = useState({
    noFalseAds: false,
    noGuarantee: false,
    acceptSuspension: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    referralCode?: string;
  } | null>(null);

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 클리어
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 동의 체크박스 핸들러
  const handleAgreementChange = (key: keyof typeof agreements) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.bankName) {
      newErrors.bankName = '은행을 선택해주세요.';
    }

    if (!formData.bankAccount.trim()) {
      newErrors.bankAccount = '계좌번호를 입력해주세요.';
    } else if (!/^[0-9-]+$/.test(formData.bankAccount)) {
      newErrors.bankAccount = '올바른 계좌번호를 입력해주세요.';
    }

    if (!formData.bankHolder.trim()) {
      newErrors.bankHolder = '예금주를 입력해주세요.';
    }

    if (!agreements.noFalseAds || !agreements.noGuarantee || !agreements.acceptSuspension) {
      newErrors.agreements = '모든 약관에 동의해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/operators/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitResult({
          success: true,
          message: result.message,
          referralCode: result.operator?.referralCode,
        });
      } else {
        setSubmitResult({
          success: false,
          message: result.error || '가입 신청에 실패했습니다.',
        });
      }
    } catch (error) {
      console.error('Register error:', error);
      setSubmitResult({
        success: false,
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 제출 완료 화면
  if (submitResult?.success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-dark-100 mb-4">
          가입 신청 완료!
        </h2>
        <p className="text-dark-400 mb-6">
          {submitResult.message}
        </p>
        {submitResult.referralCode && (
          <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-dark-500 mb-2">내 추천코드 (승인 후 활성화)</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">
              {submitResult.referralCode}
            </p>
          </div>
        )}
        <p className="text-sm text-dark-500">
          관리자 승인 후 이메일로 안내드립니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* 에러 메시지 */}
      {submitResult && !submitResult.success && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{submitResult.message}</p>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <h3 className="text-lg font-bold text-dark-100 mb-4">기본 정보</h3>
        
        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                이름/닉네임 <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="운영자로 표시될 이름"
              className={`w-full px-4 py-3 bg-dark-900 border rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 ${
                errors.name ? 'border-red-500/50 focus:ring-red-500/30' : 'border-dark-700 focus:ring-emerald-500/30'
              }`}
            />
            {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-2">
                <MailIcon className="w-4 h-4" />
                이메일 <span className="text-red-400">*</span>
              </span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className={`w-full px-4 py-3 bg-dark-900 border rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500/50 focus:ring-red-500/30' : 'border-dark-700 focus:ring-emerald-500/30'
              }`}
            />
            {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email}</p>}
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4" />
                전화번호 <span className="text-dark-500">(선택)</span>
              </span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="010-0000-0000"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* 채널 정보 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <h3 className="text-lg font-bold text-dark-100 mb-4">채널 정보 (선택)</h3>
        
        <div className="space-y-4">
          {/* 채널명 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              리딩방/채널 이름
            </label>
            <input
              type="text"
              name="channelName"
              value={formData.channelName}
              onChange={handleChange}
              placeholder="예: 주식왕의 리딩방"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* 채널 URL */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                채널 URL
              </span>
            </label>
            <input
              type="url"
              name="channelUrl"
              value={formData.channelUrl}
              onChange={handleChange}
              placeholder="https://t.me/your_channel"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* 정산 계좌 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <h3 className="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
          <BanknoteIcon className="w-5 h-5 text-emerald-400" />
          정산 계좌 <span className="text-red-400">*</span>
        </h3>
        
        <div className="space-y-4">
          {/* 은행 선택 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">은행</label>
            <select
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-dark-900 border rounded-xl text-dark-100 focus:outline-none focus:ring-2 ${
                errors.bankName ? 'border-red-500/50 focus:ring-red-500/30' : 'border-dark-700 focus:ring-emerald-500/30'
              }`}
            >
              <option value="">은행을 선택하세요</option>
              {BANK_LIST.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            {errors.bankName && <p className="text-sm text-red-400 mt-1">{errors.bankName}</p>}
          </div>

          {/* 계좌번호 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">계좌번호</label>
            <input
              type="text"
              name="bankAccount"
              value={formData.bankAccount}
              onChange={handleChange}
              placeholder="숫자만 입력 (예: 123456789012)"
              className={`w-full px-4 py-3 bg-dark-900 border rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 ${
                errors.bankAccount ? 'border-red-500/50 focus:ring-red-500/30' : 'border-dark-700 focus:ring-emerald-500/30'
              }`}
            />
            {errors.bankAccount && <p className="text-sm text-red-400 mt-1">{errors.bankAccount}</p>}
          </div>

          {/* 예금주 */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">예금주</label>
            <input
              type="text"
              name="bankHolder"
              value={formData.bankHolder}
              onChange={handleChange}
              placeholder="예금주 이름"
              className={`w-full px-4 py-3 bg-dark-900 border rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 ${
                errors.bankHolder ? 'border-red-500/50 focus:ring-red-500/30' : 'border-dark-700 focus:ring-emerald-500/30'
              }`}
            />
            {errors.bankHolder && <p className="text-sm text-red-400 mt-1">{errors.bankHolder}</p>}
          </div>
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <h3 className="text-lg font-bold text-dark-100 mb-4">운영자 약관 동의</h3>
        
        <div className="space-y-3">
          <AgreementCheckbox
            checked={agreements.noFalseAds}
            onChange={() => handleAgreementChange('noFalseAds')}
            label="허위/과장 홍보를 하지 않겠습니다."
          />
          <AgreementCheckbox
            checked={agreements.noGuarantee}
            onChange={() => handleAgreementChange('noGuarantee')}
            label="수익 보장 문구를 사용하지 않겠습니다."
          />
          <AgreementCheckbox
            checked={agreements.acceptSuspension}
            onChange={() => handleAgreementChange('acceptSuspension')}
            label="위반 시 계정 정지 및 정산 보류에 동의합니다."
          />
        </div>

        {errors.agreements && (
          <p className="text-sm text-red-400 mt-3">{errors.agreements}</p>
        )}
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoaderIcon className="w-5 h-5 animate-spin" />
            처리 중...
          </>
        ) : (
          '운영자 가입 신청'
        )}
      </button>

      <p className="text-xs text-dark-500 text-center">
        가입 신청 후 관리자 승인을 거쳐 운영자 활동이 가능합니다.
        <br />
        승인 결과는 입력하신 이메일로 안내드립니다.
      </p>
    </form>
  );
}

// 동의 체크박스 컴포넌트
function AgreementCheckbox({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: () => void; 
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div 
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
          checked 
            ? 'bg-emerald-500 border-emerald-500' 
            : 'border-dark-600 group-hover:border-dark-500'
        }`}
        onClick={onChange}
      >
        {checked && <CheckCircleIcon className="w-3 h-3 text-white" />}
      </div>
      <span className="text-dark-300 text-sm">{label}</span>
    </label>
  );
}

export default OperatorRegisterForm;
