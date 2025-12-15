export type CharacterRole = 'CLAUDE' | 'GEMINI' | 'GPT' | 'SYSTEM';

export interface DebateMessage {
  id: string;
  role: CharacterRole;
  content: string;
  sources: string[];
  score?: number;
  risks?: string;
  createdAt: Date;
}

export interface SymbolInfo {
  id: string;
  symbol: string;
  name: string;
  market: string;
  sector?: string;
}

export interface Top5Item {
  rank: number;
  symbolId: string;
  symbol: string;
  name: string;
  avgScore: number;
  rationale: string;
}

export interface VerdictData {
  id: string;
  date: string;
  top5: Top5Item[];
  rationale?: string;
  createdAt: Date;
}

export interface PredictionWithOutcome {
  id: string;
  date: string;
  symbol: SymbolInfo;
  horizonDays: number;
  predictedDirection: 'up' | 'down' | 'neutral';
  confidence: number;
  outcome?: {
    realizedReturn: number;
    isHit: boolean;
  };
}

export interface ArchiveMetrics {
  totalPredictions: number;
  hits: number;
  hitRate: number;
  avgConfidence: number;
  byDirection: {
    up: { total: number; hits: number };
    down: { total: number; hits: number };
    neutral: { total: number; hits: number };
  };
}

export interface LLMResponse {
  content: string;
  risks: string;
  sources: string[];
  score: number;
}

export interface LLMAdapter {
  generateStructured(prompt: string, context: Record<string, unknown>): Promise<LLMResponse>;
}

