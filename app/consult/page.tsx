'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import { KRX_ALL_STOCKS, searchStocksByName, type KRXStock } from '@/lib/data/krx-stocks';

type CharacterType = 'claude' | 'gemini' | 'gpt';

const AI_EMOJIS: Record<CharacterType, string> = {
  claude: '🔵',
  gemini: '🟣',
  gpt: '🟡',
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedAI,
          stock: { symbol: selectedStock.symbol, name: selectedStock.name },
          messages: [...messages, { role: 'user', content: userMessage }],
          isInitial: false,
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

          {/* AI Selector */}
          <div className="flex justify-center gap-3 mb-8">
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
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    isSelected
                      ? `${c.bgColor} border-2 border-current`
                      : 'bg-dark-900/80 border border-dark-800 hover:border-dark-700'
                  }`}
                >
                  <span className="text-2xl">{AI_EMOJIS[charId]}</span>
                  <span className={`font-medium ${isSelected ? c.color : 'text-dark-300'}`}>
                    {c.name}
                  </span>
                </button>
              );
            })}
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${char.bgColor} flex items-center justify-center`}>
                      <span className="text-xl">{AI_EMOJIS[selectedAI]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-dark-100">{char.name}</p>
                      <p className="text-xs text-dark-500">{selectedStock.name} ({selectedStock.symbol}) 상담 중</p>
                    </div>
                  </div>
                  <button
                    onClick={resetConsultation}
                    className="px-3 py-1.5 text-sm text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all"
                  >
                    종료
                  </button>
                </div>

                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-brand-500/20 text-dark-100'
                            : 'bg-dark-800/50 text-dark-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-dark-800/50 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-dark-800">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
