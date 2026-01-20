'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import { CharacterDetailModal } from '@/components/CharacterDetailModal';
import { KRX_ALL_STOCKS, searchStocksByName, type KRXStock } from '@/lib/data/krx-stocks';
import { useCurrentPlan, useUsageLimit, useSubscription } from '@/lib/subscription/hooks';
import { UsageLimitWarning, UpgradePrompt } from '@/components/subscription';
import { AlertCircleIcon, InfoIcon, SparklesIcon, ChevronRightIcon, CheckIcon, ArrowLeftIcon } from 'lucide-react';
import type { CharacterType } from '@/lib/llm/types';

// 플랜별 응답 길이 제한
const RESPONSE_LIMITS: Record<string, number> = {
  free: 500,
  basic: 1000,
  pro: 2000,
  vip: 5000,
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  character?: CharacterType;
}

// 단계 타입
type Step = 1 | 2 | 3;

// AI별 추천 질문
const SUGGESTED_QUESTIONS: Record<CharacterType, string[]> = {
  claude: [
    '현재 적정 주가는 얼마인가요?',
    'PER, PBR 기준으로 고평가인가요?',
    '동종업계 대비 어떤가요?',
    '분할 매수 전략을 추천해주세요',
    '리스크 요인은 뭔가요?',
  ],
  gemini: [
    '성장 가능성이 얼마나 될까요?',
    '이 섹터의 미래 전망은 어떤가요?',
    '경쟁사 대비 강점이 뭔가요?',
    '언제 매수하면 좋을까요?',
    '목표 수익률은 어느 정도가 좋을까요?',
  ],
  gpt: [
    '지금 진입해도 괜찮을까요?',
    '거시경제가 이 종목에 미치는 영향은?',
    '포트폴리오 비중은 얼마가 적당할까요?',
    '손절가와 목표가를 알려주세요',
    '장기 투자해도 될까요?',
  ],
};

