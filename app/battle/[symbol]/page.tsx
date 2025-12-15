'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DisclaimerBar, Header, AdSlot, CharacterAvatar } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/types';

interface Message {
  id: string;
  character: CharacterType;
  round: number;
  content: string;
  score: number;
  risks: string[];
  sources: string[];
  timestamp: string;
}

const SYMBOL_MAP: Record<string, { name: string; sector: string }> = {
  '005930': { name: '삼성전자', sector: 'Semiconductor' },
  '000660': { name: 'SK하이닉스', sector: 'Semiconductor' },
  '373220': { name: 'LG에너지솔루션', sector: 'Battery' },
};

function ChatBubble({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);
  const char = CHARACTERS[message.character];
  
  return (
    <div className="flex items-start gap-4 animate-fade-up">
      {/* Avatar */}
      <CharacterAvatar character={message.character} size="lg" />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="font-medium text-dark-100">{char.name}</span>
          <span className={`text-xs ${char.color}`}>{char.role}</span>
          <span className="text-xs text-dark-600">Round {message.round}</span>
        </div>

        {/* Bubble */}
        <div className={`p-4 rounded-2xl rounded-tl-sm ${char.bgColor} border border-current/10`}>
          <p className="text-dark-200 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Score */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-800/50">
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

          {/* Expanded Details */}
          {expanded && (
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

export default function BattlePage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const symbolInfo = SYMBOL_MAP[symbol] || { name: symbol, sector: 'Unknown' };

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startDebate() {
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
    setIsLoading(true);
    try {
      const res = await fetch('/api/debate/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, round: r }),
      });
      const data = await res.json();
      if (data.success) {
        const newMessages = data.data.messages.map((m: { character: CharacterType; content: string; score: number; risks: string[]; sources: string[] }, i: number) => ({
          id: `${r}-${i}`,
          character: m.character,
          round: r,
          content: m.content,
          score: m.score,
          risks: m.risks,
          sources: m.sources,
          timestamp: new Date().toISOString(),
        }));
        setMessages((prev) => [...prev, ...newMessages]);
        setRound(r);
        if (r >= 4) {
          setIsComplete(true);
        }
      }
    } catch (error) {
      console.error('Failed to generate round:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNextRound() {
    if (!sessionId || isLoading || isComplete) return;
    generateRound(sessionId, round + 1);
  }

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-32">
        <div className="container-app">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Chat Area */}
            <div className="lg:col-span-3">
              {/* Stock Header */}
              <div className="card mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center text-xl font-bold text-dark-300">
                      {symbolInfo.name.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-dark-50">{symbolInfo.name}</h1>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-dark-500 font-mono">{symbol}</span>
                        <span className="text-dark-600">|</span>
                        <span className="text-dark-500">{symbolInfo.sector}</span>
                      </div>
                    </div>
                  </div>
                  {round > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge-brand">Round {round}/4</span>
                      {isComplete && <span className="badge-success">Complete</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-6 mb-8">
                {messages.length === 0 && !isLoading && (
                  <div className="card text-center py-16">
                    <div className="flex justify-center gap-4 mb-6">
                      {(['claude', 'gemini', 'gpt'] as const).map((charId) => (
                        <CharacterAvatar key={charId} character={charId} size="xl" />
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

                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}

                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <div className="card">
                <h3 className="font-semibold text-dark-100 mb-4">Participants</h3>
                <div className="space-y-3">
                  {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                    const char = CHARACTERS[charId];
                    const charMsgs = messages.filter((m) => m.character === charId);
                    const avgScore = charMsgs.length > 0
                      ? (charMsgs.reduce((sum, m) => sum + m.score, 0) / charMsgs.length).toFixed(1)
                      : '-';
                    return (
                      <div key={charId} className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
                        <CharacterAvatar character={charId} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-200 truncate">{char.name}</div>
                          <div className="text-xs text-dark-500">{char.role}</div>
                        </div>
                        <div className={`text-sm font-semibold ${char.color}`}>{avgScore}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <AdSlot variant="sidebar" />

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

        {/* Bottom Action Bar */}
        {messages.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-dark-950/90 backdrop-blur-xl border-t border-dark-800">
            <div className="container-app py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-dark-500">
                  {isComplete ? 'Debate Complete' : `Round ${round} of 4`}
                </span>
                {isComplete && (
                  <Link href="/verdict" className="text-sm text-brand-400 hover:text-brand-300">
                    View Today's Top 5
                  </Link>
                )}
              </div>
              {!isComplete && (
                <button
                  onClick={handleNextRound}
                  disabled={isLoading || isComplete}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Generating...' : 'Next Round'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
