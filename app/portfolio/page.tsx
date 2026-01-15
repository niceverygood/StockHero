'use client';

import { useState } from 'react';
import { Header } from '@/components';
import { CHARACTERS } from '@/lib/characters';

const AI_EMOJIS: Record<string, string> = {
  claude: '🔵',
  gemini: '🟣',
  gpt: '🟡',
};

interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
}

interface AIAdvice {
  symbol: string;
  name: string;
  action: 'hold' | 'increase' | 'decrease' | 'sell';
  reason: string;
  claudeOpinion?: string;
  geminiOpinion?: string;
  gptOpinion?: string;
}

interface AnalysisResult {
  overallAssessment: string;
  riskLevel: 'low' | 'medium' | 'high';
  diversificationScore: number;
  advice: AIAdvice[];
  summary: string;
}

// 한국 주요 종목 목록
const POPULAR_STOCKS = [
  { symbol: '005930', name: '삼성전자' },
  { symbol: '000660', name: 'SK하이닉스' },
  { symbol: '373220', name: 'LG에너지솔루션' },
  { symbol: '207940', name: '삼성바이오로직스' },
  { symbol: '005380', name: '현대차' },
  { symbol: '035720', name: '카카오' },
  { symbol: '035420', name: 'NAVER' },
  { symbol: '006400', name: '삼성SDI' },
  { symbol: '068270', name: '셀트리온' },
  { symbol: '105560', name: 'KB금융' },
  { symbol: '055550', name: '신한지주' },
  { symbol: '086790', name: '하나금융지주' },
  { symbol: '000270', name: '기아' },
  { symbol: '051910', name: 'LG화학' },
  { symbol: '003670', name: '포스코홀딩스' },
];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const addToPortfolio = () => {
    if (!selectedStock || !quantity) return;
    
    const stock = POPULAR_STOCKS.find(s => s.symbol === selectedStock);
    if (!stock) return;

    // 이미 있는 종목인지 확인
    if (portfolio.some(p => p.symbol === selectedStock)) {
      alert('이미 포트폴리오에 있는 종목입니다');
      return;
    }

    setPortfolio([...portfolio, {
      symbol: stock.symbol,
      name: stock.name,
      quantity: parseInt(quantity),
      avgPrice: avgPrice ? parseInt(avgPrice) : 0,
    }]);

    setSelectedStock('');
    setQuantity('');
    setAvgPrice('');
  };

  const removeFromPortfolio = (symbol: string) => {
    setPortfolio(portfolio.filter(p => p.symbol !== symbol));
  };

  const analyzePortfolio = async () => {
    if (portfolio.length === 0) {
      alert('포트폴리오에 종목을 추가해주세요');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio }),
      });
      
      const data = await res.json();
      if (data.success) {
        setResult(data.analysis);
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'hold': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'increase': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'decrease': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'sell': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-dark-700 text-dark-300';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'hold': return '유지';
      case 'increase': return '비중 확대';
      case 'decrease': return '비중 축소';
      case 'sell': return '매도 권고';
      default: return action;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-dark-400';
    }
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="fixed bottom-1/4 left-0 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[100px]" />

        <div className="relative container-app">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="text-dark-100">AI</span>{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">포트폴리오 분석</span>
            </h1>
            <p className="text-dark-400">
              내 포트폴리오를 입력하면 3개 AI가 분석해드립니다
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
            {/* Portfolio Input */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
                📝 내 포트폴리오
              </h2>

              {/* Add Stock Form */}
              <div className="space-y-3 mb-6">
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">종목 선택</option>
                  {POPULAR_STOCKS.map(stock => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.name} ({stock.symbol})
                    </option>
                  ))}
                </select>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="수량"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="number"
                    placeholder="평균 매입가 (선택)"
                    value={avgPrice}
                    onChange={(e) => setAvgPrice(e.target.value)}
                    className="px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  onClick={addToPortfolio}
                  disabled={!selectedStock || !quantity}
                  className="w-full py-3 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + 추가하기
                </button>
              </div>

              {/* Portfolio List */}
              <div className="space-y-2 mb-6">
                {portfolio.length === 0 ? (
                  <div className="text-center py-8 text-dark-500">
                    <p>종목을 추가해주세요</p>
                  </div>
                ) : (
                  portfolio.map(item => (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-dark-100">{item.name}</p>
                        <p className="text-xs text-dark-500">
                          {item.quantity}주 {item.avgPrice > 0 && `· 평균 ${item.avgPrice.toLocaleString()}원`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromPortfolio(item.symbol)}
                        className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Analyze Button */}
              <button
                onClick={analyzePortfolio}
                disabled={portfolio.length === 0 || analyzing}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    🔍 AI 분석 시작
                  </>
                )}
              </button>
            </div>

            {/* Analysis Result */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
                🤖 AI 분석 결과
              </h2>

              {analyzing ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex justify-center gap-2 mb-4">
                      {(['claude', 'gemini', 'gpt'] as const).map((charId, i) => {
                        const char = CHARACTERS[charId];
                        return (
                          <div
                            key={charId}
                            className={`w-10 h-10 rounded-lg ${char.bgColor} flex items-center justify-center animate-bounce`}
                            style={{ animationDelay: `${i * 0.15}s` }}
                          >
                            <span className="text-xl">{AI_EMOJIS[charId]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-dark-400">AI들이 분석 중입니다...</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Overview */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-dark-800/50 rounded-xl">
                      <p className="text-xs text-dark-500 mb-1">리스크 수준</p>
                      <p className={`text-lg font-bold ${getRiskColor(result.riskLevel)}`}>
                        {result.riskLevel === 'low' ? '낮음' : result.riskLevel === 'medium' ? '보통' : '높음'}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-800/50 rounded-xl">
                      <p className="text-xs text-dark-500 mb-1">분산투자 점수</p>
                      <p className="text-lg font-bold text-dark-100">{result.diversificationScore}/10</p>
                    </div>
                  </div>

                  {/* Advice per Stock */}
                  <div className="space-y-2">
                    {result.advice.map((item) => (
                      <div key={item.symbol} className="p-3 bg-dark-800/30 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-dark-100">{item.name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getActionStyle(item.action)}`}>
                            {getActionLabel(item.action)}
                          </span>
                        </div>
                        <p className="text-sm text-dark-400">{item.reason}</p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                    <p className="text-sm font-medium text-dark-100 mb-1">💡 종합 의견</p>
                    <p className="text-sm text-dark-300">{result.summary}</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl mb-4">📊</p>
                    <p className="text-dark-400">포트폴리오를 입력하고</p>
                    <p className="text-dark-400">분석을 시작해보세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
