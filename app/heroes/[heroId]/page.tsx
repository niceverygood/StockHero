'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { DisclaimerBar, Header } from '@/components';

// 히어로 메타 데이터
const HERO_META = {
  claude: {
    name: 'Claude Lee',
    nameKo: '클로드 리',
    title: '숫자의 검사',
    subtitle: 'Balanced Analyst',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    tagline: '숫자는 거짓말하지 않습니다',
    description: '펀더멘털 분석 기반의 저평가 우량주',
  },
  gemini: {
    name: 'Gemi Nine',
    nameKo: '제미 나인',
    title: '파괴적 혁신가',
    subtitle: 'Future Trend Strategist',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    tagline: '역사는 미친 놈들이 만들어요',
    description: '미래 성장 잠재력 극대화 종목',
  },
  gpt: {
    name: 'G.P. Taylor',
    nameKo: 'G.P. 테일러',
    title: '월가의 노장',
    subtitle: 'Chief Macro & Risk Officer',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    tagline: '살아남아야 다음이 있습니다',
    description: '리스크 최소화 방어주',
  },
};

interface Stock {
  rank: number;
  symbol: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  score: number;
  reason: string;
  metrics: Record<string, number | string>;
  risks: string[];
}

interface HeroData {
  hero: {
    id: string;
    name: string;
    nameKo: string;
    title: string;
    criteria: string;
    methodology: string;
  };
  date: string;
  stocks: Stock[];
}

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = params.heroId as string;
  
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStock, setExpandedStock] = useState<number | null>(null);
  
  const meta = HERO_META[heroId as keyof typeof HERO_META];
  
  useEffect(() => {
    if (!meta) {
      router.push('/heroes');
      return;
    }
    
    async function fetchData() {
      try {
        const res = await fetch(`/api/heroes/${heroId}/top5`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch hero data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [heroId, meta, router]);
  
  if (!meta) return null;
  
  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 sm:pt-28 lg:pt-32 pb-20">
        <div className="container-app">
        {/* Back Button */}
        <Link
          href="/heroes"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Stock Heros로 돌아가기
        </Link>
        
        {/* Hero Header */}
        <div className={`glass ${meta.borderColor} border-2 rounded-2xl lg:rounded-3xl p-6 sm:p-8 mb-8`}>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br ${meta.color} p-1 shrink-0`}>
              <div className="w-full h-full rounded-2xl bg-dark-900 flex items-center justify-center overflow-hidden">
                <CharacterAvatar character={heroId as 'claude' | 'gemini' | 'gpt'} size="lg" />
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{meta.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.bgColor} ${meta.textColor}`}>
                  {meta.title}
                </span>
              </div>
              <p className="text-dark-400 mb-4">{meta.subtitle}</p>
              
              <div className={`${meta.bgColor} rounded-xl p-4 inline-block`}>
                <p className={`text-lg sm:text-xl font-bold ${meta.textColor}`}>
                  "{meta.tagline}"
                </p>
              </div>
            </div>
          </div>
          
          {/* Methodology */}
          {data && (
            <div className="mt-6 pt-6 border-t border-dark-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">추천 기준</p>
                  <p className="text-dark-200">{data.hero.criteria}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">분석 방법론</p>
                  <p className="text-dark-200">{data.hero.methodology}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Top 5 Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {meta.nameKo}의 Top 5
            </h2>
            {data && (
              <span className="text-sm text-dark-400">{data.date} 기준</span>
            )}
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-dark-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-dark-700 rounded w-1/4 mb-2" />
                    <div className="h-4 bg-dark-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Stock List */}
        {data && (
          <div className="space-y-4">
            {data.stocks.map((stock, idx) => (
              <div
                key={stock.symbol}
                className={`glass ${meta.borderColor} border rounded-xl overflow-hidden transition-all ${
                  expandedStock === idx ? 'ring-2 ring-offset-2 ring-offset-dark-950' : ''
                }`}
                style={{
                  // @ts-ignore
                  '--tw-ring-color': meta.textColor.includes('blue') ? 'rgb(96 165 250)' : 
                                     meta.textColor.includes('purple') ? 'rgb(192 132 252)' : 
                                     'rgb(251 191 36)',
                }}
              >
                {/* Main Row */}
                <button
                  className="w-full p-4 sm:p-6 flex items-center gap-4 text-left hover:bg-dark-800/30 transition-colors"
                  onClick={() => setExpandedStock(expandedStock === idx ? null : idx)}
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0`}>
                    <span className="text-white font-bold text-lg sm:text-xl">{stock.rank}</span>
                  </div>
                  
                  {/* Stock Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">{stock.name}</h3>
                      <span className="text-xs text-dark-500">{stock.symbol}</span>
                    </div>
                    <p className="text-sm text-dark-400 truncate">{stock.reason.substring(0, 50)}...</p>
                  </div>
                  
                  {/* Price & Score */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-lg font-bold text-white">{stock.currentPrice.toLocaleString()}원</p>
                    <p className={`text-sm ${meta.textColor}`}>
                      목표 {stock.targetPrice.toLocaleString()}원
                      <span className="text-green-400 ml-2">
                        (+{Math.round((stock.targetPrice - stock.currentPrice) / stock.currentPrice * 100)}%)
                      </span>
                    </p>
                  </div>
                  
                  {/* Score Badge */}
                  <div className={`${meta.bgColor} px-3 py-2 rounded-lg shrink-0`}>
                    <p className={`text-xl font-bold ${meta.textColor}`}>{stock.score}</p>
                    <p className="text-xs text-dark-400">점수</p>
                  </div>
                  
                  {/* Expand Icon */}
                  <svg
                    className={`w-5 h-5 text-dark-400 transition-transform ${expandedStock === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Expanded Content */}
                {expandedStock === idx && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-dark-700/50">
                    {/* Mobile Price */}
                    <div className="sm:hidden py-4 border-b border-dark-700/50 mb-4">
                      <p className="text-lg font-bold text-white">{stock.currentPrice.toLocaleString()}원</p>
                      <p className={`text-sm ${meta.textColor}`}>
                        목표 {stock.targetPrice.toLocaleString()}원
                        <span className="text-green-400 ml-2">
                          (+{Math.round((stock.targetPrice - stock.currentPrice) / stock.currentPrice * 100)}%)
                        </span>
                      </p>
                    </div>
                    
                    {/* Reason */}
                    <div className="mb-4">
                      <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">추천 이유</p>
                      <p className="text-dark-200">{stock.reason}</p>
                    </div>
                    
                    {/* Metrics */}
                    <div className="mb-4">
                      <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">핵심 지표</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stock.metrics).map(([key, value]) => (
                          <span
                            key={key}
                            className={`${meta.bgColor} px-3 py-1.5 rounded-lg text-sm`}
                          >
                            <span className="text-dark-400">{key}: </span>
                            <span className={meta.textColor}>{value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Risks */}
                    <div className="mb-4">
                      <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">유의 사항</p>
                      <div className="flex flex-wrap gap-2">
                        {stock.risks.map((risk, i) => (
                          <span
                            key={i}
                            className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg text-sm"
                          >
                            ⚠️ {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-dark-700/50">
                      <Link
                        href={`/battle/${stock.symbol}`}
                        className={`flex-1 py-3 rounded-xl font-medium text-center bg-gradient-to-r ${meta.color} text-white hover:opacity-90 transition-all`}
                      >
                        AI 토론 보기
                      </Link>
                      <button
                        className="px-4 py-3 rounded-xl font-medium bg-dark-800 text-dark-300 hover:bg-dark-700 transition-all"
                      >
                        관심 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Disclaimer */}
        <div className="mt-8 p-4 rounded-xl bg-dark-800/50 text-center">
          <p className="text-xs text-dark-500">
            ⚠️ 본 추천은 AI의 분석에 기반하며, 투자의 최종 결정은 투자자 본인의 판단에 따라야 합니다.
            과거의 성과가 미래의 수익을 보장하지 않습니다.
          </p>
        </div>
        
        {/* Other Heroes */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-white mb-4">다른 분석가의 추천도 확인해보세요</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(HERO_META)
              .filter(([id]) => id !== heroId)
              .map(([id, otherMeta]) => (
                <Link
                  key={id}
                  href={`/heroes/${id}`}
                  className={`glass ${otherMeta.borderColor} border rounded-xl p-4 hover:bg-dark-800/30 transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${otherMeta.color} p-0.5`}>
                      <div className="w-full h-full rounded-xl bg-dark-900 flex items-center justify-center">
                        <CharacterAvatar character={id as 'claude' | 'gemini' | 'gpt'} size="sm" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-white">{otherMeta.name}</p>
                      <p className="text-sm text-dark-400">{otherMeta.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}