export default function ConsultPage() {
  // 현재 단계 (1: 전문가 선택, 2: 종목 선택, 3: 상담)
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedAI, setSelectedAI] = useState<CharacterType | null>(null);
  const [selectedStock, setSelectedStock] = useState<KRXStock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KRXStock[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // 구독 정보
  const { planName, isPremium, isVip, isLoading: planLoading } = useCurrentPlan();
  const { limit: consultationLimit, increment: incrementConsultation, openUpgrade } = useUsageLimit('ai_consultations');
  const { openUpgradeModal } = useSubscription();
  
  // 상담 제한 여부
  const isLimitReached = !consultationLimit.allowed;
  const responseLimit = RESPONSE_LIMITS[planName] || 500;

  const char = selectedAI ? CHARACTERS[selectedAI] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 검색어 변경 시 검색 결과 업데이트
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const results = searchStocksByName(searchQuery).slice(0, 10);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  // 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 단계 1 → 2: 전문가 선택 후 다음
  const goToStep2 = () => {
    if (selectedAI) {
      setCurrentStep(2);
    }
  };

  // 단계 2 → 3: 종목 선택 후 상담 시작
  const startConsultation = async (stock: KRXStock) => {
    if (!selectedAI) return;
    
    setSelectedStock(stock);
    setSearchQuery('');
    setShowResults(false);
    setCurrentStep(3);
    setMessages([]);
    setLoading(true);

    try {
      // 먼저 실시간 가격 조회
      let stockPrice = null;
      try {
        const priceRes = await fetch(`/api/stocks/price?symbol=${stock.symbol}`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
          stockPrice = {
            symbol: stock.symbol,
            name: stock.name,
            currentPrice: priceData.data.price,
            change: priceData.data.change,
            changePercent: priceData.data.changePercent,
          };
        }
      } catch (e) {
        console.log('Price fetch failed, continuing without price');
      }

      // AI 초기 분석 요청
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterType: selectedAI,
          messages: [{ role: 'user', content: `${stock.name}(${stock.symbol}) 종목에 대해 분석해주세요.` }],
          stockData: stockPrice,
          isInitialAnalysis: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.content) {
        setMessages([{
          role: 'assistant',
          content: data.data.content,
          character: selectedAI,
        }]);
      } else {
        // API 실패 시 기본 메시지
        const charName = CHARACTERS[selectedAI].nameKo;
        setMessages([{
          role: 'assistant',
          content: `안녕하세요! ${charName}입니다. ${stock.name}(${stock.symbol})에 대해 상담을 시작합니다.\n\n어떤 부분이 궁금하신가요? 매수/매도 의견, 적정 주가, 리스크 분석 등 다양한 질문을 해주세요!`,
          character: selectedAI,
        }]);
      }
    } catch (error) {
      console.error('Failed to start consultation:', error);
      const charName = CHARACTERS[selectedAI].nameKo;
      setMessages([{
        role: 'assistant',
        content: `안녕하세요! ${charName}입니다. ${stock.name}(${stock.symbol})에 대해 궁금한 점을 물어보세요.`,
        character: selectedAI,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // 추천 질문 클릭 핸들러
  const handleSuggestedQuestion = (question: string) => {
    if (!selectedStock) return;
    setInput(`${selectedStock.name}의 ${question.replace('?', '')}에 대해 알려주세요`);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedStock || !selectedAI) return;
    
    // 사용량 체크
    if (isLimitReached) {
      openUpgrade();
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // 사용량 증가
      const canProceed = await incrementConsultation();
      if (!canProceed) {
        setLoading(false);
        return;
      }
      
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedAI,
          stock: { symbol: selectedStock.symbol, name: selectedStock.name },
          messages: [...messages, { role: 'user', content: userMessage }],
          isInitial: false,
          maxLength: responseLimit,
        }),
      });

      const data = await res.json();
      if (data.success && data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          character: selectedAI,
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  // 이전 단계로
  const goBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setSelectedStock(null);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setMessages([]);
      setSelectedStock(null);
    }
  };

  // 처음부터 다시 시작
  const resetAll = () => {
    setCurrentStep(1);
    setSelectedAI(null);
    setSelectedStock(null);
    setMessages([]);
    setSearchQuery('');
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 left-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />

        <div className="relative container-app">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="text-dark-100">AI</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">상담</span>
            </h1>
            <p className="text-dark-400">
              종목에 대해 AI 전문가와 상담하세요
            </p>
          </div>

          {/* Progress Steps */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center justify-center gap-2">
              {/* Step 1 */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                currentStep === 1 
                  ? 'bg-brand-500 text-white' 
                  : currentStep > 1 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-dark-800 text-dark-500'
              }`}>
                {currentStep > 1 ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                )}
                <span className="text-sm font-medium">전문가 선택</span>
              </div>

              <ChevronRightIcon className="w-5 h-5 text-dark-600" />

              {/* Step 2 */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                currentStep === 2 
                  ? 'bg-brand-500 text-white' 
                  : currentStep > 2 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-dark-800 text-dark-500'
              }`}>
                {currentStep > 2 ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                )}
                <span className="text-sm font-medium">종목 선택</span>
              </div>

              <ChevronRightIcon className="w-5 h-5 text-dark-600" />

              {/* Step 3 */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                currentStep === 3 
                  ? 'bg-brand-500 text-white' 
                  : 'bg-dark-800 text-dark-500'
              }`}>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-sm font-medium">상담 시작</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* ============================================ */}
            {/* STEP 1: 전문가 선택 */}
            {/* ============================================ */}
            {currentStep === 1 && (
              <div className="animate-fadeIn">
                <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-dark-100 mb-2 text-center">
                    🎯 어떤 전문가와 상담하시겠어요?
                  </h2>
                  <p className="text-dark-400 text-sm text-center mb-6">
                    각 전문가는 고유한 분석 스타일과 관점을 가지고 있습니다
                  </p>

                  {/* AI Character Selection */}
                  <div className="space-y-4 mb-6">
                    {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                      const c = CHARACTERS[charId];
                      const isSelected = selectedAI === charId;
                      return (
                        <button
                          key={charId}
                          onClick={() => setSelectedAI(charId)}
                          className={`w-full p-4 rounded-2xl transition-all flex items-center gap-4 ${
                            isSelected
                              ? `bg-gradient-to-r ${c.gradient} shadow-lg ring-2 ring-white/20`
                              : 'bg-dark-800/50 border border-dark-700 hover:border-dark-600 hover:bg-dark-800'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ${isSelected ? 'ring-2 ring-white/30' : 'ring-1 ring-dark-600'}`}>
                            <Image
                              src={c.image}
                              alt={c.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-dark-100'}`}>
                                {c.nameKo}
                              </h3>
                              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-dark-500'}`}>
                                {c.name}
                              </span>
                            </div>
                            <p className={`text-sm mb-2 ${isSelected ? 'text-white/80' : 'text-dark-400'}`}>
                              {c.roleKo}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    isSelected 
                                      ? 'bg-white/20 text-white' 
                                      : `${c.bgColor} ${c.color} border ${c.borderColor}`
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className={`text-right flex-shrink-0 ${isSelected ? 'text-white' : ''}`}>
                            <p className={`text-lg font-bold ${isSelected ? 'text-white' : c.color}`}>
                              {c.accuracy}%
                            </p>
                            <p className={`text-xs ${isSelected ? 'text-white/60' : 'text-dark-500'}`}>
                              적중률
                            </p>
                          </div>

                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckIcon className="w-4 h-4 text-dark-900" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={goToStep2}
                    disabled={!selectedAI}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                      selectedAI
                        ? 'bg-brand-500 hover:bg-brand-600 text-white'
                        : 'bg-dark-800 text-dark-500 cursor-not-allowed'
                    }`}
                  >
                    {selectedAI ? (
                      <>
                        {CHARACTERS[selectedAI].nameKo}와 상담하기
                        <ChevronRightIcon className="w-5 h-5" />
                      </>
                    ) : (
                      '전문가를 선택해주세요'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* STEP 2: 종목 선택 */}
            {/* ============================================ */}
            {currentStep === 2 && char && (
              <div className="animate-fadeIn">
                {/* Selected Expert Card */}
                <div className={`mb-6 p-4 rounded-2xl border ${char.borderColor} ${char.bgColor}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl overflow-hidden ring-2 ${char.borderColor}`}>
                      <Image
                        src={char.image}
                        alt={char.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${char.color}`}>{char.nameKo}</p>
                      <p className="text-dark-400 text-sm">{char.roleKo}</p>
                    </div>
                    <button
                      onClick={goBack}
                      className="px-3 py-1.5 text-sm text-dark-400 hover:text-dark-200 bg-dark-800/50 hover:bg-dark-800 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      변경
                    </button>
                  </div>
                </div>

                {/* Stock Selection */}
                <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-dark-100 mb-2 text-center">
                    📈 어떤 종목에 대해 상담하시겠어요?
                  </h2>
                  <p className="text-dark-400 text-sm text-center mb-6">
                    {char.nameKo}에게 물어보고 싶은 종목을 선택하세요
                  </p>
                  
                  {/* Search Input */}
                  <div ref={searchRef} className="relative mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 1 && setShowResults(true)}
                        placeholder="종목명 또는 종목코드로 검색..."
                        className={`w-full px-4 py-4 pl-12 bg-dark-800 border-2 border-dark-700 rounded-xl text-dark-100 text-lg focus:outline-none focus:border-brand-500 placeholder:text-dark-500`}
                        autoFocus
                      />
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto shadow-xl">
                        {searchResults.map((stock) => (
                          <button
                            key={stock.symbol}
                            onClick={() => startConsultation(stock)}
                            className="w-full px-4 py-3 text-left hover:bg-dark-700/50 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-dark-100">{stock.name}</p>
                              <p className="text-xs text-dark-500">{stock.symbol} · {stock.market} · {stock.sector}</p>
                            </div>
                            <div className={`px-3 py-1.5 ${char.bgColor} ${char.color} rounded-lg text-sm font-medium`}>
                              상담하기
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {showResults && searchQuery.length >= 1 && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-xl p-4 text-center text-dark-500">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>

                  {/* Popular Stocks */}
                  <div>
                    <p className="text-sm text-dark-500 mb-3 flex items-center gap-2">
                      <span>🔥</span> 인기 종목
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {KRX_ALL_STOCKS.slice(0, 9).map(stock => (
                        <button
                          key={stock.symbol}
                          onClick={() => startConsultation(stock)}
                          className="p-4 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-700 hover:border-dark-600 rounded-xl transition-all text-left group"
                        >
                          <p className="font-medium text-dark-100 group-hover:text-white transition-colors">{stock.name}</p>
                          <p className="text-xs text-dark-500">{stock.symbol}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* STEP 3: 상담 */}
            {/* ============================================ */}
            {currentStep === 3 && char && selectedStock && (
              <div className="animate-fadeIn">
                <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
                  {/* Chat Header */}
                  <div className={`flex items-center justify-between px-5 py-4 border-b border-dark-800 bg-gradient-to-r ${char.gradient}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white/20">
                        <Image
                          src={char.image}
                          alt={char.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-white">{char.nameKo}</p>
                        <p className="text-xs text-white/70">{selectedStock.name} ({selectedStock.symbol}) 상담 중</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCharacterModal(true)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="세계관 보기"
                      >
                        <InfoIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={resetAll}
                        className="px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      >
                        새 상담
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto p-5 space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden mr-2 ring-1 ring-dark-700">
                            <Image
                              src={char.image}
                              alt={char.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-brand-500/20 text-dark-100'
                              : `${char.bgColor} border ${char.borderColor} text-dark-200`
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden mr-2 ring-1 ring-dark-700">
                          <Image
                            src={char.image}
                            alt={char.name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className={`${char.bgColor} border ${char.borderColor} rounded-2xl px-4 py-3`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${char.color.replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                            <div className={`w-2 h-2 ${char.color.replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
                            <div className={`w-2 h-2 ${char.color.replace('text-', 'bg-')} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 사용량 경고 */}
                  {!planLoading && (
                    <div className="px-4 pt-2">
                      <UsageLimitWarning
                        feature="ai_consultations"
                        variant="compact"
                      />
                    </div>
                  )}

                  {/* 추천 질문 */}
                  {selectedAI && !loading && messages.length > 0 && messages.length < 5 && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-dark-600">
                          <Image
                            src={char?.image || ''}
                            alt={char?.name || ''}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-dark-400 flex items-center gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          <span className={char?.color}>{char?.nameKo}</span>에게 물어보세요
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_QUESTIONS[selectedAI].slice(0, 4).map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestedQuestion(q)}
                            className={`px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1.5 ${
                              char ? `${char.bgColor} ${char.color} border ${char.borderColor} hover:opacity-80` 
                                   : 'bg-dark-800 text-dark-300 border border-dark-700 hover:bg-dark-700'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Input */}
                  <div className="p-4 border-t border-dark-800">
                    {isLimitReached ? (
                      <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-center gap-2">
                          <AlertCircleIcon className="w-5 h-5 text-red-400" />
                          <span className="text-red-300 text-sm">오늘 상담 횟수를 모두 사용했습니다</span>
                        </div>
                        <button
                          onClick={openUpgrade}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg"
                        >
                          업그레이드
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="질문을 입력하세요..."
                          className="flex-1 px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={loading || !input.trim()}
                          className="px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          전송
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Character Detail Modal */}
      {char && (
        <CharacterDetailModal
          character={char}
          isOpen={showCharacterModal}
          onClose={() => setShowCharacterModal(false)}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
