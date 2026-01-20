'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import { CharacterDetailModal } from '@/components/CharacterDetailModal';
import { KRX_ALL_STOCKS, searchStocksByName, type KRXStock } from '@/lib/data/krx-stocks';
import { useCurrentPlan, useUsageLimit, useSubscription } from '@/lib/subscription/hooks';
import { UsageLimitWarning, UpgradePrompt } from '@/components/subscription';
import { LockIcon, AlertCircleIcon, InfoIcon, SparklesIcon } from 'lucide-react';
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

export default function ConsultPage() {
  const [selectedAI, setSelectedAI] = useState<CharacterType>('claude');
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

  const char = CHARACTERS[selectedAI];

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

  const startConsultation = async (stock: KRXStock) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setShowResults(false);
    setMessages([]);
    setLoading(true);

    try {
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedAI,
          stock: { symbol: stock.symbol, name: stock.name },
          messages: [],
          isInitial: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.response) {
        setMessages([{
          role: 'assistant',
          content: data.response,
          character: selectedAI,
        }]);
      }
    } catch (error) {
      console.error('Failed to start consultation:', error);
      setMessages([{
        role: 'assistant',
        content: `안녕하세요! ${stock.name}(${stock.symbol})에 대해 궁금한 점을 물어보세요.`,
        character: selectedAI,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedStock) return;
    
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

  const resetConsultation = () => {
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

          {/* AI Selector with Character Images */}
          <div className="flex justify-center gap-4 mb-8">
            {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
              const c = CHARACTERS[charId];
              const isSelected = selectedAI === charId;
              return (
                <button
                  key={charId}
                  onClick={() => {
                    setSelectedAI(charId);
                    resetConsultation();
                  }}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isSelected
                      ? `bg-gradient-to-br ${c.gradient} shadow-lg scale-105`
                      : 'bg-dark-900/80 border border-dark-800 hover:border-dark-600 hover:scale-102'
                  }`}
                >
                  {/* Character Avatar */}
                  <div className={`w-12 h-12 rounded-xl overflow-hidden ${isSelected ? 'ring-2 ring-white/30' : 'ring-1 ring-dark-700'}`}>
                    <Image
                      src={c.image}
                      alt={c.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${isSelected ? 'text-white' : 'text-dark-200'}`}>
                      {c.nameKo}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-dark-500'}`}>
                      {c.roleKo}
                    </p>
                  </div>
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-dark-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Character Info Card */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className={`relative overflow-hidden rounded-2xl border ${char.borderColor} ${char.bgColor}`}>
              <div className="p-5 flex items-start gap-4">
                {/* Large Avatar */}
                <button
                  onClick={() => setShowCharacterModal(true)}
                  className="relative flex-shrink-0 group"
                >
                  <div className={`w-20 h-20 rounded-2xl overflow-hidden ring-2 ${char.borderColor} group-hover:ring-4 transition-all`}>
                    <Image
                      src={char.image}
                      alt={char.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-dark-950/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <InfoIcon className="w-5 h-5 text-white" />
                  </div>
                </button>

                {/* Character Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-lg font-bold ${char.color}`}>{char.name}</h3>
                    <span className="text-dark-500">|</span>
                    <span className="text-dark-300 text-sm">{char.nameKo}</span>
                    <button
                      onClick={() => setShowCharacterModal(true)}
                      className="ml-auto px-2 py-1 text-xs text-dark-400 hover:text-dark-200 bg-dark-800/50 hover:bg-dark-800 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <SparklesIcon className="w-3 h-3" />
                      세계관
                    </button>
                  </div>
                  <p className="text-dark-400 text-sm mb-2">{char.roleKo}</p>
                  
                  {/* Catchphrase */}
                  <p className="text-dark-300 text-sm italic border-l-2 border-current pl-3">
                    {char.catchphrase}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {char.tags.map((tag, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 text-xs rounded-full ${char.bgColor} border ${char.borderColor} ${char.color}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Stats Bar */}
              <div className="grid grid-cols-3 border-t border-dark-800/50">
                <div className="py-2 px-4 text-center border-r border-dark-800/50">
                  <p className={`text-lg font-bold ${char.color}`}>{char.accuracy}%</p>
                  <p className="text-xs text-dark-500">적중률</p>
                </div>
                <div className="py-2 px-4 text-center border-r border-dark-800/50">
                  <p className={`text-lg font-bold ${char.color}`}>{char.totalAnalyses.toLocaleString()}</p>
                  <p className="text-xs text-dark-500">총 분석</p>
                </div>
                <div className="py-2 px-4 text-center">
                  <p className={`text-lg font-bold ${char.color}`}>{char.experience.split(' ')[0]}</p>
                  <p className="text-xs text-dark-500">경력</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Stock Search */}
            {!selectedStock && (
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-dark-100 mb-4 text-center">
                  어떤 종목에 대해 상담하시겠어요?
                </h2>
                
                {/* Search Input */}
                <div ref={searchRef} className="relative mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.length >= 1 && setShowResults(true)}
                      placeholder="종목명 또는 종목코드로 검색..."
                      className="w-full px-4 py-3 pl-11 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500 placeholder:text-dark-500"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
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
                          <svg className="w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
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
                  <p className="text-sm text-dark-500 mb-3">인기 종목</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {KRX_ALL_STOCKS.slice(0, 9).map(stock => (
                      <button
                        key={stock.symbol}
                        onClick={() => startConsultation(stock)}
                        className="p-3 bg-dark-800/50 hover:bg-dark-700/50 rounded-xl transition-all text-left"
                      >
                        <p className="font-medium text-dark-100 text-sm">{stock.name}</p>
                        <p className="text-xs text-dark-500">{stock.symbol}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            {selectedStock && (
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
                {/* Chat Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b border-dark-800 bg-gradient-to-r ${char.gradient} bg-opacity-10`}>
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
                      onClick={resetConsultation}
                      className="px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      종료
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
            )}
          </div>
          
          {/* VIP 성과 티저 */}
          {!isPremium && !planLoading && (
            <div className="max-w-3xl mx-auto mt-6">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="text-amber-400 font-medium">지난주 VIP 추천 수익률</p>
                      <p className="text-emerald-400 text-lg font-bold">+18.7%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openUpgradeModal('vip_features', 'VIP 전용 기능을 확인하세요')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
                  >
                    업그레이드
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 무료/베이직 회원 업그레이드 배너 */}
          {!isPremium && !planLoading && (
            <div className="max-w-3xl mx-auto mt-4">
              <UpgradePrompt
                type="inline"
                feature="ai_consultations"
              />
            </div>
          )}
        </div>
      </main>
      
      {/* Character Detail Modal */}
      <CharacterDetailModal
        character={char}
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
      />
    </>
  );
}
