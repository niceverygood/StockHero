'use client';

import { useState, useRef, useEffect } from 'react';
import { CharacterAvatar } from './CharacterAvatar';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/llm/types';

interface Message {
  id: string;
  type: 'user' | 'expert';
  content: string;
  characterType?: CharacterType;
  timestamp: Date;
}

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface MultiExpertConsultationProps {
  isOpen: boolean;
  onClose: () => void;
  stockSymbol?: string;
  stockName?: string;
  stockData?: StockData;
}

const SUGGESTED_QUESTIONS = [
  '투자 매력도는?',
  '지금 매수해도 괜찮을까요?',
  '장기 투자 관점은?',
  '주요 리스크는?',
];

export function MultiExpertConsultation({ 
  isOpen, 
  onClose, 
  stockSymbol, 
  stockName,
  stockData,
}: MultiExpertConsultationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExperts, setLoadingExperts] = useState<CharacterType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessage, setCurrentTypingMessage] = useState('');
  const [typingCharacter, setTypingCharacter] = useState<CharacterType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 모달 열릴 때 초기화 및 초기 분석 요청
  useEffect(() => {
    if (isOpen && stockData && stockName) {
      setMessages([]);
      setInput('');
      setIsLoading(false);
      requestInitialAnalysis();
    }
  }, [isOpen, stockData, stockName]);

  // 자동 스크롤 비활성화
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages, currentTypingMessage]);

  // 초기 분석 요청 (3명 모두)
  const requestInitialAnalysis = async () => {
    if (!stockData || !stockName) return;

    setIsLoading(true);
    const experts: CharacterType[] = ['claude', 'gemini', 'gpt'];
    setLoadingExperts([...experts]);

    for (const expert of experts) {
      try {
        // 현재 전문가 응답 대기 상태로 설정
        setTypingCharacter(expert);
        setIsTyping(true);
        setCurrentTypingMessage('');

        const response = await fetch('/api/consultation/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterType: expert,
            messages: [{
              role: 'user',
              content: `${stockName}(${stockSymbol})에 대한 당신의 투자 관점과 핵심 의견을 간단히 말해주세요. 현재가 ${stockData.currentPrice?.toLocaleString() || '정보없음'}원입니다.`,
            }],
            stockData,
            isInitialAnalysis: true,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.data?.content) {
          const content = data.data.content;
          const messageId = `${expert}-initial-${Date.now()}`;
          
          // 타이핑 애니메이션 (더 부드럽게)
          const chunkSize = 5;
          for (let i = 0; i <= content.length; i += chunkSize) {
            setCurrentTypingMessage(content.substring(0, i));
            await new Promise(resolve => setTimeout(resolve, 8));
          }
          // 전체 내용 표시
          setCurrentTypingMessage(content);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 타이핑 상태 해제 후 메시지 추가 (순서 중요!)
          setIsTyping(false);
          setTypingCharacter(null);
          setCurrentTypingMessage('');
          
          // 약간의 딜레이 후 메시지 추가 (깜빡임 방지)
          await new Promise(resolve => setTimeout(resolve, 50));
          
          setMessages(prev => [...prev, {
            id: messageId,
            type: 'expert',
            content: content,
            characterType: expert,
            timestamp: new Date(),
          }]);
          
          // 다음 전문가 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`${expert} initial analysis error:`, error);
        // 에러 발생 시에도 상태 정리
        setIsTyping(false);
        setTypingCharacter(null);
        setCurrentTypingMessage('');
      } finally {
        setLoadingExperts(prev => prev.filter(e => e !== expert));
      }
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  // 질문 제출
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const experts: CharacterType[] = ['claude', 'gemini', 'gpt'];
    setLoadingExperts([...experts]);

    // 대화 히스토리 구성
    const conversationHistory = messages
      .filter(m => m.type === 'user' || m.characterType)
      .map(m => ({
        role: m.type === 'user' ? 'user' as const : 'assistant' as const,
        content: m.type === 'user' ? m.content : `[${CHARACTERS[m.characterType!].name}] ${m.content}`,
      }));

    for (const expert of experts) {
      try {
        setTypingCharacter(expert);
        setIsTyping(true);
        setCurrentTypingMessage('');

        const response = await fetch('/api/consultation/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterType: expert,
            messages: [...conversationHistory, { role: 'user', content: userMessage.content }],
            stockData,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.data?.content) {
          const content = data.data.content;
          const messageId = `${expert}-${Date.now()}`;
          
          // 타이핑 애니메이션
          for (let i = 0; i <= content.length; i += 5) {
            setCurrentTypingMessage(content.substring(0, i));
            await new Promise(resolve => setTimeout(resolve, 8));
          }
          setCurrentTypingMessage(content);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 타이핑 상태 해제 후 메시지 추가
          setIsTyping(false);
          setTypingCharacter(null);
          setCurrentTypingMessage('');
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          setMessages(prev => [...prev, {
            id: messageId,
            type: 'expert',
            content: content,
            characterType: expert,
            timestamp: new Date(),
          }]);
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`${expert} response error:`, error);
        setIsTyping(false);
        setTypingCharacter(null);
        setCurrentTypingMessage('');
        setMessages(prev => [...prev, {
          id: `${expert}-error-${Date.now()}`,
          type: 'expert',
          content: '응답을 받지 못했습니다. 다시 시도해주세요.',
          characterType: expert,
          timestamp: new Date(),
        }]);
      } finally {
        setLoadingExperts(prev => prev.filter(e => e !== expert));
      }
    }

    setIsTyping(false);
    setTypingCharacter(null);
    setCurrentTypingMessage('');
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-900 rounded-2xl w-full max-w-3xl h-[85vh] overflow-hidden flex flex-col border border-dark-700 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-dark-800 bg-gradient-to-r from-claude-500/10 via-gemini-500/10 to-gpt-500/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {(['claude', 'gemini', 'gpt'] as CharacterType[]).map((char) => (
                  <div key={char} className="ring-2 ring-dark-900 rounded-full">
                    <CharacterAvatar character={char} size="sm" />
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">3인 전문가 상담</h2>
                {stockName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-400">{stockName}</span>
                    <span className="text-xs text-dark-500 font-mono">{stockSymbol}</span>
                    {stockData && stockData.currentPrice > 0 && (
                      <>
                        <span className="text-xs text-dark-600">|</span>
                        <span className="text-xs text-dark-300">{stockData.currentPrice.toLocaleString()}원</span>
                        {stockData.changePercent !== 0 && (
                          <span className={`text-xs ${stockData.changePercent > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {stockData.changePercent > 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 초기 로딩 */}
          {messages.length === 0 && isLoading && (
            <div className="text-center py-8">
              {/* 스피너 인디케이터 */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* 외부 링 - 회전 */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 border-r-purple-500 animate-spin" />
                {/* 중간 링 - 반대로 회전 */}
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-blue-500 border-l-amber-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                {/* 내부 펄스 */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 animate-pulse" />
              </div>
              
              <div className="flex justify-center gap-4 mb-4">
                {(['claude', 'gemini', 'gpt'] as CharacterType[]).map((char, idx) => (
                  <div 
                    key={char} 
                    className={`relative transition-all duration-500 ${loadingExperts.includes(char) ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}
                  >
                    <CharacterAvatar character={char} size="lg" />
                    {loadingExperts.includes(char) && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"
                        style={{ animationDelay: `${idx * 200}ms` }}
                      />
                    )}
                    {!loadingExperts.includes(char) && messages.some(m => m.characterType === char) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <p className="text-dark-300 text-sm font-medium mb-2">
                {stockName}에 대한 전문가 의견을 수집하고 있습니다
              </p>
              
              {/* 진행 상태 */}
              <div className="flex items-center justify-center gap-2 text-xs text-dark-500">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${loadingExperts.includes('claude') ? 'bg-blue-500 animate-pulse' : messages.some(m => m.characterType === 'claude') ? 'bg-green-500' : 'bg-dark-600'}`} />
                  Claude Lee
                </span>
                <span>→</span>
                <span className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${loadingExperts.includes('gemini') ? 'bg-purple-500 animate-pulse' : messages.some(m => m.characterType === 'gemini') ? 'bg-green-500' : 'bg-dark-600'}`} />
                  Gemi Nine
                </span>
                <span>→</span>
                <span className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${loadingExperts.includes('gpt') ? 'bg-amber-500 animate-pulse' : messages.some(m => m.characterType === 'gpt') ? 'bg-green-500' : 'bg-dark-600'}`} />
                  G.P. Taylor
                </span>
              </div>
              
              <p className="text-dark-500 text-xs mt-4">
                3명의 전문가가 순차적으로 답변합니다. 잠시만 기다려주세요.
              </p>
            </div>
          )}

          {/* 메시지 목록 */}
          {messages.map((message) => {
            if (message.type === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-2xl rounded-br-sm bg-brand-500 text-white">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs text-brand-200 mt-1">
                      {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            } else {
              const char = CHARACTERS[message.characterType!];
              return (
                <div key={message.id} className="flex gap-3">
                  <CharacterAvatar character={message.characterType!} size="md" />
                  <div className={`max-w-[85%] p-3 rounded-2xl rounded-bl-sm ${char.bgColor}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${char.color}`}>{char.name}</span>
                      <span className="text-[10px] text-dark-500">{char.role}</span>
                    </div>
                    <p className="text-sm text-dark-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <div className="text-xs text-dark-500 mt-1">
                      {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            }
          })}

          {/* 타이핑 중인 메시지 */}
          {isTyping && typingCharacter && (
            <div className="flex gap-3">
              <CharacterAvatar character={typingCharacter} size="md" />
              <div className={`max-w-[85%] p-3 rounded-2xl rounded-bl-sm ${CHARACTERS[typingCharacter].bgColor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${CHARACTERS[typingCharacter].color}`}>
                    {CHARACTERS[typingCharacter].name}
                  </span>
                </div>
                <p className="text-sm text-dark-200 whitespace-pre-wrap leading-relaxed">
                  {currentTypingMessage}
                  <span className="inline-block w-0.5 h-4 bg-dark-300 ml-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          )}

          {/* 다음 전문가 로딩 표시 */}
          {isLoading && !isTyping && loadingExperts.length > 0 && (
            <div className="flex gap-3">
              <CharacterAvatar character={loadingExperts[0]} size="md" />
              <div className={`p-3 rounded-2xl rounded-bl-sm ${CHARACTERS[loadingExperts[0]].bgColor}`}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length > 0 && !isLoading && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full bg-dark-800/50 text-xs text-dark-400 hover:bg-dark-800 hover:text-dark-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-dark-800 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isLoading ? '전문가들이 응답 중...' : '3명의 전문가에게 질문하세요...'}
              disabled={isLoading}
              rows={1}
              className={`flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:border-brand-500 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`px-4 rounded-xl font-medium transition-colors ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:opacity-90'
                  : 'bg-dark-800 text-dark-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-dark-600 mt-2 text-center">
            3명의 전문가가 순차적으로 답변합니다. 각 의견은 참고용입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
