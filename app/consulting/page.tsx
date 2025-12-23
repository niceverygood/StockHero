'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DisclaimerBar, Header, CharacterAvatar, AIConsultationModal, MultiExpertConsultation, StockSearchModal, AIPortfolioSimulator, useToast } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/types';
import { getInvestorTypeInfo, INVESTOR_TYPES } from '@/lib/investment-style/results';
import type { InvestorType, InvestorTypeInfo } from '@/lib/investment-style/types';
import Link from 'next/link';

interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  isRealTime: boolean;
}

function ConsultingPageContent() {
  const searchParams = useSearchParams();
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [consultCharacter, setConsultCharacter] = useState<CharacterType | null>(null);
  const [isMultiConsultOpen, setIsMultiConsultOpen] = useState(false);
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [investorTypeInfo, setInvestorTypeInfo] = useState<InvestorTypeInfo | null>(null);
  const { showToast } = useToast();

  // URL에서 투자 성향 정보 가져오기
  useEffect(() => {
    const typeParam = searchParams.get('investorType');
    if (typeParam && INVESTOR_TYPES[typeParam as InvestorType]) {
      setInvestorTypeInfo(getInvestorTypeInfo(typeParam as InvestorType));
    }
  }, [searchParams]);

  // 상담 버튼 클릭 핸들러
  const handleConsultClick = (charId: CharacterType) => {
    if (!selectedStock) {
      showToast('상담받을 종목을 먼저 선택해주세요', 'warning');
      setIsStockSearchOpen(true);
      return;
    }
    setConsultCharacter(charId);
  };

  // 멀티 상담 버튼 클릭 핸들러
  const handleMultiConsultClick = () => {
    if (!selectedStock) {
      showToast('상담받을 종목을 먼저 선택해주세요', 'warning');
      setIsStockSearchOpen(true);
      return;
    }
    setIsMultiConsultOpen(true);
  };

  // 종목 선택 시 실시간 시세 조회
  const handleSelectStock = async (symbol: string, name: string, sector: string) => {
    setIsLoadingPrice(true);
    try {
      const res = await fetch(`/api/stock/price?symbol=${symbol}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setSelectedStock({
          symbol,
          name,
          sector,
          price: data.data.price || 0,
          change: data.data.change || 0,
          changePercent: data.data.changePercent || 0,
          isRealTime: data.source === 'kis',
        });
      } else {
        setSelectedStock({
          symbol,
          name,
          sector,
          price: 0,
          change: 0,
          changePercent: 0,
          isRealTime: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
      setSelectedStock({
        symbol,
        name,
        sector,
        price: 0,
        change: 0,
        changePercent: 0,
        isRealTime: false,
      });
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // 종목 검색 모달에서 선택
  const handleStockSearchSelect = (stock: { symbol: string; name: string; sector: string }) => {
    handleSelectStock(stock.symbol, stock.name, stock.sector);
    setIsStockSearchOpen(false);
  };

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app">
          {/* Investor Type Badge */}
          {investorTypeInfo && (
            <div className="mb-8">
              <div className={`card p-6 bg-gradient-to-r ${investorTypeInfo.gradient} bg-opacity-10 border-none relative overflow-hidden`}>
                <div className="absolute inset-0 bg-dark-950/85" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{investorTypeInfo.emoji}</span>
                      <div>
                        <p className="text-dark-400 text-sm mb-1">나의 투자 성향</p>
                        <h2 className={`text-2xl font-bold ${investorTypeInfo.color}`}>
                          {investorTypeInfo.name}
                        </h2>
                        <p className="text-dark-500 text-sm">{investorTypeInfo.type}</p>
                      </div>
                    </div>
                    <div className="flex-1 md:text-right">
                      <p className="text-dark-300 text-sm mb-2">
                        {investorTypeInfo.title}
                      </p>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {investorTypeInfo.recommendedSectors.slice(0, 3).map((sector, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded-lg bg-gradient-to-r ${investorTypeInfo.gradient} bg-opacity-20 text-dark-200 text-xs`}
                          >
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-dark-700/50">
                    <p className="text-dark-400 text-sm">
                      💡 <span className={investorTypeInfo.color}>AI 전문가들이 {investorTypeInfo.name} 성향에 맞춰 맞춤형 투자 조언</span>을 드립니다.
                      종목을 선택하면 당신의 투자 성향을 고려한 분석을 받을 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="text-center mb-12">
            {selectedStock ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-4">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  상담 종목 선택됨
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-dark-50 mb-3">
                  <span className="text-brand-400">{selectedStock.name}</span>
                  <span className="text-dark-500 text-2xl md:text-3xl ml-3 font-mono">{selectedStock.symbol}</span>
                </h1>
                {selectedStock.price > 0 && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-dark-100">
                      {selectedStock.price.toLocaleString()}원
                    </span>
                    {selectedStock.change !== 0 && (
                      <span className={`text-lg font-semibold ${selectedStock.change > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {selectedStock.change > 0 ? '▲' : '▼'} {Math.abs(selectedStock.changePercent).toFixed(2)}%
                      </span>
                    )}
                    {selectedStock.isRealTime && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        실시간
                      </span>
                    )}
                  </div>
                )}
                <p className="text-dark-400 max-w-2xl mx-auto">
                  {investorTypeInfo 
                    ? `${investorTypeInfo.name} 성향에 맞춰 이 종목에 대한 맞춤형 투자 조언을 받아보세요.`
                    : '이 종목에 대해 3명의 AI 전문가에게 심층 분석과 투자 조언을 받아보세요.'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
                  {investorTypeInfo 
                    ? `${investorTypeInfo.emoji} ${investorTypeInfo.name} 맞춤 상담`
                    : 'AI Expert Consulting'}
                </h1>
                <p className="text-dark-400 max-w-2xl mx-auto">
                  {investorTypeInfo 
                    ? `${investorTypeInfo.name} 성향에 맞춘 종목 분석과 투자 조언을 받아보세요.`
                    : '3명의 AI 전문가에게 관심 종목에 대한 심층 분석과 투자 조언을 받아보세요.'}
                  <br />
                  {investorTypeInfo 
                    ? `추천 섹터: ${investorTypeInfo.recommendedSectors.slice(0, 4).join(', ')}`
                    : '각 전문가의 고유한 투자 철학에 따른 다양한 관점을 확인할 수 있습니다.'}
                </p>
                {!investorTypeInfo && (
                  <Link
                    href="/investment-style"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm transition-colors"
                  >
                    <span>🧬</span>
                    <span>투자 성향 분석하고 맞춤 상담받기</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Stock Selection - Full Width Top */}
          <div className="mb-8">
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  
                  {selectedStock ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-dark-100 text-lg">{selectedStock.name}</h3>
                        <span className="text-dark-500 font-mono text-sm">{selectedStock.symbol}</span>
                        <span className="px-2 py-0.5 rounded-full bg-dark-800 text-dark-400 text-xs">{selectedStock.sector}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {isLoadingPrice ? (
                          <div className="flex items-center gap-2 text-dark-500 text-sm">
                            <div className="w-3 h-3 border-2 border-dark-500 border-t-brand-500 rounded-full animate-spin" />
                            시세 조회 중...
                          </div>
                        ) : selectedStock.price > 0 ? (
                          <>
                            <span className="text-lg font-bold text-brand-400">
                              {selectedStock.price.toLocaleString()}원
                            </span>
                            {selectedStock.change !== 0 && (
                              <span className={`text-sm font-medium ${selectedStock.change > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                {selectedStock.change > 0 ? '▲' : '▼'} {Math.abs(selectedStock.changePercent).toFixed(2)}%
                              </span>
                            )}
                            {selectedStock.isRealTime && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                실시간
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-dark-500 text-sm">시세 정보 없음</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <h3 className="font-semibold text-dark-100">상담 받을 종목</h3>
                      <p className="text-dark-500 text-sm">종목을 선택하면 AI 전문가 상담이 가능합니다</p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setIsStockSearchOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-medium text-sm transition-colors flex items-center gap-2 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {selectedStock ? '종목 변경' : '종목 검색'}
                </button>
              </div>
            </div>
          </div>

          {/* AI Experts - Full Width */}
          <div className="max-w-4xl mx-auto">
            <div className="card">
                <h3 className="font-semibold text-dark-100 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  AI 전문가
                </h3>

                {/* Expert Cards */}
                <div className="space-y-4 mb-6">
                  {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                    const char = CHARACTERS[charId];
                    return (
                      <div
                        key={charId}
                        className={`p-4 rounded-xl ${char.bgColor} border border-current/10 transition-all`}
                      >
                        <div className="flex items-start gap-4">
                          <CharacterAvatar character={charId} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${char.color}`}>{char.name}</h4>
                              <span className="text-xs text-dark-500">{char.role}</span>
                            </div>
                            <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                              {char.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {char.focusAreas.slice(0, 3).map((area, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full bg-dark-800/50 text-xs text-dark-400"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleConsultClick(charId)}
                            className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                              selectedStock
                                ? `${char.bgColor} hover:opacity-80 ${char.color} border border-current/20`
                                : 'bg-dark-800/50 text-dark-500 hover:bg-dark-800 hover:text-dark-400'
                            }`}
                          >
                            상담하기
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multi Expert Button */}
                <div className="pt-4 border-t border-dark-700/50">
                  <button
                    onClick={handleMultiConsultClick}
                    className={`w-full py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ${
                      selectedStock
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white shadow-lg shadow-brand-500/20'
                        : 'bg-dark-800/50 text-dark-500 hover:bg-dark-800 hover:text-dark-400'
                    }`}
                  >
                    <div className="flex -space-x-2">
                      {(['claude', 'gemini', 'gpt'] as const).map((charId) => (
                        <div
                          key={charId}
                          className={`w-8 h-8 rounded-full border-2 ${selectedStock ? 'border-brand-600' : 'border-dark-700'} ${CHARACTERS[charId].bgColor} flex items-center justify-center`}
                        >
                          <CharacterAvatar character={charId} size="sm" />
                        </div>
                      ))}
                    </div>
                    <span className="text-lg">3명의 전문가 모두에게 상담받기</span>
                  </button>
                  
                  {!selectedStock && (
                    <p className="text-center text-sm text-dark-500 mt-3">
                      👆 종목을 선택하면 상담이 가능합니다
                    </p>
                  )}
                </div>
              </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="card border-brand-500/20 bg-brand-500/5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-brand-400 text-sm mb-1">개인 맞춤 상담</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">
                      각 전문가에게 자유롭게 질문하고 투자 조언을 받을 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">투자 참고용</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">
                      AI 분석은 참고용이며, 실제 투자는 본인 판단에 따라 결정하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Portfolio Builder Section */}
            <div className="mt-12">
              <AIPortfolioSimulator />
            </div>
          </div>
        </div>
      </main>

      {/* AI Consultation Modal */}
      {consultCharacter && selectedStock && (
        <AIConsultationModal
          isOpen={consultCharacter !== null}
          onClose={() => setConsultCharacter(null)}
          characterType={consultCharacter}
          showDebateButton={true}
          stockData={{
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            currentPrice: selectedStock.price,
            change: selectedStock.change,
            changePercent: selectedStock.changePercent,
          }}
        />
      )}

      {/* Multi Expert Consultation Modal */}
      {selectedStock && (
        <MultiExpertConsultation
          isOpen={isMultiConsultOpen}
          onClose={() => setIsMultiConsultOpen(false)}
          stockSymbol={selectedStock.symbol}
          stockName={selectedStock.name}
          stockData={{
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            currentPrice: selectedStock.price,
            change: selectedStock.change,
            changePercent: selectedStock.changePercent,
          }}
          investorType={investorTypeInfo?.type}
          investorTypeName={investorTypeInfo?.name}
        />
      )}

      {/* Stock Search Modal */}
      <StockSearchModal
        isOpen={isStockSearchOpen}
        onClose={() => setIsStockSearchOpen(false)}
        onSelect={handleStockSearchSelect}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-28 pb-16">
        <div className="container-app">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        </div>
      </main>
    </>
  );
}

export default function ConsultingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConsultingPageContent />
    </Suspense>
  );
}
