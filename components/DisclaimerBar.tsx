'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface DisclaimerBarProps {
  variant?: 'top' | 'bottom';
  compact?: boolean;
}

export function DisclaimerBar({ variant = 'top', compact = false }: DisclaimerBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (compact && variant === 'bottom') {
    return (
      <div className="bg-dark-950 border-t border-dark-800/50 py-3">
        <div className="container-app">
          <p className="text-xs text-dark-500 text-center">
            본 서비스는 투자 자문이 아닌 엔터테인먼트 콘텐츠입니다. 투자 판단의 책임은 이용자 본인에게 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'bg-dark-900/80 backdrop-blur-md border-b border-dark-800/50 text-xs',
        variant === 'top' ? 'sticky top-0 z-50' : '',
        compact ? 'py-2' : 'py-2.5'
      )}
    >
      <div className="container-app">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-2xs font-medium">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Not Financial Advice
          </span>
          <span className="text-dark-500">
            엔터테인먼트 목적의 AI 분석 콘텐츠입니다
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-dark-400 hover:text-dark-200 underline underline-offset-2"
          >
            {isExpanded ? '접기' : '자세히'}
          </button>
        </div>
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-dark-800/50 text-center text-dark-500 max-w-2xl mx-auto">
            제공되는 정보는 AI 모델의 분석 결과이며, 투자 판단의 책임은 전적으로 이용자 본인에게 있습니다.
            실제 투자 결정 시에는 공인된 투자 자문사와 상담하세요. 과거 적중률은 미래 수익을 보장하지 않습니다.
          </div>
        )}
      </div>
    </div>
  );
}
