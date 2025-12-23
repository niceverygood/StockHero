'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DisclaimerBar, Header, CharacterAvatar, StockSearchModal } from '@/components';
import { CHARACTERS } from '@/lib/characters';

// 인기 종목 리스트
const POPULAR_STOCKS = [
  { symbol: '005930', name: '삼성전자', sector: '반도체' },
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체' },
  { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
  { symbol: '005380', name: '현대차', sector: '자동차' },
  { symbol: '035420', name: 'NAVER', sector: 'IT서비스' },
  { symbol: '035720', name: '카카오', sector: 'IT서비스' },
  { symbol: '247540', name: '에코프로비엠', sector: '2차전지' },
  { symbol: '012450', name: '한화에어로스페이스', sector: '방산' },
];

// 미국 인기 종목
const POPULAR_US_STOCKS = [
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductor' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'EV' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon', sector: 'E-Commerce' },
];

export default function BattleLandingPage() {
  const router = useRouter();
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'kr' | 'us'>('kr');

  const handleStockSelect = (stock: { symbol: string; name: string; sector: string }) => {
    router.push(`/battle/${stock.symbol}`);
  };

  const popularStocks = selectedTab === 'kr' ? POPULAR_STOCKS : POPULAR_US_STOCKS;

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center gap-4 mb-6">
              {(['claude', 'gemini', 'gpt'] as const).map((charId) => (
                <div key={charId} className="relative">
                  <CharacterAvatar character={charId} size="lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    VS
                  </div>
                </div>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              AI 토론 관전하기
            </h1>
            <p className="text-dark-400 text-lg max-w-xl mx-auto">
              AI 3대장이 당신이 선택한 종목에 대해 치열한 토론을 벌입니다.
              <br />각자의 관점에서 분석하고, 목표가를 제시합니다.
            </p>
          </div>

          {/* Stock Selection */}
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">종목 선택</h2>
              <button
                onClick={() => setIsStockSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                종목 검색
              </button>
            </div>

            {/* Tab Selection */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSelectedTab('kr')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTab === 'kr'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-white'
                }`}
              >
                🇰🇷 한국 주식
              </button>
              <button
                onClick={() => setSelectedTab('us')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTab === 'us'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-white'
                }`}
              >
                🇺🇸 미국 주식
              </button>
            </div>

            {/* Popular Stocks Grid */}
            <div className="mb-4">
              <p className="text-sm text-dark-500 mb-3">인기 종목</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {popularStocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleStockSelect(stock)}
                    className="p-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-brand-500/50 rounded-xl transition-all text-left group"
                  >
                    <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                      {stock.name}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">
                      {stock.symbol} · {stock.sector}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-6">토론 진행 방식</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">1️⃣</span>
                </div>
                <h3 className="font-semibold text-white mb-2">종목 선택</h3>
                <p className="text-sm text-dark-400">
                  분석하고 싶은 종목을 검색하거나 인기 종목에서 선택하세요
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">2️⃣</span>
                </div>
                <h3 className="font-semibold text-white mb-2">AI 토론 관전</h3>
                <p className="text-sm text-dark-400">
                  3명의 AI 전문가가 서로 다른 관점에서 종목을 분석하고 토론합니다
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">3️⃣</span>
                </div>
                <h3 className="font-semibold text-white mb-2">목표가 확인</h3>
                <p className="text-sm text-dark-400">
                  각 AI의 목표가와 분석 근거를 확인하고 투자 판단에 참고하세요
                </p>
              </div>
            </div>
          </div>

          {/* AI Participants */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4 text-center">참여 AI 전문가</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                const char = CHARACTERS[charId];
                return (
                  <div
                    key={charId}
                    className={`card ${char.bgColor}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <CharacterAvatar character={charId} size="md" />
                      <div>
                        <div className={`font-semibold ${char.color}`}>{char.name}</div>
                        <div className="text-xs text-dark-500">{char.roleKo}</div>
                      </div>
                    </div>
                    <p className="text-sm text-dark-400 italic">&ldquo;{char.catchphrase}&rdquo;</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Stock Search Modal */}
      <StockSearchModal
        isOpen={isStockSearchOpen}
        onClose={() => setIsStockSearchOpen(false)}
        onSelect={handleStockSelect}
      />
    </>
  );
}

