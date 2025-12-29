// 투자성향 분석 타입 정의

// 4가지 차원 (각 2가지 옵션 = 2^4 = 16가지 유형)
// R/S: Risk-taker vs Safety-seeker (위험추구 vs 안정추구)
// G/V: Growth vs Value (성장주 vs 가치주)
// A/P: Active vs Passive (적극적 vs 수동적)
// L/S: Long-term vs Short-term (장기 vs 단기)

export type RiskDimension = 'R' | 'S'; // Risk-taker / Safety-seeker
export type StyleDimension = 'G' | 'V'; // Growth / Value
export type ActivityDimension = 'A' | 'P'; // Active / Passive
export type HorizonDimension = 'L' | 'T'; // Long-term / shorT-term

export type InvestorType = `${RiskDimension}${StyleDimension}${ActivityDimension}${HorizonDimension}`;

// 모든 16가지 유형
export const ALL_INVESTOR_TYPES: InvestorType[] = [
  'RGAL', 'RGAT', 'RGPL', 'RGPT',
  'RVAL', 'RVAT', 'RVPL', 'RVPT',
  'SGAL', 'SGAT', 'SGPL', 'SGPT',
  'SVAL', 'SVAT', 'SVPL', 'SVPT',
];

export interface Question {
  id: number;
  stage: number;
  dimension: 'risk' | 'style' | 'activity' | 'horizon';
  question: string;
  subtitle?: string;
  emoji: string;
  options: {
    text: string;
    value: string; // 'R', 'S', 'G', 'V', 'A', 'P', 'L', 'T'
    emoji: string;
    description?: string;
  }[];
}

export interface QuizAnswer {
  questionId: number;
  dimension: 'risk' | 'style' | 'activity' | 'horizon';
  value: string;
}

export interface InvestorTypeInfo {
  type: InvestorType;
  name: string;
  nameEn: string;
  emoji: string;
  title: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  investmentStyle: string;
  recommendedSectors: string[];
  riskLevel: 1 | 2 | 3 | 4 | 5;
  famousInvestor?: string;
  color: string;
  gradient: string;
}

export interface StyleRecommendation {
  stockSymbol: string;
  stockName: string;
  reason: string;
  matchScore: number;
  heroId: 'claude' | 'gemini' | 'gpt';
}


