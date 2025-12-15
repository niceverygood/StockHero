export interface PortfolioSnapshot {
  date: string;
  value: number;
  returnPct: number;
  benchmarkValue: number;
  benchmarkReturnPct: number;
}

export interface PickPerformance {
  symbol: string;
  name: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  returnPct: number;
  holdingDays: number;
  pickedBy: ('claude' | 'gemini' | 'gpt')[];
  isWinner: boolean;
}

export interface AIPerformance {
  id: 'claude' | 'gemini' | 'gpt';
  name: string;
  totalPicks: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  bestSector: string;
  worstSector: string;
  streak: number;
  rank: number;
}

export interface PortfolioMetrics {
  totalReturn: number;
  benchmarkReturn: number;
  alpha: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface HallOfFameEntry {
  rank: number;
  symbol: string;
  name: string;
  returnPct: number;
  date: string;
  pickedBy: ('claude' | 'gemini' | 'gpt')[];
}

export type TimeRange = '1w' | '1m' | '3m' | 'all';

