'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, DisclaimerBar, CharacterAvatar, ShareButtons } from '@/components';
import { QUIZ_QUESTIONS, STAGE_INFO, calculateInvestorType } from '@/lib/investment-style/questions';
import { getInvestorTypeInfo, INVESTOR_TYPES } from '@/lib/investment-style/results';
import type { InvestorTypeInfo } from '@/lib/investment-style/types';
import Link from 'next/link';

type QuizState = 'intro' | 'quiz' | 'analyzing' | 'result';

interface Answer {
  questionId: number;
  dimension: string;
  value: string;
}

export default function InvestmentStylePage() {
  const [state, setState] = useState<QuizState>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<InvestorTypeInfo | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const currentStage = question?.stage || 1;
  const stageInfo = STAGE_INFO.find(s => s.stage === currentStage);
  const progress = ((currentQuestion) / QUIZ_QUESTIONS.length) * 100;

  const handleStart = () => {
    setState('quiz');
    setCurrentQuestion(0);
    setAnswers([]);
  };

  const handleAnswer = (value: string) => {
    const newAnswer: Answer = {
      questionId: question.id,
      dimension: question.dimension,
      value,
    };
    
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // 분석 시작
      setState('analyzing');
      setTimeout(() => {
        const investorType = calculateInvestorType(newAnswers);
        const typeInfo = getInvestorTypeInfo(investorType);
        setResult(typeInfo);
        setState('result');
      }, 2500);
    }
  };

  const handleRestart = () => {
    setState('intro');
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
    setShowRecommendations(false);
    setRecommendations(null);
  };

  const fetchRecommendations = async () => {
    if (!result) return;
    
    setIsLoadingRecommendations(true);
    setShowRecommendations(true);
    
    try {
      const response = await fetch('/api/investment-style/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investorType: result.type }),
      });
      
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app">
          <AnimatePresence mode="wait">
            {/* Intro Screen */}
            {state === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-8xl mb-8"
                >
                  🧬
                </motion.div>
                
                <h1 className="text-4xl font-bold text-dark-100 mb-4">
                  나의 투자성향 분석
                </h1>
                <p className="text-xl text-dark-400 mb-2">
                  Investment DNA Test
                </p>
                <p className="text-dark-500 mb-8">
                  12개의 재미있는 질문으로 알아보는<br />
                  나만의 <span className="text-brand-400 font-semibold">16가지 투자자 유형</span>
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8 text-left max-w-md mx-auto">
                  {STAGE_INFO.map((stage, idx) => (
                    <motion.div
                      key={stage.stage}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50"
                    >
                      <span className="text-2xl">{stage.emoji}</span>
                      <div>
                        <p className="font-medium text-dark-200">{stage.title}</p>
                        <p className="text-xs text-dark-500">3문항</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-brand-500 to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-shadow"
                >
                  테스트 시작하기 →
                </motion.button>

                <p className="mt-6 text-dark-600 text-sm">
                  약 2분 소요 • 총 12문항
                </p>
              </motion.div>
            )}

            {/* Quiz Screen */}
            {state === 'quiz' && question && (
              <motion.div
                key={`quiz-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="max-w-2xl mx-auto"
              >
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium bg-gradient-to-r ${stageInfo?.color} bg-clip-text text-transparent`}>
                      Stage {currentStage}: {stageInfo?.title}
                    </span>
                    <span className="text-dark-500 text-sm">{currentQuestion + 1} / {QUIZ_QUESTIONS.length}</span>
                  </div>
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${stageInfo?.color}`}
                      initial={{ width: `${((currentQuestion) / QUIZ_QUESTIONS.length) * 100}%` }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Stage Change Animation */}
                {QUIZ_QUESTIONS[currentQuestion - 1]?.stage !== question.stage && currentQuestion > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center mb-6"
                  >
                    <span className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${stageInfo?.color} text-white font-medium`}>
                      {stageInfo?.emoji} {stageInfo?.title}
                    </span>
                  </motion.div>
                )}

                {/* Question Card */}
                <div className="card p-8 mb-6">
                  <div className="text-center mb-8">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="text-6xl inline-block mb-4"
                    >
                      {question.emoji}
                    </motion.span>
                    <h2 className="text-xl font-bold text-dark-100 mb-2">
                      {question.question}
                    </h2>
                    {question.subtitle && (
                      <p className="text-dark-400">{question.subtitle}</p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    {question.options.map((option, idx) => (
                      <motion.button
                        key={option.value}
                        onClick={() => handleAnswer(option.value)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02, x: 10 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-5 rounded-xl border-2 border-dark-700 hover:border-brand-500 bg-dark-800/50 hover:bg-dark-800 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl group-hover:scale-110 transition-transform">
                            {option.emoji}
                          </span>
                          <div>
                            <p className="font-medium text-dark-100 group-hover:text-brand-400 transition-colors">
                              {option.text}
                            </p>
                            {option.description && (
                              <p className="text-sm text-dark-500 mt-1">{option.description}</p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analyzing Screen */}
            {state === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-md mx-auto text-center py-20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-7xl mb-8 inline-block"
                >
                  🧬
                </motion.div>
                <h2 className="text-2xl font-bold text-dark-100 mb-4">
                  투자 DNA 분석 중...
                </h2>
                <div className="flex justify-center gap-1 mb-4">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
                      className="w-3 h-3 bg-brand-500 rounded-full"
                    />
                  ))}
                </div>
                <p className="text-dark-500">
                  당신의 답변을 기반으로<br />
                  16가지 유형 중 최적의 유형을 찾고 있어요
                </p>
              </motion.div>
            )}

            {/* Result Screen */}
            {state === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
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
                      <p className="text-dark-400 mb-2">당신의 투자자 유형은</p>
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

                {/* Investment Style & Sectors */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="card p-6 mb-6"
                >
                  <h3 className="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
                    <span>📊</span> 추천 투자 전략
                  </h3>
                  <p className="text-dark-300 mb-4">{result.investmentStyle}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {result.recommendedSectors.map((sector, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${result.gradient} bg-opacity-20 text-dark-200 text-sm`}
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Risk Level & Famous Investor */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
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
                  transition={{ delay: 0.75 }}
                  className="card p-6 mb-6"
                >
                  <h3 className="text-lg font-bold text-dark-100 mb-4 text-center flex items-center justify-center gap-2">
                    <span>📤</span> 결과 공유하기
                  </h3>
                  <ShareButtons
                    url={typeof window !== 'undefined' 
                      ? `${window.location.origin}/investment-style/result/${result.type}`
                      : ''}
                    title={`나의 투자 DNA는 "${result.name}" 🧬`}
                    description={`${result.title} - StockHero 투자성향 분석 결과`}
                    hashtags={['투자성향', 'StockHero', result.type.replace(/-/g, '')]}
                  />
                </motion.div>

                {/* AI Recommendations Button */}
                {!showRecommendations ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-center mb-8"
                  >
                    <button
                      onClick={fetchRecommendations}
                      className={`px-8 py-4 bg-gradient-to-r ${result.gradient} text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-shadow`}
                    >
                      🤖 AI 3명이 추천하는 나의 투자 종목 보기
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                  >
                    <h3 className="text-xl font-bold text-dark-100 mb-6 text-center">
                      🤖 {result.name}를 위한 AI 추천 종목
                    </h3>
                    
                    {isLoadingRecommendations ? (
                      <div className="card p-8 text-center">
                        <div className="flex justify-center gap-4 mb-4">
                          <CharacterAvatar character="claude" size="lg" />
                          <CharacterAvatar character="gemini" size="lg" />
                          <CharacterAvatar character="gpt" size="lg" />
                        </div>
                        <p className="text-dark-400">AI들이 당신에게 맞는 종목을 분석 중...</p>
                        <div className="flex justify-center gap-1 mt-4">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
                              className="w-2 h-2 bg-brand-500 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    ) : recommendations ? (
                      <div className="space-y-4">
                        {/* 변동성 선호도 정보 표시 */}
                        {recommendations.volatilityInfo && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`card p-4 mb-4 ${
                              recommendations.volatilityInfo.preference === 'high'
                                ? 'border-red-500/50 bg-red-500/5'
                                : recommendations.volatilityInfo.preference === 'low'
                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                : 'border-blue-500/50 bg-blue-500/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {recommendations.volatilityInfo.preference === 'high' ? '🔥' :
                                 recommendations.volatilityInfo.preference === 'low' ? '🛡️' : '📊'}
                              </span>
                              <div>
                                <p className="font-medium text-dark-100">
                                  {recommendations.volatilityInfo.preference === 'high' ? '공격적 투자 성향' :
                                   recommendations.volatilityInfo.preference === 'low' ? '안정적 투자 성향' : '균형 투자 성향'}
                                </p>
                                <p className="text-sm text-dark-400">{recommendations.volatilityInfo.description}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* 경고 메시지 (공격적 투자자용) */}
                        {recommendations.disclaimer && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4"
                          >
                            <p className="text-amber-400 text-sm">{recommendations.disclaimer}</p>
                          </motion.div>
                        )}

                        {/* 추천 종목 리스트 */}
                        {recommendations.recommendations?.map((rec: any, idx: number) => (
                          <motion.div
                            key={rec.heroId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card p-5"
                          >
                            <div className="flex items-start gap-4">
                              <CharacterAvatar character={rec.heroId} size="lg" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-bold text-dark-100">{rec.heroName}</span>
                                  <span className="text-dark-500 text-sm">추천</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className="text-lg font-bold text-brand-400">{rec.stockName}</span>
                                  <span className="text-dark-400">{rec.stockSymbol}</span>
                                  <span className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
                                    {rec.sector}
                                  </span>
                                  {rec.market && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      rec.market === 'US' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                    }`}>
                                      {rec.market === 'US' ? '🇺🇸 미국' : '🇰🇷 한국'}
                                    </span>
                                  )}
                                </div>

                                {/* 변동성 정보 표시 */}
                                {rec.volatilityLabel && (
                                  <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                      rec.volatility === 'extreme' ? 'bg-red-500/20 text-red-400' :
                                      rec.volatility === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                      rec.volatility === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                      {rec.volatilityLabel}
                                    </span>
                                    {rec.beta && (
                                      <span className="text-xs text-dark-500">
                                        베타 {rec.beta}
                                      </span>
                                    )}
                                    {rec.avgDailyMove && (
                                      <span className="text-xs text-dark-500">
                                        일평균 ±{rec.avgDailyMove}%
                                      </span>
                                    )}
                                  </div>
                                )}

                                <p className="text-dark-300 text-sm mb-2">{rec.reason}</p>
                                
                                {/* 위험 경고 표시 */}
                                {rec.riskWarning && (
                                  <p className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded mb-2">
                                    ⚠️ {rec.riskWarning}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-dark-500">
                                    적합도: <span className="text-brand-400 font-bold">{rec.matchScore}%</span>
                                  </span>
                                  {rec.riskLevel && (
                                    <span className="text-dark-500">
                                      위험도: 
                                      <span className="ml-1">
                                        {Array(5).fill(0).map((_, i) => (
                                          <span key={i} className={i < rec.riskLevel ? 'text-red-400' : 'text-dark-700'}>
                                            ●
                                          </span>
                                        ))}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="card p-8 text-center text-dark-400">
                        추천 종목을 불러오는데 실패했습니다.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="flex flex-wrap justify-center gap-4"
                >
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 bg-dark-800 text-dark-200 font-medium rounded-xl hover:bg-dark-700 transition-colors"
                  >
                    🔄 다시 테스트하기
                  </button>
                  <Link
                    href={`/consulting?investorType=${result.type}`}
                    className={`px-6 py-3 bg-gradient-to-r ${result.gradient} text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2`}
                  >
                    <span>{result.emoji}</span>
                    <span>{result.name} 맞춤 AI 상담받기</span>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

