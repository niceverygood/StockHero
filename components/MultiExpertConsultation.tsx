'use client';

import { useState, useRef, useEffect } from 'react';
import { CharacterAvatar } from './CharacterAvatar';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/llm/types';

interface ExpertResponse {
  characterType: CharacterType;
  content: string;
  isLoading: boolean;
  error?: string;
}

interface MultiExpertConsultationProps {
  isOpen: boolean;
  onClose: () => void;
  stockSymbol?: string;
  stockName?: string;
}

const SUGGESTED_QUESTIONS = [
  '이 종목의 투자 매력도는 어떤가요?',
  '지금 매수해도 괜찮을까요?',
  '장기 투자 관점에서 어떻게 보시나요?',
  '주요 리스크는 무엇인가요?',
];

export function MultiExpertConsultation({ 
  isOpen, 
  onClose, 
  stockSymbol, 
  stockName 
}: MultiExpertConsultationProps) {
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState<ExpertResponse[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setResponses([]);
      setIsSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setIsSubmitted(true);
    
    // Initialize all responses as loading
    const initialResponses: ExpertResponse[] = (['claude', 'gemini', 'gpt'] as CharacterType[]).map(char => ({
      characterType: char,
      content: '',
      isLoading: true,
    }));
    setResponses(initialResponses);

    // Fetch all responses in parallel
    const characters: CharacterType[] = ['claude', 'gemini', 'gpt'];
    
    await Promise.all(
      characters.map(async (characterType) => {
        try {
          const response = await fetch('/api/consultation/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterType,
              message: stockName 
                ? `[${stockName}(${stockSymbol}) 관련 질문]\n\n${question.trim()}`
                : question.trim(),
              conversationHistory: [],
            }),
          });

          const data = await response.json();

          setResponses(prev => prev.map(r => 
            r.characterType === characterType 
              ? { ...r, content: data.response || '응답을 받지 못했습니다.', isLoading: false }
              : r
          ));
        } catch (error) {
          setResponses(prev => prev.map(r => 
            r.characterType === characterType 
              ? { ...r, content: '', isLoading: false, error: '응답 실패' }
              : r
          ));
        }
      })
    );
  };

  const handleQuestionClick = (q: string) => {
    const fullQuestion = stockName ? `${stockName} ${q}` : q;
    setQuestion(fullQuestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-dark-700">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {(['claude', 'gemini', 'gpt'] as CharacterType[]).map((char) => (
                  <div key={char} className="ring-2 ring-dark-800 rounded-full">
                    <CharacterAvatar character={char} size="sm" />
                  </div>
                ))}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">3명의 전문가 상담</h2>
                {stockName && (
                  <p className="text-xs text-dark-400">{stockName} ({stockSymbol})</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!isSubmitted ? (
            /* Question Input View */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  무엇이 궁금하신가요?
                </label>
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={stockName ? `${stockName}에 대해 물어보세요...` : '투자에 대해 물어보세요...'}
                  className="w-full h-28 p-3 bg-dark-900 border border-dark-600 rounded-xl text-white placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </div>

              {/* Suggested Questions */}
              <div>
                <p className="text-xs text-dark-500 mb-2">추천 질문</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuestionClick(q)}
                      className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white text-xs rounded-full transition-colors"
                    >
                      {stockName ? `${stockName} ${q}` : q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expert Cards Preview */}
              <div className="mt-6">
                <p className="text-sm text-dark-400 mb-3">3명의 전문가가 각자의 관점에서 답변합니다</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['claude', 'gemini', 'gpt'] as CharacterType[]).map((charType) => {
                    const char = CHARACTERS[charType];
                    return (
                      <div 
                        key={charType}
                        className={`p-4 rounded-xl ${char.bgColor} border border-dark-700/50`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CharacterAvatar character={charType} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-white">{char.name}</p>
                            <p className="text-[10px] text-dark-400">{char.title}</p>
                          </div>
                        </div>
                        <p className="text-xs text-dark-400 line-clamp-2">
                          {charType === 'claude' && '숫자와 데이터 중심의 냉철한 분석'}
                          {charType === 'gemini' && '미래 성장성과 혁신 가능성 중심'}
                          {charType === 'gpt' && '리스크 관리와 안정성 중심'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!question.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                3명의 전문가에게 질문하기
              </button>
            </div>
          ) : (
            /* Response View */
            <div className="space-y-4">
              {/* User Question */}
              <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl">
                <p className="text-xs text-brand-400 mb-1">내 질문</p>
                <p className="text-white">{question}</p>
              </div>

              {/* Expert Responses */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {responses.map((response) => {
                  const char = CHARACTERS[response.characterType];
                  return (
                    <div 
                      key={response.characterType}
                      className={`p-4 rounded-xl ${char.bgColor} border border-dark-700/50`}
                    >
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-dark-700/50">
                        <CharacterAvatar character={response.characterType} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-white">{char.name}</p>
                          <p className="text-[10px] text-dark-400">{char.title}</p>
                        </div>
                      </div>
                      
                      {response.isLoading ? (
                        <div className="space-y-2">
                          <div className="h-3 bg-dark-700 rounded animate-pulse w-full" />
                          <div className="h-3 bg-dark-700 rounded animate-pulse w-4/5" />
                          <div className="h-3 bg-dark-700 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-dark-700 rounded animate-pulse w-5/6" />
                        </div>
                      ) : response.error ? (
                        <p className="text-red-400 text-sm">{response.error}</p>
                      ) : (
                        <div className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {response.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* New Question Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setResponses([]);
                    setQuestion('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  새 질문하기
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-dark-600 hover:bg-dark-700 text-dark-300 hover:text-white rounded-xl transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

