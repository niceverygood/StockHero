'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DisclaimerBar, Header, CharacterAvatar, WatchlistButton, StockSearchModal } from '@/components';
import { CharacterDetailModal } from '@/components/CharacterDetailModal';
import { CHARACTERS, CharacterInfo } from '@/lib/characters';
import { useDebateHistory } from '@/lib/hooks';
import type { CharacterType } from '@/lib/types';

interface Message {
  id: string;
  character: CharacterType;
  round: number;
  content: string;
  score: number;
  risks: string[];
  sources: string[];
  targetPrice?: number;
  targetDate?: string;
  priceRationale?: string;
  dateRationale?: string;
  methodology?: string;
  timestamp: string;
}

// 타이핑 애니메이션 훅
function useTypingAnimation(
  text: string, 
  isActive: boolean, 
  speed: number = 15,
  onComplete?: () => void
): { displayedText: string; isTyping: boolean } {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      // 이미 완료된 메시지는 전체 텍스트 표시
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    indexRef.current = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        // 한 번에 1-2글자씩 추가 (더 천천히)
        const charsToAdd = Math.min(2, text.length - indexRef.current);
        setDisplayedText(prev => prev + text.slice(indexRef.current, indexRef.current + charsToAdd));
        indexRef.current += charsToAdd;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isActive, speed]);

  return { displayedText, isTyping };
}

interface TargetInfo {
  character: string;
  targetPrice: number;
  targetDate: string;
}

const SYMBOL_MAP: Record<string, { name: string; sector: string; price: number }> = {
  // Korean stocks
  '005930': { name: '삼성전자', sector: 'Semiconductor', price: 71500 },
  '000660': { name: 'SK하이닉스', sector: 'Semiconductor', price: 178000 },
  '373220': { name: 'LG에너지솔루션', sector: 'Battery', price: 385000 },
  '207940': { name: '삼성바이오로직스', sector: 'Bio', price: 782000 },
  '005380': { name: '현대차', sector: 'Auto', price: 242000 },
  '006400': { name: '삼성SDI', sector: 'Battery', price: 352000 },
  '035720': { name: '카카오', sector: 'IT Service', price: 42500 },
  '035420': { name: 'NAVER', sector: 'IT Service', price: 192000 },
  '051910': { name: 'LG화학', sector: 'Chemical', price: 298000 },
  '000270': { name: '기아', sector: 'Auto', price: 94800 },
  '105560': { name: 'KB금융', sector: 'Finance', price: 78500 },
  '017670': { name: 'SK텔레콤', sector: 'Telecom', price: 53200 },
  '068270': { name: '셀트리온', sector: 'Bio', price: 178500 },
  // US stocks
  'AAPL': { name: 'Apple', sector: 'Technology', price: 250 },
  'MSFT': { name: 'Microsoft', sector: 'Technology', price: 430 },
  'GOOGL': { name: 'Alphabet', sector: 'Technology', price: 195 },
  'AMZN': { name: 'Amazon', sector: 'Technology', price: 225 },
  'META': { name: 'Meta', sector: 'Technology', price: 620 },
  'NVDA': { name: 'NVIDIA', sector: 'Semiconductor', price: 140 },
  'TSLA': { name: 'Tesla', sector: 'EV/Auto', price: 440 },
  'TSM': { name: 'TSMC', sector: 'Semiconductor', price: 200 },
  'JPM': { name: 'JPMorgan Chase', sector: 'Finance', price: 240 },
  'V': { name: 'Visa', sector: 'Finance', price: 310 },
  'UNH': { name: 'UnitedHealth', sector: 'Healthcare', price: 520 },
  'AMD': { name: 'AMD', sector: 'Semiconductor', price: 125 },
};

interface RealTimeStockInfo {
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  isRealTime: boolean;
}

