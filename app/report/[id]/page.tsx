'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DisclaimerBar, Header, PaywallModal, CharacterAvatarGroup } from '@/components';

const MOCK_REPORT = {
  id: '1',
  title: '삼성전자 심층 분석 리포트',
  symbol: '005930',
  symbolName: '삼성전자',
  date: 'Dec 13, 2024',
  previewContent: `
삼성전자에 대한 AI 3대장의 심층 분석 요약입니다.

주요 분석 포인트:
- 메모리 반도체 업황 사이클 분석
- HBM 시장 점유율 전망
- 파운드리 사업부 경쟁력 평가
- 밸류에이션 분석

이 리포트에서는 세 AI 분석가의 관점을 종합하여...
  `.trim(),
  isPremium: true,
  price: 9900,
};

export default function ReportPage() {
  const params = useParams();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-32 pb-16">
        <div className="container-narrow">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-dark-500 mb-8">
            <Link href="/verdict" className="hover:text-dark-300 transition-colors">Top 5</Link>
            <span>/</span>
            <span className="text-dark-300">Report</span>
          </div>

          {/* Report Header */}
          <div className="card mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20">Premium</span>
                  <span className="text-sm text-dark-500">{MOCK_REPORT.date}</span>
                </div>
                <h1 className="text-2xl font-bold text-dark-50 mb-2">{MOCK_REPORT.title}</h1>
                <div className="flex items-center gap-2 text-dark-400">
                  <span className="font-mono">{MOCK_REPORT.symbol}</span>
                  <span className="text-dark-600">|</span>
                  <span>{MOCK_REPORT.symbolName}</span>
                </div>
              </div>
            </div>

            {/* AI Authors */}
            <div className="flex items-center gap-4 pt-6 border-t border-dark-800">
              <div className="text-sm text-dark-500">Analyzed by:</div>
              <CharacterAvatarGroup size="md" overlap />
              <div className="text-sm text-dark-400">Claude, Gemini, GPT</div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="relative">
            <div className="card">
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-dark-300 leading-relaxed">
                  {MOCK_REPORT.previewContent}
                </div>
              </div>
            </div>

            {/* Blur Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent pointer-events-none rounded-2xl" />

            {/* CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
              <div className="inline-block bg-dark-900 border border-dark-700 rounded-2xl p-8 shadow-2xl">
                <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">Unlock Full Report</h3>
                <p className="text-sm text-dark-400 mb-4">
                  전체 리포트와 상세 분석을 확인하세요
                </p>
                <div className="text-2xl font-bold text-dark-100 mb-4">
                  {MOCK_REPORT.price.toLocaleString()}원
                </div>
                <button
                  onClick={() => setShowPaywall(true)}
                  className="btn-primary w-full py-3"
                >
                  Purchase Report
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-400 text-sm mb-1">Investment Disclaimer</h4>
                <p className="text-xs text-dark-400 leading-relaxed">
                  이 리포트는 AI 분석에 기반한 엔터테인먼트 콘텐츠입니다. 투자 조언이 아니며, 
                  투자 결정의 책임은 전적으로 이용자 본인에게 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title={MOCK_REPORT.title}
        price={MOCK_REPORT.price}
      />
      
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
