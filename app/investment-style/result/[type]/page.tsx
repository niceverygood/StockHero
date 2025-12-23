'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header, DisclaimerBar } from '@/components';
import { getInvestorTypeInfo, INVESTOR_TYPES } from '@/lib/investment-style/results';
import type { InvestorTypeInfo, InvestorType } from '@/lib/investment-style/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ShareButtons from '@/components/ShareButtons';

export default function SharedResultPage() {
  const params = useParams();
  const type = params.type as string;
  const [result, setResult] = useState<InvestorTypeInfo | null>(null);

  useEffect(() => {
    if (type && INVESTOR_TYPES[type as InvestorType]) {
      setResult(getInvestorTypeInfo(type as InvestorType));
    }
  }, [type]);

  if (!result) {
    return (
      <>
        <DisclaimerBar />
        <Header />
        <main className="min-h-screen bg-dark-950 pt-28 pb-16">
          <div className="container-app text-center py-20">
            <h1 className="text-2xl font-bold text-dark-100 mb-4">
              유효하지 않은 결과입니다
            </h1>
            <Link
              href="/investment-style"
              className="text-brand-400 hover:underline"
            >
              테스트하러 가기 →
            </Link>
          </div>
        </main>
      </>
    );
  }

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/investment-style/result/${result.type}`
    : '';
  const shareTitle = `나의 투자 DNA는 "${result.name}" 🧬`;
  const shareDescription = `${result.title} - ${result.description.slice(0, 100)}...`;

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto"
          >
            {/* Shared Badge */}
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-dark-800 rounded-full text-dark-400 text-sm">
                🔗 공유된 투자성향 분석 결과
              </span>
            </div>

            {/* Result Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card p-8 mb-6 bg-gradient-to-br ${result.gradient} bg-opacity-10 border-none relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-dark-950/80" />
              <div className="relative z-10 text-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="text-7xl inline-block mb-4"
                >
                  {result.emoji}
                </motion.span>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-dark-400 mb-2">투자자 유형</p>
                  <h1 className={`text-4xl font-bold ${result.color} mb-2`}>
                    {result.name}
                  </h1>
                  <p className="text-dark-300 text-lg mb-2">{result.nameEn}</p>
                  <p className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${result.gradient} text-white text-sm font-medium`}>
                    {result.type}
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Title & Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6 mb-6"
            >
              <h2 className="text-xl font-bold text-dark-100 mb-3">
                &ldquo;{result.title}&rdquo;
              </h2>
              <p className="text-dark-300 leading-relaxed">
                {result.description}
              </p>
            </motion.div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="card p-6"
              >
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <span>💪</span> 강점
                </h3>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-dark-300">
                      <span className="text-emerald-400">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="card p-6"
              >
                <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <span>⚠️</span> 주의점
                </h3>
                <ul className="space-y-2">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-dark-300">
                      <span className="text-amber-400">•</span> {w}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Risk Level & Famous Investor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid md:grid-cols-2 gap-4 mb-8"
            >
              <div className="card p-6">
                <h3 className="text-sm text-dark-500 mb-2">위험 선호도</h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div
                      key={level}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        level <= result.riskLevel
                          ? `bg-gradient-to-r ${result.gradient} text-white`
                          : 'bg-dark-700 text-dark-500'
                      }`}
                    >
                      {level <= result.riskLevel ? '🔥' : '○'}
                    </div>
                  ))}
                  <span className="text-dark-400 ml-2">
                    {result.riskLevel === 1 ? '매우 낮음' :
                     result.riskLevel === 2 ? '낮음' :
                     result.riskLevel === 3 ? '보통' :
                     result.riskLevel === 4 ? '높음' : '매우 높음'}
                  </span>
                </div>
              </div>

              {result.famousInvestor && (
                <div className="card p-6">
                  <h3 className="text-sm text-dark-500 mb-2">닮은 투자 대가</h3>
                  <p className="text-xl font-bold text-dark-100">
                    {result.famousInvestor}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Share Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="card p-6 mb-6"
            >
              <h3 className="text-lg font-bold text-dark-100 mb-4 text-center">
                📤 결과 공유하기
              </h3>
              <ShareButtons
                url={shareUrl}
                title={shareTitle}
                description={shareDescription}
                hashtags={['투자성향', 'StockHero', result.type]}
              />
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link
                href="/investment-style"
                className={`px-8 py-4 bg-gradient-to-r ${result.gradient} text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-shadow`}
              >
                🧬 나도 테스트하기
              </Link>
              <Link
                href="/consulting"
                className="px-6 py-3 bg-dark-800 text-dark-200 font-medium rounded-xl hover:bg-dark-700 transition-colors"
              >
                💬 AI 상담받기
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </>
  );
}