function ChatBubble({ 
  message, 
  currentPrice,
  onCharacterClick,
  isAnimating,
  onTypingComplete
}: { 
  message: Message; 
  currentPrice: number;
  onCharacterClick: (char: CharacterInfo) => void;
  isAnimating?: boolean;
  onTypingComplete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const char = CHARACTERS[message.character];
  
  const { displayedText, isTyping } = useTypingAnimation(
    message.content,
    isAnimating ?? false,
    25, // 타이핑 속도 (ms) - 더 천천히
    onTypingComplete
  );
  
  const upsidePercent = message.targetPrice 
    ? ((message.targetPrice - currentPrice) / currentPrice * 100).toFixed(1)
    : null;
  
  // 타이핑 중이면 애니메이션 텍스트, 아니면 전체 텍스트
  const contentToShow = isAnimating ? displayedText : message.content;
  // 타이핑 완료되었거나 애니메이션이 없을 때 추가 정보 표시
  const showAdditionalInfo = !isAnimating || !isTyping;
  
  return (
    <div className="flex items-start gap-4 animate-fade-up">
      {/* Avatar - Clickable */}
      <button
        onClick={() => onCharacterClick(char)}
        className="flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500/50 rounded-xl"
      >
        <CharacterAvatar character={message.character} size="lg" />
      </button>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => onCharacterClick(char)}
            className="font-medium text-dark-100 hover:text-white transition-colors"
          >
            {char.name}
          </button>
          <span className={`text-xs ${char.color}`}>{char.role}</span>
          <span className="text-xs text-dark-600">Round {message.round}</span>
          {isAnimating && isTyping && (
            <span className="flex items-center gap-1 text-xs text-dark-500">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              분석 중...
            </span>
          )}
        </div>

        {/* Bubble */}
        <div className={`p-4 rounded-2xl rounded-tl-sm ${char.bgColor} border border-current/10`}>
          <p className="text-dark-200 text-sm leading-relaxed whitespace-pre-wrap">
            {contentToShow}
            {isAnimating && isTyping && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-dark-300 animate-pulse" />
            )}
          </p>

          {/* Target Price Banner - 타이핑 완료 후 표시 */}
          {showAdditionalInfo && message.targetPrice && message.targetDate && (
            <div className="mt-4 p-3 rounded-xl bg-dark-900/50 border border-dark-700/50 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-dark-500 mb-1">Target Price</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${char.color}`}>
                      {message.targetPrice.toLocaleString()}원
                    </span>
                    {upsidePercent && (
                      <span className={`text-sm font-medium ${
                        parseFloat(upsidePercent) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ({parseFloat(upsidePercent) >= 0 ? '+' : ''}{upsidePercent}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-dark-500 mb-1">Target Date</div>
                  <div className="text-sm font-medium text-dark-200">{message.targetDate}</div>
                </div>
              </div>
              {/* 분석 근거 */}
              {(message.priceRationale || message.dateRationale) && (
                <div className="mt-3 pt-3 border-t border-dark-700/50 space-y-2">
                  {message.methodology && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                        📊 {message.methodology}
                      </span>
                    </div>
                  )}
                  {message.priceRationale && (
                    <div>
                      <p className="text-xs text-dark-500 mb-1">목표가 산출 근거</p>
                      <p className="text-xs text-dark-300 leading-relaxed">{message.priceRationale}</p>
                    </div>
                  )}
                  {message.dateRationale && (
                    <div>
                      <p className="text-xs text-dark-500 mb-1">목표 달성 시점 근거</p>
                      <p className="text-xs text-dark-300 leading-relaxed">{message.dateRationale}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Score - 타이핑 완료 후 표시 */}
          {showAdditionalInfo && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-800/50 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-500">Score:</span>
                <span className={`text-sm font-semibold ${char.color}`}>{message.score}/5</span>
              </div>
              {message.risks.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {expanded ? 'Hide details' : 'Show details'}
                </button>
              )}
            </div>
          )}

          {/* Expanded Details */}
          {expanded && showAdditionalInfo && (
            <div className="mt-3 pt-3 border-t border-dark-800/50 space-y-3">
              <div>
                <div className="text-xs text-dark-500 mb-1">Risks</div>
                <ul className="text-xs text-dark-400 space-y-1">
                  {message.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">!</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
              {message.sources.length > 0 && (
                <div>
                  <div className="text-xs text-dark-500 mb-1">Sources</div>
                  <div className="text-xs text-brand-400">
                    {message.sources.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-4 animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-dark-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      <div className="text-sm text-dark-500">AI is analyzing...</div>
    </div>
  );
}

function TargetSummaryCard({ targets, currentPrice }: { targets: TargetInfo[]; currentPrice: number }) {
  if (targets.length === 0) return null;
  
  const avgTarget = targets.reduce((sum, t) => sum + t.targetPrice, 0) / targets.length;
  const avgUpside = ((avgTarget - currentPrice) / currentPrice * 100).toFixed(1);
  
  return (
    <div className="card border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-transparent">
      <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Target Prices
      </h3>
      
      <div className="space-y-3 mb-4">
        {targets.map((target) => {
          const char = CHARACTERS[target.character as CharacterType];
          const upside = ((target.targetPrice - currentPrice) / currentPrice * 100).toFixed(1);
          return (
            <div key={target.character} className="flex items-center gap-3 p-2 rounded-lg bg-dark-800/50">
              <CharacterAvatar character={target.character as CharacterType} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-dark-500">{char?.name}</div>
                <div className={`text-sm font-semibold ${char?.color}`}>
                  {target.targetPrice.toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium ${
                  parseFloat(upside) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
                </span>
                <div className="text-xs text-dark-600">{target.targetDate}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-3 border-t border-dark-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-500">Consensus Target</span>
          <div className="text-right">
            <span className="text-lg font-bold text-brand-400">
              {Math.round(avgTarget).toLocaleString()}원
            </span>
            <span className={`text-sm ml-2 ${
              parseFloat(avgUpside) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              ({parseFloat(avgUpside) >= 0 ? '+' : ''}{avgUpside}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Final Consensus Summary Card - appears at the end of debate
function FinalConsensusSummary({ 
  targets, 
  currentPrice, 
  symbolName 
}: { 
  targets: TargetInfo[]; 
  currentPrice: number;
  symbolName: string;
}) {
  if (targets.length === 0) return null;
  
  const avgTarget = targets.reduce((sum, t) => sum + t.targetPrice, 0) / targets.length;
  const avgUpside = ((avgTarget - currentPrice) / currentPrice * 100).toFixed(1);
  
  // Find the most common target date or calculate average
  const sortedTargets = [...targets].sort((a, b) => a.targetPrice - b.targetPrice);
  const minTarget = sortedTargets[0];
  const maxTarget = sortedTargets[sortedTargets.length - 1];
  
  // Parse dates and find middle date
  const getMonthFromDate = (dateStr: string): number => {
    const match = dateStr.match(/(\d+)월/);
    return match ? parseInt(match[1]) : 3;
  };
  const getYearFromDate = (dateStr: string): number => {
    const match = dateStr.match(/(\d{4})년/);
    return match ? parseInt(match[1]) : new Date().getFullYear();
  };
  
  const avgMonth = Math.round(
    targets.reduce((sum, t) => sum + getMonthFromDate(t.targetDate), 0) / targets.length
  );
  const avgYear = Math.round(
    targets.reduce((sum, t) => sum + getYearFromDate(t.targetDate), 0) / targets.length
  );
  const consensusDate = `${avgYear}년 ${avgMonth}월`;
  
  return (
    <div className="animate-fade-up">
      <div className="card border-2 border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-dark-900 to-dark-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark-50">AI Consensus Summary</h3>
            <p className="text-sm text-dark-500">{symbolName} 분석 결과</p>
          </div>
        </div>
        
        {/* Main Consensus */}
        <div className="p-6 rounded-xl bg-dark-800/50 border border-dark-700/50 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-xs text-dark-500 mb-2">평균 목표가</div>
              <div className="text-3xl font-bold text-brand-400">
                {Math.round(avgTarget).toLocaleString()}원
              </div>
              <div className={`text-sm font-medium mt-1 ${
                parseFloat(avgUpside) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                현재가 대비 {parseFloat(avgUpside) >= 0 ? '+' : ''}{avgUpside}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-dark-500 mb-2">예상 달성 시점</div>
              <div className="text-3xl font-bold text-dark-100">
                {consensusDate}
              </div>
              <div className="text-sm text-dark-500 mt-1">
                AI 3인 합의 예측
              </div>
            </div>
          </div>
        </div>
        
        {/* Individual Targets */}
        <div className="mb-6">
          <div className="text-xs text-dark-500 mb-3">개별 AI 목표가</div>
          <div className="grid grid-cols-3 gap-3">
            {targets.map((target) => {
              const char = CHARACTERS[target.character as CharacterType];
              const upside = ((target.targetPrice - currentPrice) / currentPrice * 100).toFixed(1);
              return (
                <div key={target.character} className={`p-3 rounded-xl ${char?.bgColor} border border-current/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CharacterAvatar character={target.character as CharacterType} size="sm" />
                    <span className="text-xs text-dark-400">{char?.name}</span>
                  </div>
                  <div className={`text-lg font-bold ${char?.color}`}>
                    {target.targetPrice.toLocaleString()}원
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${
                      parseFloat(upside) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
                    </span>
                    <span className="text-xs text-dark-600">{target.targetDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Target Range */}
        <div className="p-4 rounded-xl bg-dark-900/50 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-dark-500">목표가 범위: </span>
              <span className="text-dark-200 font-medium">
                {minTarget.targetPrice.toLocaleString()}원 ~ {maxTarget.targetPrice.toLocaleString()}원
              </span>
            </div>
            <div className="text-dark-500">
              편차: {((maxTarget.targetPrice - minTarget.targetPrice) / avgTarget * 100).toFixed(1)}%
            </div>
          </div>
          
          {/* Visual Range Bar */}
          <div className="mt-3 relative">
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-brand-500 to-rose-500"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-dark-600">
              <span>{minTarget.targetPrice.toLocaleString()}</span>
              <span className="text-brand-400 font-medium">{Math.round(avgTarget).toLocaleString()}</span>
              <span>{maxTarget.targetPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-dark-400">
            본 분석은 AI가 생성한 의견이며 투자 권유가 아닙니다. 실제 투자는 본인의 판단과 책임하에 결정하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BattlePage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const baseSymbolInfo = SYMBOL_MAP[symbol] || { name: symbol, sector: 'Unknown', price: 70000 };
  const { recordDebateView } = useDebateHistory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]); // 화면에 표시될 메시지들
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]); // 대기 중인 메시지들
  const [currentAnimatingId, setCurrentAnimatingId] = useState<string | null>(null); // 현재 애니메이션 중인 메시지 ID
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [realTimeInfo, setRealTimeInfo] = useState<RealTimeStockInfo | null>(null);
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set()); // 이미 처리된 메시지 ID 추적
  const generatingRoundRef = useRef<number | null>(null); // 현재 생성 중인 라운드 추적

  // 실시간 주가 정보
  const symbolInfo = realTimeInfo || {
    ...baseSymbolInfo,
    change: 0,
    changePercent: 0,
    isRealTime: false,
  };

  // 실시간 주가 조회
  useEffect(() => {
    async function fetchRealTimePrice() {
      try {
        // 미국 주식인지 확인 (영문 알파벳으로만 구성된 경우)
        const isUSStock = /^[A-Za-z]+$/.test(symbol);
        const apiUrl = isUSStock 
          ? `/api/stock/us?symbol=${symbol}`
          : `/api/stock/price?symbol=${symbol}`;
        
        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (data.success && data.data) {
          // API에서 심볼 코드가 반환되면 baseSymbolInfo.name 사용
          const apiName = data.data.name;
          const isValidName = apiName && !/^\d+$/.test(apiName); // 숫자로만 이루어진 이름은 무효
          
          setRealTimeInfo({
            name: isValidName ? apiName : baseSymbolInfo.name,
            sector: baseSymbolInfo.sector || data.data.sector || 'Unknown',
            price: data.data.price,
            change: data.data.change || 0,
            changePercent: data.data.changePercent || 0,
            isRealTime: data.source === 'kis' || data.source === 'yahoo',
          });
        }
      } catch (error) {
        console.error('Failed to fetch real-time price:', error);
      }
    }
    
    fetchRealTimePrice();
    
    // 30초마다 갱신
    const interval = setInterval(fetchRealTimePrice, 30000);
    return () => clearInterval(interval);
  }, [symbol, baseSymbolInfo.name, baseSymbolInfo.sector]);

  // 다음 메시지 표시 처리
  const processNextMessage = useCallback(() => {
    setPendingMessages(prev => {
      if (prev.length === 0) {
        setCurrentAnimatingId(null);
        return prev;
      }
      
      const [nextMessage, ...remaining] = prev;
      
      // displayedMessages에 이미 있는지 확인
      setDisplayedMessages(displayed => {
        const existingIds = new Set(displayed.map(m => m.id));
        if (existingIds.has(nextMessage.id)) {
          // 이미 있으면 추가하지 않음
          return displayed;
        }
        return [...displayed, nextMessage];
      });
      setCurrentAnimatingId(nextMessage.id);
      
      return remaining;
    });
  }, []);

  // 타이핑 완료 콜백
  const handleTypingComplete = useCallback(() => {
    // 약간의 딜레이 후 다음 메시지 표시
    setTimeout(() => {
      processNextMessage();
    }, 500);
  }, [processNextMessage]);

  // 새 메시지가 추가되면 대기열에 넣기
  useEffect(() => {
    // displayedMessages에 이미 있는 ID도 제외
    const displayedIds = new Set(displayedMessages.map(m => m.id));
    const pendingIds = new Set(pendingMessages.map(m => m.id));
    
    const newMessages = messages.filter(
      msg => !processedMessageIds.current.has(msg.id) && 
             !displayedIds.has(msg.id) &&
             !pendingIds.has(msg.id)
    );
    
    if (newMessages.length > 0) {
      // 처리된 메시지로 표시
      newMessages.forEach(msg => processedMessageIds.current.add(msg.id));
      setPendingMessages(prev => {
        // 이미 대기열에 있는 메시지 제외
        const existingIds = new Set(prev.map(m => m.id));
        const trulyNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...trulyNewMessages];
      });
    }
  }, [messages, displayedMessages, pendingMessages]);

  // 대기 중인 메시지가 있고, 현재 애니메이션 중인 메시지가 없으면 다음 메시지 시작
  useEffect(() => {
    if (pendingMessages.length > 0 && currentAnimatingId === null) {
      processNextMessage();
    }
  }, [pendingMessages, currentAnimatingId, processNextMessage]);

  // 자동 스크롤 비활성화
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [displayedMessages, currentAnimatingId]);

  function handleCharacterClick(char: CharacterInfo) {
    setSelectedCharacter(char);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

  async function startDebate() {
    // 이미 로딩 중이면 중복 호출 방지
    if (isLoading || sessionId) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/debate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setRound(1);
        await generateRound(data.data.sessionId, 1);
      }
    } catch (error) {
      console.error('Failed to start debate:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateRound(sid: string, r: number) {
    // 이미 같은 라운드를 생성 중이면 중복 호출 방지
    if (generatingRoundRef.current === r) {
      console.log(`Round ${r} is already being generated, skipping duplicate call`);
      return;
    }
    
    generatingRoundRef.current = r;
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/debate/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sid, 
          round: r,
          symbol,
          symbolName: symbolInfo.name,
          currentPrice: symbolInfo.price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newMessages = data.data.messages.map((m: {
          character: CharacterType;
          content: string;
          score: number;
          risks: string[];
          sources: string[];
          targetPrice?: number;
          targetDate?: string;
          priceRationale?: string;
          dateRationale?: string;
          methodology?: string;
        }, i: number) => ({
          id: `${sid}-${r}-${m.character}-${i}`, // 더 고유한 ID 생성
          character: m.character,
          round: r,
          content: m.content,
          score: m.score,
          risks: m.risks,
          sources: m.sources,
          targetPrice: m.targetPrice,
          targetDate: m.targetDate,
          priceRationale: m.priceRationale,
          dateRationale: m.dateRationale,
          methodology: m.methodology,
          timestamp: new Date().toISOString(),
        }));
        
        // 중복 메시지 필터링
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = newMessages.filter((m: Message) => !existingIds.has(m.id));
          return [...prev, ...uniqueNewMessages];
        });
        setRound(r);
        
        // Update targets
        if (data.data.targets) {
          setTargets(data.data.targets);
        }
        
        // Record debate view in history
        recordDebateView(symbol, symbolInfo.name, sid, r, 4);
        
        if (r >= 4) {
          setIsComplete(true);
        }
      }
    } catch (error) {
      console.error('Failed to generate round:', error);
    } finally {
      setIsLoading(false);
      generatingRoundRef.current = null;
    }
  }

  function handleNextRound() {
    if (!sessionId || isLoading || isComplete || generatingRoundRef.current !== null) return;
    generateRound(sessionId, round + 1);
  }

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Chat Area */}
            <div className="lg:col-span-3">
              {/* Stock Header */}
              <div className="card mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 종목 검색 버튼 */}
                    <button
                      onClick={() => setIsStockSearchOpen(true)}
                      className="w-12 h-12 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-brand-500/50 flex items-center justify-center transition-all group"
                      title="종목 검색"
                    >
                      <svg className="w-5 h-5 text-dark-400 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-dark-50">{symbolInfo.name}</h1>
                        <button
                          onClick={() => setIsStockSearchOpen(true)}
                          className="px-2 py-1 text-xs text-dark-500 hover:text-brand-400 hover:bg-dark-800 rounded transition-colors"
                        >
                          변경
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-dark-500 font-mono">{symbol}</span>
                        <span className="text-dark-600">|</span>
                        <span className="text-dark-500">{symbolInfo.sector}</span>
                        <span className="text-dark-600">|</span>
                        <span className="text-brand-400 font-semibold">{symbolInfo.price.toLocaleString()}원</span>
                        {symbolInfo.change !== 0 && (
                          <span className={`font-medium ${symbolInfo.change > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {symbolInfo.change > 0 ? '▲' : '▼'} {Math.abs(symbolInfo.changePercent).toFixed(2)}%
                          </span>
                        )}
                        {symbolInfo.isRealTime && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            실시간
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Watchlist Button */}
                    <WatchlistButton
                      symbolCode={symbol}
                      symbolName={symbolInfo.name}
                      size="md"
                      showLabel
                    />
                    {round > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="badge-brand">Round {round}/4</span>
                        {isComplete && <span className="badge-success">Complete</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-6 mb-8">
                {displayedMessages.length === 0 && !isLoading && pendingMessages.length === 0 && (
                  <div className="card text-center py-16">
                    <div className="flex justify-center gap-4 mb-6">
                      {(['claude', 'gemini', 'gpt'] as const).map((charId) => (
                        <button
                          key={charId}
                          onClick={() => handleCharacterClick(CHARACTERS[charId])}
                          className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500/50 rounded-2xl"
                        >
                          <CharacterAvatar character={charId} size="xl" />
                        </button>
                      ))}
                    </div>
                    <h3 className="text-lg font-semibold text-dark-200 mb-2">Ready to Start</h3>
                    <p className="text-dark-500 mb-6 max-w-sm mx-auto">
                      AI 3대장이 이 종목에 대해 토론할 준비가 되었습니다
                    </p>
                    <button onClick={startDebate} disabled={isLoading} className="btn-primary px-8">
                      Start Debate
                    </button>
                  </div>
                )}

                {displayedMessages.map((msg, index) => {
                  // Check if this is the last message of the current round
                  const isLastMessageOfRound = 
                    index === displayedMessages.length - 1 || 
                    displayedMessages[index + 1]?.round !== msg.round;
                  
                  // 모든 애니메이션이 완료되었는지 확인
                  const allAnimationsComplete = currentAnimatingId === null && pendingMessages.length === 0;
                  
                  // Check if we should show the "next debate" button
                  const showNextButton = 
                    isLastMessageOfRound && 
                    !isLoading && 
                    !isComplete && 
                    msg.round === round &&
                    allAnimationsComplete;
                  
                  // 현재 메시지가 애니메이션 중인지 확인
                  const isThisMessageAnimating = currentAnimatingId === msg.id;
                  
                  return (
                    <div key={msg.id}>
                      <ChatBubble 
                        message={msg} 
                        currentPrice={symbolInfo.price}
                        onCharacterClick={handleCharacterClick}
                        isAnimating={isThisMessageAnimating}
                        onTypingComplete={isThisMessageAnimating ? handleTypingComplete : undefined}
                      />
                      
                      {/* 다음 토론 엿보기 버튼 */}
                      {showNextButton && (
                        <div className="mt-8 animate-fade-up">
                          <div className="relative">
                            {/* Divider line */}
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-dark-700/50"></div>
                            </div>
                            
                            {/* Button container */}
                            <div className="relative flex flex-col items-center gap-3">
                              <button
                                onClick={handleNextRound}
                                disabled={isLoading}
                                className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 rounded-full transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 disabled:opacity-50 disabled:shadow-none"
                              >
                                <div className="flex -space-x-2">
                                  {(['claude', 'gemini', 'gpt'] as const).map((charId) => (
                                    <div 
                                      key={charId}
                                      className={`w-6 h-6 rounded-full border-2 border-brand-600 ${CHARACTERS[charId].bgColor} flex items-center justify-center`}
                                    >
                                      <span className="text-[8px]">
                                        {CHARACTERS[charId].name.charAt(0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <span className="text-sm font-semibold text-white">
                                  다음 토론 엿보기
                                </span>
                                <svg 
                                  className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform duration-200" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Engaging CTA message */}
                          <div className="mt-5 text-center px-4">
                            <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl animate-pulse-subtle relative overflow-hidden">
                              {/* 배경 반짝이 효과 */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-text-shimmer" />
                              
                              <span className="text-2xl animate-bounce-slow relative z-10">🎯</span>
                              <div className="text-center sm:text-left relative z-10">
                                <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
                                  <span className="font-medium">마지막 토론까지 확인하면</span>
                                  <br className="sm:hidden" />
                                  <span className="text-amber-400 font-bold animate-glow"> 3명의 전문가가 합의한</span>
                                </p>
                                <p className="text-sm sm:text-base flex flex-wrap items-center justify-center sm:justify-start gap-1">
                                  <span 
                                    className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent animate-text-shimmer bg-[length:200%_auto]"
                                  >
                                    최종 목표가
                                  </span>
                                  <span className="text-amber-100/90 font-medium">와</span>
                                  <span 
                                    className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent animate-text-shimmer bg-[length:200%_auto]"
                                    style={{ animationDelay: '0.5s' }}
                                  >
                                    달성 예상일
                                  </span>
                                  <span className="text-amber-100/90 font-medium">확인!</span>
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map((r) => (
                                  <div 
                                    key={r} 
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                      r <= round 
                                        ? 'bg-brand-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]' 
                                        : 'bg-dark-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-dark-400">
                                Round {round}/4 • {4 - round}개 남음
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 로딩 중이거나 대기 중인 메시지가 있을 때 표시 */}
                {(isLoading || (pendingMessages.length > 0 && currentAnimatingId === null)) && <TypingIndicator />}
                
                {/* Final Consensus Summary - shown when debate is complete and all animations are done */}
                {isComplete && targets.length > 0 && currentAnimatingId === null && pendingMessages.length === 0 && (
                  <FinalConsensusSummary 
                    targets={targets} 
                    currentPrice={symbolInfo.price}
                    symbolName={symbolInfo.name}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Target Prices Summary - Only shown after debate is complete */}
              {isComplete && targets.length > 0 && currentAnimatingId === null && pendingMessages.length === 0 && (
                <TargetSummaryCard targets={targets} currentPrice={symbolInfo.price} />
              )}

              {/* Participants */}
              <div className="card">
                <h3 className="font-semibold text-dark-100 mb-4">Participants</h3>
                <div className="space-y-3">
                  {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                    const char = CHARACTERS[charId];
                    const charMsgs = displayedMessages.filter((m) => m.character === charId);
                    const avgScore = charMsgs.length > 0
                      ? (charMsgs.reduce((sum, m) => sum + m.score, 0) / charMsgs.length).toFixed(1)
                      : '-';
                    const latestTarget = charMsgs.filter(m => m.targetPrice).slice(-1)[0];
                    // 토론 완료 후에만 목표가 표시
                    const showTargetPrice = isComplete && currentAnimatingId === null && pendingMessages.length === 0;
                    return (
                      <button
                        key={charId}
                        onClick={() => handleCharacterClick(char)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-all group cursor-pointer"
                      >
                        <CharacterAvatar character={charId} size="md" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-dark-200 group-hover:text-dark-100 truncate transition-colors">
                            {char.name}
                          </div>
                          <div className="text-xs text-dark-500">{char.role}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${char.color}`}>{avgScore}</div>
                          {showTargetPrice && latestTarget?.targetPrice && (
                            <div className="text-xs text-dark-500">
                              {latestTarget.targetPrice.toLocaleString()}원
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* AI 상담 링크 */}
                <div className="mt-4 pt-4 border-t border-dark-700/50">
                  <Link
                    href="/consulting"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500/20 to-brand-600/20 border border-brand-500/30 text-brand-400 text-sm font-medium hover:from-brand-500/30 hover:to-brand-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    AI 전문가에게 상담받기
                  </Link>
                </div>
              </div>

              {/* Click hint */}
              <div className="card border-brand-500/20 bg-brand-500/5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-brand-400 text-sm mb-1">Tip</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">
                      캐릭터를 클릭하면 상세 정보를 볼 수 있습니다
                    </p>
                  </div>
                </div>
              </div>

              <div className="card border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">Observe Mode</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">
                      You are watching the AI debate. No intervention possible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Character Detail Modal */}
      <CharacterDetailModal
        character={selectedCharacter}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Stock Search Modal */}
      <StockSearchModal
        isOpen={isStockSearchOpen}
        onClose={() => setIsStockSearchOpen(false)}
        currentSymbol={symbol}
      />
    </>
  );
}
