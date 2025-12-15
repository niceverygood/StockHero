export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52Week: number;
  low52Week: number;
  updatedAt: Date;
}

export interface StockFinancials {
  symbol: string;
  revenue: number;
  revenueGrowth: number;
  operatingIncome: number;
  operatingMargin: number;
  netIncome: number;
  eps: number;
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
  dividendYield: number;
  fiscalYear: string;
}

export interface StockNews {
  id: string;
  symbol: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<StockQuote>;
  getFinancials(symbol: string): Promise<StockFinancials>;
  getNews(symbol: string, limit?: number): Promise<StockNews[]>;
  getCandidateSymbols(count?: number): Promise<string[]>;
}

