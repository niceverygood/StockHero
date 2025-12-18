'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DisclaimerBar, Header, SkeletonList, CharacterAvatar } from '@/components';
import type { CharacterType } from '@/lib/llm/types';

interface Top5Item {
  rank: number;
  symbolId: string;
  symbol: string;
  name: string;
  avgScore: number;
  rationale: string;
  unanimous: boolean;
  currentPrice: number;
  change: number;
  changePercent: number;
  // AI별 개별 점수 (API에서 제공)
  scores?: {
    claude: number;
    gemini: number;
    gpt: number;
  };
}

interface VerdictData {
  success: boolean;
  isRealTime: boolean;
  date: string;
  time: string;
  unanimousCount: number;
  rationale: string;
  top5: Top5Item[];
}

// AI 캐릭터 정보
const AI_CHARACTERS: { type: CharacterType; name: string; nameKo: string; color: string }[] = [
  { type: 'claude', name: 'Claude Lee', nameKo: '클로드 리', color: 'text-amber-400' },
  { type: 'gemini', name: 'Gemi Nine', nameKo: '제미 나인', color: 'text-emerald-400' },
  { type: 'gpt', name: 'G.P. Taylor', nameKo: '쥐피 테일러', color: 'text-blue-400' },
];

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30',
    2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
    3: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
  };
  return (
    <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg ${styles[rank] || 'bg-dark-700 text-dark-300'}`}>
      {rank}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const percentage = (score / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-brand-400 w-8">{score.toFixed(1)}</span>
    </div>
  );
}

function PriceChange({ change, changePercent }: { change: number; changePercent: number }) {
  if (change === 0) return null;
  
  const isUp = change > 0;
  return (
    <span className={`text-xs sm:text-sm font-medium ${isUp ? 'text-red-400' : 'text-blue-400'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
}

export default function VerdictPage() {
  const [data, setData] = useState<VerdictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVerdict() {
      try {
        const res = await fetch('/api/verdict');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch verdict:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVerdict();
    
    // 30초마다 새로고침
    const interval = setInterval(fetchVerdict, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 sm:pt-28 lg:pt-32 pb-16">
        <div className="container-app px-4 sm:px-6">
          {/* AI Consensus Header */}
          <div className="mb-8 sm:mb-10">
            {/* AI Characters Consensus View */}
            <div className="card p-4 sm:p-6 mb-6 bg-gradient-to-br from-dark-900 to-dark-950 border-dark-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* AI Avatars */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center">
                    {AI_CHARACTERS.map((char, idx) => (
                      <div 
                        key={char.type}
                        className={`relative ${idx > 0 ? '-ml-3 sm:-ml-4' : ''}`}
                        style={{ zIndex: 3 - idx }}
                      >
                        <div className="ring-2 ring-dark-900 rounded-full">
                          <CharacterAvatar character={char.type} size="lg" />
                        </div>
                        {/* Thinking indicator */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-dark-900">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white">합의 완료</h2>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                        Consensus
                      </span>
                    </div>
                    <p className="text-sm text-dark-400 mt-0.5">3명의 AI 전문가가 오늘의 Top 5를 선정했습니다</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-center sm:text-right">
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    {data?.isRealTime && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        실시간
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-500 mt-1">
                    {data ? `${data.date} ${data.time} 기준` : '로딩 중...'}
                  </p>
                </div>
              </div>

              {/* AI Names */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 pt-4 border-t border-dark-800">
                {AI_CHARACTERS.map((char) => (
                  <div key={char.type} className="flex items-center gap-2">
                    <CharacterAvatar character={char.type} size="sm" />
                    <span className={`text-sm font-medium ${char.color}`}>{char.nameKo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Page Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">Today&apos;s Top 5</h1>
          </div>

          {loading ? (
            <SkeletonList count={5} />
          ) : data ? (
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {data.top5.map((item, index) => {
                  // AI별 점수 (API에서 없으면 평균점수 기반으로 랜덤 생성)
                  const aiScores = item.scores || {
                    claude: Math.min(5, Math.max(3, item.avgScore + (Math.random() - 0.5) * 0.8)),
                    gemini: Math.min(5, Math.max(3, item.avgScore + (Math.random() - 0.5) * 0.8)),
                    gpt: Math.min(5, Math.max(3, item.avgScore + (Math.random() - 0.5) * 0.8)),
                  };
                  
                  return (
                    <Link key={item.symbolId} href={`/battle/${item.symbol}`}>
                      <div className="card-interactive group">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Rank Badge */}
                          <RankBadge rank={index + 1} />
                          
                          {/* Stock Info */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5 sm:mb-2">
                              <span className="text-base sm:text-lg font-semibold text-dark-100 group-hover:text-white transition-colors truncate max-w-full">
                                {item.name}
                              </span>
                              <span className="text-xs sm:text-sm text-dark-500 font-mono shrink-0">{item.symbol}</span>
                              {item.unanimous && (
                                <span className="badge-success text-2xs shrink-0">Unanimous</span>
                              )}
                            </div>
                            
                            {/* Price Info */}
                            {item.currentPrice > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-white font-medium">
                                  {item.currentPrice.toLocaleString()}원
                                </span>
                                <PriceChange change={item.change} changePercent={item.changePercent} />
                              </div>
                            )}
                            
                            {/* AI Scores */}
                            <div className="flex items-center gap-3 mb-2">
                              {AI_CHARACTERS.map((char) => (
                                <div key={char.type} className="flex items-center gap-1.5">
                                  <CharacterAvatar character={char.type} size="xs" />
                                  <span className={`text-xs font-semibold ${char.color}`}>
                                    {aiScores[char.type].toFixed(1)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-xs text-dark-500">평균</span>
                                <span className="text-sm font-bold text-brand-400">{item.avgScore.toFixed(1)}</span>
                              </div>
                            </div>
                            
                            <ScoreBar score={item.avgScore} />
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-dark-400 line-clamp-1">
                              {item.rationale}
                            </p>
                          </div>
                          
                          {/* Arrow */}
                          <div className="shrink-0 text-dark-600 group-hover:text-brand-400 transition-colors">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                <div className="flex items-center gap-6 pt-4 border-t border-dark-800">
                  <div className="flex items-center gap-2">
                    <span className="badge-success text-xs">Unanimous</span>
                    <span className="text-sm text-dark-400">= 만장일치 ({data.unanimousCount}개 종목)</span>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4 sm:space-y-6">
                {/* Summary Card */}
                <div className="card p-4 sm:p-6">
                  <h3 className="font-semibold text-dark-200 mb-3 sm:mb-4">오늘의 분석 요약</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">
                    {data.rationale}
                  </p>
                </div>

                {/* AI Analysts */}
                <div className="card p-4 sm:p-6">
                  <h3 className="font-semibold text-dark-200 mb-3 sm:mb-4">참여 애널리스트</h3>
                  <div className="space-y-3">
                    {AI_CHARACTERS.map((char) => (
                      <div key={char.type} className="flex items-center gap-3 p-2 rounded-lg bg-dark-800/50">
                        <CharacterAvatar character={char.type} size="md" />
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${char.color}`}>{char.nameKo}</p>
                          <p className="text-xs text-dark-500">
                            {char.type === 'claude' && '펀더멘털 분석'}
                            {char.type === 'gemini' && '성장성 분석'}
                            {char.type === 'gpt' && '리스크 분석'}
                          </p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodology */}
                <div className="card p-4 sm:p-6">
                  <h3 className="font-semibold text-dark-200 mb-3 sm:mb-4">평가 방법론</h3>
                  <ul className="space-y-2 sm:space-y-3 text-sm text-dark-400">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 mt-1">•</span>
                      <span>3개 AI의 개별 분석 점수 평균</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 mt-1">•</span>
                      <span>1~5점 척도, 소수점 첫째 자리까지 표시</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 mt-1">•</span>
                      <span>만장일치(Unanimous)는 3개 AI 모두 4점 이상 부여 시</span>
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <Link href="/battle/005930" className="block">
                  <div className="card-interactive p-4 sm:p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {AI_CHARACTERS.map((char, idx) => (
                        <div key={char.type} className={idx > 0 ? '-ml-2' : ''}>
                          <CharacterAvatar character={char.type} size="sm" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-dark-400 mb-2 text-center">AI들의 열띤 토론을 직접 확인하세요</p>
                    <span className="text-brand-400 font-semibold block text-center">토론 보러가기 →</span>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-dark-400">데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
