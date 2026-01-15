'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';

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

const POPULAR_STOCKS = [
  { symbol: '005930', name: '삼성전자' },
  { symbol: '000660', name: 'SK하이닉스' },
  { symbol: '035720', name: '카카오' },
  { symbol: '035420', name: 'NAVER' },
  { symbol: '005380', name: '현대차' },
  { symbol: '068270', name: '셀트리온' },
];

export default function ConsultPage() {
  const [selectedAI, setSelectedAI] = useState<CharacterType>('claude');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const char = CHARACTERS[selectedAI];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConsultation = async (stock: { symbol: string; name: string }) => {
    setSelectedStock(stock.name);
    setMessages([]);
    setLoading(true);

    try {
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedAI,
          stock: stock,
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
      const stock = POPULAR_STOCKS.find(s => s.name === selectedStock) || { symbol: '', name: selectedStock };
      
      const res = await fetch('/api/consultation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedAI,
          stock,
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
            {/* Stock Selection */}
            {!selectedStock && (
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-dark-100 mb-4 text-center">
                  어떤 종목에 대해 상담하시겠어요?
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {POPULAR_STOCKS.map(stock => (
                    <button
                      key={stock.symbol}
                      onClick={() => startConsultation(stock)}
                      className="p-4 bg-dark-800/50 hover:bg-dark-700/50 rounded-xl transition-all text-left"
                    >
                      <p className="font-medium text-dark-100">{stock.name}</p>
                      <p className="text-xs text-dark-500">{stock.symbol}</p>
                    </button>
                  ))}
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
                      <p className="text-xs text-dark-500">{selectedStock} 상담 중</p>
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
