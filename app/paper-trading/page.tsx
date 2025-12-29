'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header, DisclaimerBar, CharacterAvatar } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/types';

interface Stock {
  code: string;
  name: string;
  sector: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  aiScores: {
    claude: number;
    gemini: number;
    gpt: number;
    avg: number;
  };
  targetPrice: number;
}

interface Position {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  profitPercent: number;
}

interface Trade {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
  total: number;
}

interface Portfolio {
  cash: number;
  totalValue: number;
  positions: Position[];
  initialCapital: number;
  totalProfit: number;
  totalProfitPercent: number;
}

// Mock stock data with real-time simulation
const MOCK_STOCKS: Stock[] = [
  { code: '005930', name: '삼성전자', sector: '반도체', currentPrice: 71500, previousPrice: 71500, change: 0, changePercent: 0, aiScores: { claude: 4.0, gemini: 4.5, gpt: 3.5, avg: 4.0 }, targetPrice: 85000 },
  { code: '000660', name: 'SK하이닉스', sector: '반도체', currentPrice: 178000, previousPrice: 178000, change: 0, changePercent: 0, aiScores: { claude: 4.2, gemini: 4.8, gpt: 3.8, avg: 4.3 }, targetPrice: 210000 },
  { code: '373220', name: 'LG에너지솔루션', sector: '2차전지', currentPrice: 385000, previousPrice: 385000, change: 0, changePercent: 0, aiScores: { claude: 3.8, gemini: 4.2, gpt: 3.5, avg: 3.8 }, targetPrice: 450000 },
  { code: '207940', name: '삼성바이오로직스', sector: '바이오', currentPrice: 782000, previousPrice: 782000, change: 0, changePercent: 0, aiScores: { claude: 3.5, gemini: 4.0, gpt: 3.2, avg: 3.6 }, targetPrice: 850000 },
  { code: '005380', name: '현대차', sector: '자동차', currentPrice: 242000, previousPrice: 242000, change: 0, changePercent: 0, aiScores: { claude: 4.0, gemini: 3.8, gpt: 4.2, avg: 4.0 }, targetPrice: 280000 },
  { code: '035720', name: '카카오', sector: 'IT서비스', currentPrice: 42500, previousPrice: 42500, change: 0, changePercent: 0, aiScores: { claude: 3.2, gemini: 3.5, gpt: 3.0, avg: 3.2 }, targetPrice: 50000 },
  { code: '035420', name: 'NAVER', sector: 'IT서비스', currentPrice: 192000, previousPrice: 192000, change: 0, changePercent: 0, aiScores: { claude: 3.8, gemini: 4.0, gpt: 3.5, avg: 3.8 }, targetPrice: 230000 },
  { code: '068270', name: '셀트리온', sector: '바이오', currentPrice: 178500, previousPrice: 178500, change: 0, changePercent: 0, aiScores: { claude: 3.5, gemini: 3.8, gpt: 3.2, avg: 3.5 }, targetPrice: 200000 },
  { code: '105560', name: 'KB금융', sector: '금융', currentPrice: 82500, previousPrice: 82500, change: 0, changePercent: 0, aiScores: { claude: 4.2, gemini: 3.5, gpt: 4.5, avg: 4.1 }, targetPrice: 95000 },
  { code: '055550', name: '신한지주', sector: '금융', currentPrice: 52800, previousPrice: 52800, change: 0, changePercent: 0, aiScores: { claude: 4.0, gemini: 3.2, gpt: 4.3, avg: 3.8 }, targetPrice: 62000 },
];

const INITIAL_CAPITAL = 100000000; // 1억원

function formatKRW(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}억`;
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function PaperTradingPage() {
  const [stocks, setStocks] = useState<Stock[]>(MOCK_STOCKS);
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: INITIAL_CAPITAL,
    totalValue: INITIAL_CAPITAL,
    positions: [],
    initialCapital: INITIAL_CAPITAL,
    totalProfit: 0,
    totalProfitPercent: 0,
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'history'>('market');
  const [marketTime, setMarketTime] = useState<Date>(new Date());
  const [isMarketOpen, setIsMarketOpen] = useState(true);

  // Simulate real-time price changes
  const updatePrices = useCallback(() => {
    setStocks(prevStocks => {
      return prevStocks.map(stock => {
        // Random price movement (-2% to +2%)
        const changePercent = (Math.random() - 0.5) * 4;
        const priceChange = Math.round(stock.currentPrice * changePercent / 100);
        const newPrice = Math.max(100, stock.currentPrice + priceChange);
        
        return {
          ...stock,
          previousPrice: stock.currentPrice,
          currentPrice: newPrice,
          change: newPrice - stock.previousPrice,
          changePercent: ((newPrice - stock.previousPrice) / stock.previousPrice) * 100,
        };
      });
    });
    setMarketTime(new Date());
  }, []);

  // Update prices every 3 seconds
  useEffect(() => {
    if (!isMarketOpen) return;
    
    const interval = setInterval(updatePrices, 3000);
    return () => clearInterval(interval);
  }, [updatePrices, isMarketOpen]);

  // Update portfolio values when prices change
  useEffect(() => {
    setPortfolio(prev => {
      const updatedPositions = prev.positions.map(pos => {
        const stock = stocks.find(s => s.code === pos.stockCode);
        const currentPrice = stock?.currentPrice || pos.currentPrice;
        const totalValue = currentPrice * pos.quantity;
        const profit = totalValue - (pos.avgPrice * pos.quantity);
        const profitPercent = (profit / (pos.avgPrice * pos.quantity)) * 100;
        
        return {
          ...pos,
          currentPrice,
          totalValue,
          profit,
          profitPercent,
        };
      });
      
      const positionsValue = updatedPositions.reduce((sum, pos) => sum + pos.totalValue, 0);
      const totalValue = prev.cash + positionsValue;
      const totalProfit = totalValue - prev.initialCapital;
      const totalProfitPercent = (totalProfit / prev.initialCapital) * 100;
      
      return {
        ...prev,
        positions: updatedPositions,
        totalValue,
        totalProfit,
        totalProfitPercent,
      };
    });
  }, [stocks]);

  function handleBuy(stock: Stock, quantity: number) {
    const totalCost = stock.currentPrice * quantity;
    
    if (totalCost > portfolio.cash) {
      alert('잔액이 부족합니다.');
      return;
    }

    const trade: Trade = {
      id: `trade-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'BUY',
      stockCode: stock.code,
      stockName: stock.name,
      quantity,
      price: stock.currentPrice,
      total: totalCost,
    };

    setTrades(prev => [trade, ...prev]);

    setPortfolio(prev => {
      const existingPosition = prev.positions.find(p => p.stockCode === stock.code);
      
      let newPositions: Position[];
      if (existingPosition) {
        const newQuantity = existingPosition.quantity + quantity;
        const newAvgPrice = ((existingPosition.avgPrice * existingPosition.quantity) + totalCost) / newQuantity;
        
        newPositions = prev.positions.map(p => 
          p.stockCode === stock.code
            ? {
                ...p,
                quantity: newQuantity,
                avgPrice: newAvgPrice,
                totalValue: stock.currentPrice * newQuantity,
                profit: (stock.currentPrice - newAvgPrice) * newQuantity,
                profitPercent: ((stock.currentPrice - newAvgPrice) / newAvgPrice) * 100,
              }
            : p
        );
      } else {
        newPositions = [...prev.positions, {
          stockCode: stock.code,
          stockName: stock.name,
          quantity,
          avgPrice: stock.currentPrice,
          currentPrice: stock.currentPrice,
          totalValue: totalCost,
          profit: 0,
          profitPercent: 0,
        }];
      }

      const positionsValue = newPositions.reduce((sum, pos) => sum + pos.totalValue, 0);
      const newCash = prev.cash - totalCost;
      const totalValue = newCash + positionsValue;
      
      return {
        ...prev,
        cash: newCash,
        positions: newPositions,
        totalValue,
        totalProfit: totalValue - prev.initialCapital,
        totalProfitPercent: ((totalValue - prev.initialCapital) / prev.initialCapital) * 100,
      };
    });

    setSelectedStock(null);
    setTradeQuantity(1);
  }

  function handleSell(stock: Stock, quantity: number) {
    const position = portfolio.positions.find(p => p.stockCode === stock.code);
    
    if (!position || position.quantity < quantity) {
      alert('보유 수량이 부족합니다.');
      return;
    }

    const totalValue = stock.currentPrice * quantity;

    const trade: Trade = {
      id: `trade-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SELL',
      stockCode: stock.code,
      stockName: stock.name,
      quantity,
      price: stock.currentPrice,
      total: totalValue,
    };

    setTrades(prev => [trade, ...prev]);

    setPortfolio(prev => {
      let newPositions: Position[];
      const newQuantity = position.quantity - quantity;
      
      if (newQuantity === 0) {
        newPositions = prev.positions.filter(p => p.stockCode !== stock.code);
      } else {
        newPositions = prev.positions.map(p =>
          p.stockCode === stock.code
            ? {
                ...p,
                quantity: newQuantity,
                totalValue: stock.currentPrice * newQuantity,
                profit: (stock.currentPrice - p.avgPrice) * newQuantity,
                profitPercent: ((stock.currentPrice - p.avgPrice) / p.avgPrice) * 100,
              }
            : p
        );
      }

      const positionsValue = newPositions.reduce((sum, pos) => sum + pos.totalValue, 0);
      const newCash = prev.cash + totalValue;
      const newTotalValue = newCash + positionsValue;
      
      return {
        ...prev,
        cash: newCash,
        positions: newPositions,
        totalValue: newTotalValue,
        totalProfit: newTotalValue - prev.initialCapital,
        totalProfitPercent: ((newTotalValue - prev.initialCapital) / prev.initialCapital) * 100,
      };
    });

    setSelectedStock(null);
    setTradeQuantity(1);
  }

  function getMaxBuyQuantity(price: number): number {
    return Math.floor(portfolio.cash / price);
  }

  function getHoldingQuantity(stockCode: string): number {
    return portfolio.positions.find(p => p.stockCode === stockCode)?.quantity || 0;
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <DisclaimerBar />
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container-app">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-dark-50 mb-2">
                  Paper Trading
                </h1>
                <p className="text-dark-400">
                  AI 추천을 참고하여 가상 자금으로 모의투자를 해보세요
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm text-dark-400">
                    {isMarketOpen ? '시장 운영중' : '시장 마감'}
                  </span>
                </div>
                <div className="text-xs text-dark-500 font-mono">
                  {marketTime.toLocaleTimeString('ko-KR')}
                </div>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card">
                <div className="text-xs text-dark-500 mb-1">총 자산</div>
                <div className="text-xl font-bold text-dark-100">
                  {formatKRW(portfolio.totalValue)}원
                </div>
              </div>
              <div className="card">
                <div className="text-xs text-dark-500 mb-1">보유 현금</div>
                <div className="text-xl font-bold text-dark-100">
                  {formatKRW(portfolio.cash)}원
                </div>
              </div>
              <div className="card">
                <div className="text-xs text-dark-500 mb-1">총 손익</div>
                <div className={`text-xl font-bold ${portfolio.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.totalProfit >= 0 ? '+' : ''}{formatKRW(portfolio.totalProfit)}원
                </div>
              </div>
              <div className="card">
                <div className="text-xs text-dark-500 mb-1">수익률</div>
                <div className={`text-xl font-bold ${portfolio.totalProfitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.totalProfitPercent >= 0 ? '+' : ''}{portfolio.totalProfitPercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['market', 'portfolio', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800/50 text-dark-400 hover:bg-dark-800'
                }`}
              >
                {tab === 'market' && '시장'}
                {tab === 'portfolio' && `보유종목 (${portfolio.positions.length})`}
                {tab === 'history' && `거래내역 (${trades.length})`}
              </button>
            ))}
            <button
              onClick={() => setIsMarketOpen(!isMarketOpen)}
              className={`ml-auto px-4 py-2 rounded-lg text-sm ${
                isMarketOpen 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isMarketOpen ? '시뮬레이션 중지' : '시뮬레이션 시작'}
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {activeTab === 'market' && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-dark-100 mb-4">종목 리스트</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-dark-500 border-b border-dark-800">
                          <th className="text-left py-3 px-2">종목</th>
                          <th className="text-right py-3 px-2">현재가</th>
                          <th className="text-right py-3 px-2">등락</th>
                          <th className="text-center py-3 px-2">AI 점수</th>
                          <th className="text-right py-3 px-2">목표가</th>
                          <th className="text-right py-3 px-2">보유</th>
                          <th className="text-center py-3 px-2">주문</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stocks.map(stock => {
                          const holding = getHoldingQuantity(stock.code);
                          return (
                            <tr 
                              key={stock.code}
                              className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                            >
                              <td className="py-3 px-2">
                                <div className="font-medium text-dark-200">{stock.name}</div>
                                <div className="text-xs text-dark-500">{stock.code} | {stock.sector}</div>
                              </td>
                              <td className="text-right py-3 px-2">
                                <div className="font-mono font-medium text-dark-100">
                                  {formatNumber(stock.currentPrice)}원
                                </div>
                              </td>
                              <td className="text-right py-3 px-2">
                                <div className={`font-mono text-sm ${
                                  stock.change > 0 ? 'text-emerald-400' : 
                                  stock.change < 0 ? 'text-red-400' : 'text-dark-400'
                                }`}>
                                  {stock.change > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </div>
                              </td>
                              <td className="text-center py-3 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  {(['claude', 'gemini', 'gpt'] as const).map(ai => (
                                    <div
                                      key={ai}
                                      className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${CHARACTERS[ai].bgColor} ${CHARACTERS[ai].color}`}
                                      title={`${CHARACTERS[ai].name}: ${stock.aiScores[ai]}`}
                                    >
                                      {stock.aiScores[ai].toFixed(0)}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-xs text-brand-400 mt-1">
                                  avg {stock.aiScores.avg.toFixed(1)}
                                </div>
                              </td>
                              <td className="text-right py-3 px-2">
                                <div className="text-sm text-dark-300">
                                  {formatNumber(stock.targetPrice)}원
                                </div>
                                <div className={`text-xs ${
                                  stock.targetPrice > stock.currentPrice ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {stock.targetPrice > stock.currentPrice ? '+' : ''}
                                  {(((stock.targetPrice - stock.currentPrice) / stock.currentPrice) * 100).toFixed(1)}%
                                </div>
                              </td>
                              <td className="text-right py-3 px-2">
                                {holding > 0 ? (
                                  <span className="text-brand-400 font-medium">{holding}주</span>
                                ) : (
                                  <span className="text-dark-600">-</span>
                                )}
                              </td>
                              <td className="text-center py-3 px-2">
                                <button
                                  onClick={() => setSelectedStock(stock)}
                                  className="px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/30 transition-colors"
                                >
                                  주문
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-dark-100 mb-4">보유 종목</h2>
                  {portfolio.positions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📊</div>
                      <p className="text-dark-500">보유 중인 종목이 없습니다.</p>
                      <p className="text-sm text-dark-600 mt-1">시장 탭에서 종목을 매수해보세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.positions.map(pos => (
                        <div
                          key={pos.stockCode}
                          className="p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-dark-200">{pos.stockName}</div>
                              <div className="text-xs text-dark-500">{pos.stockCode}</div>
                            </div>
                            <button
                              onClick={() => {
                                const stock = stocks.find(s => s.code === pos.stockCode);
                                if (stock) {
                                  setSelectedStock(stock);
                                  setTradeQuantity(pos.quantity);
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                            >
                              매도
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-dark-500">수량</div>
                              <div className="font-medium text-dark-200">{pos.quantity}주</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-500">평균단가</div>
                              <div className="font-mono text-dark-300">{formatNumber(pos.avgPrice)}원</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-500">현재가</div>
                              <div className="font-mono text-dark-200">{formatNumber(pos.currentPrice)}원</div>
                            </div>
                            <div>
                              <div className="text-xs text-dark-500">손익</div>
                              <div className={`font-medium ${pos.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {pos.profit >= 0 ? '+' : ''}{formatKRW(pos.profit)}원
                                <span className="text-xs ml-1">
                                  ({pos.profitPercent >= 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-dark-100 mb-4">거래 내역</h2>
                  {trades.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📝</div>
                      <p className="text-dark-500">거래 내역이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {trades.map(trade => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-dark-800/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                              trade.type === 'BUY' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.type === 'BUY' ? '매수' : '매도'}
                            </div>
                            <div>
                              <div className="font-medium text-dark-200">{trade.stockName}</div>
                              <div className="text-xs text-dark-500">
                                {new Date(trade.timestamp).toLocaleString('ko-KR')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-dark-300">
                              {trade.quantity}주 x {formatNumber(trade.price)}원
                            </div>
                            <div className={`font-medium ${
                              trade.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {trade.type === 'BUY' ? '-' : '+'}{formatKRW(trade.total)}원
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trade Panel */}
            <div className="lg:col-span-1">
              {selectedStock ? (
                <div className="card sticky top-32">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-dark-100">주문</h3>
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="text-dark-500 hover:text-dark-300"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Stock Info */}
                  <div className="p-4 rounded-xl bg-dark-800/50 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-dark-200">{selectedStock.name}</div>
                      <div className={`text-sm ${
                        selectedStock.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-dark-100 mb-2">
                      {formatNumber(selectedStock.currentPrice)}원
                    </div>
                    <div className="flex items-center gap-2">
                      {(['claude', 'gemini', 'gpt'] as const).map(ai => (
                        <div key={ai} className="flex items-center gap-1">
                          <CharacterAvatar character={ai} size="sm" />
                          <span className={`text-xs font-medium ${CHARACTERS[ai].color}`}>
                            {selectedStock.aiScores[ai]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="mb-4">
                    <label className="text-sm text-dark-500 mb-2 block">수량</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTradeQuantity(Math.max(1, tradeQuantity - 1))}
                        className="w-10 h-10 rounded-lg bg-dark-800 text-dark-300 hover:bg-dark-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={tradeQuantity}
                        onChange={e => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-10 rounded-lg bg-dark-800 border border-dark-700 text-center text-dark-100 focus:outline-none focus:border-brand-500"
                      />
                      <button
                        onClick={() => setTradeQuantity(tradeQuantity + 1)}
                        className="w-10 h-10 rounded-lg bg-dark-800 text-dark-300 hover:bg-dark-700"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-dark-500">
                      <span>최대 매수: {getMaxBuyQuantity(selectedStock.currentPrice)}주</span>
                      <span>보유: {getHoldingQuantity(selectedStock.code)}주</span>
                    </div>
                  </div>

                  {/* Quick Buttons */}
                  <div className="flex gap-2 mb-4">
                    {[10, 25, 50, 100].map(percent => (
                      <button
                        key={percent}
                        onClick={() => {
                          const max = getMaxBuyQuantity(selectedStock.currentPrice);
                          setTradeQuantity(Math.max(1, Math.floor(max * percent / 100)));
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-dark-800 text-xs text-dark-400 hover:bg-dark-700"
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="p-3 rounded-lg bg-dark-900/50 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-500">주문 금액</span>
                      <span className="text-dark-200 font-mono">
                        {formatNumber(selectedStock.currentPrice * tradeQuantity)}원
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-500">주문 후 잔액</span>
                      <span className="text-dark-200 font-mono">
                        {formatNumber(Math.max(0, portfolio.cash - selectedStock.currentPrice * tradeQuantity))}원
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleBuy(selectedStock, tradeQuantity)}
                      disabled={selectedStock.currentPrice * tradeQuantity > portfolio.cash}
                      className="py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      매수
                    </button>
                    <button
                      onClick={() => handleSell(selectedStock, tradeQuantity)}
                      disabled={getHoldingQuantity(selectedStock.code) < tradeQuantity}
                      className="py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      매도
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-4">📈</div>
                  <h3 className="text-lg font-semibold text-dark-200 mb-2">종목을 선택하세요</h3>
                  <p className="text-dark-500 text-sm">
                    시장 탭에서 주문 버튼을 클릭하면<br />
                    여기서 매수/매도할 수 있습니다.
                  </p>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="card mt-6">
                <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  AI 추천 TOP 3
                </h3>
                <div className="space-y-3">
                  {[...stocks]
                    .sort((a, b) => b.aiScores.avg - a.aiScores.avg)
                    .slice(0, 3)
                    .map((stock, i) => (
                      <button
                        key={stock.code}
                        onClick={() => setSelectedStock(stock)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-amber-500/20 text-amber-400' :
                          i === 1 ? 'bg-gray-400/20 text-gray-400' :
                          'bg-amber-700/20 text-amber-600'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-200 truncate">{stock.name}</div>
                          <div className="text-xs text-dark-500">{stock.sector}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-brand-400">{stock.aiScores.avg.toFixed(1)}</div>
                          <div className={`text-xs ${
                            stock.targetPrice > stock.currentPrice ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {stock.targetPrice > stock.currentPrice ? '+' : ''}
                            {(((stock.targetPrice - stock.currentPrice) / stock.currentPrice) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}






