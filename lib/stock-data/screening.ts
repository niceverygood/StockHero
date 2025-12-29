/**
 * 스크리닝 엔진
 * 각 AI 캐릭터의 투자 철학에 맞는 종목 선별
 */

import { type RealTimeStockData } from './fetcher';
import { SECTOR_CHARACTERISTICS, type Sector, SECTOR_NAMES } from './master';

export type CharacterType = 'claude' | 'gemini' | 'gpt';

export interface ScoredStock {
  symbol: string;
  name: string;
  sector: Sector;
  sectorName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  
  // 점수 상세
  scores: {
    total: number;           // 총점 (0-100)
    breakdown: {
      name: string;
      score: number;
      weight: number;
      contribution: number;  // weight * score
    }[];
  };
  
  // 추천 이유
  reason: string;
  
  // 목표가
  targetPrice: number;
  targetPriceRatio: number;  // 현재가 대비 배수
  
  // 리스크
  risks: string[];
  
  // 주요 지표
  keyMetrics: Record<string, number | string>;
}

export interface ScreeningResult {
  character: CharacterType;
  characterName: string;
  philosophy: string;
  stocks: ScoredStock[];
  generatedAt: Date;
}

/**
 * 점수 정규화 함수 (0-100 범위로)
 */
function normalizeScore(value: number, min: number, max: number, inverse = false): number {
  const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return inverse ? 100 - normalized : normalized;
}

/**
 * Claude Lee (숫자의 검사) 스코어링
 * 펀더멘털 기반 저평가 우량주
 */
function scoreForClaude(stock: RealTimeStockData): ScoredStock {
  const { master } = stock;
  const fin = master.financials;
  
  // === 밸류에이션 점수 (40%) ===
  // PER: 낮을수록 좋음 (5~25 범위)
  const perScore = normalizeScore(fin.per, 5, 25, true);
  // PBR: 낮을수록 좋음 (0.3~3 범위)
  const pbrScore = normalizeScore(fin.pbr, 0.3, 3, true);
  
  const valuationScore = (perScore * 0.6 + pbrScore * 0.4);
  
  // === 재무건전성 점수 (30%) ===
  // 부채비율: 낮을수록 좋음 (0~150 범위)
  const debtScore = fin.debtRatio === 0 ? 80 : normalizeScore(fin.debtRatio, 0, 150, true);
  // 유동비율: 높을수록 좋음 (50~300 범위)
  const liquidityScore = fin.currentRatio === 0 ? 70 : normalizeScore(fin.currentRatio, 50, 300);
  
  const financialScore = (debtScore * 0.5 + liquidityScore * 0.5);
  
  // === 수익성 점수 (30%) ===
  // ROE: 높을수록 좋음 (0~25 범위)
  const roeScore = normalizeScore(fin.roe, 0, 25);
  // 영업이익률: 높을수록 좋음 (0~30 범위)
  const marginScore = normalizeScore(fin.operatingMargin, 0, 30);
  
  const profitabilityScore = (roeScore * 0.6 + marginScore * 0.4);
  
  // 총점 계산
  const totalScore = (valuationScore * 0.4) + (financialScore * 0.3) + (profitabilityScore * 0.3);
  
  // 목표가 계산 (저평가 정도에 따라)
  const targetMultiplier = 1.15 + (totalScore / 100) * 0.15; // 1.15 ~ 1.30
  const targetPrice = Math.round(stock.currentPrice * targetMultiplier);
  
  // 추천 이유 생성
  const reasons: string[] = [];
  if (fin.pbr < 1) reasons.push(`PBR ${fin.pbr.toFixed(2)}배로 순자산 대비 저평가`);
  if (fin.per < 10) reasons.push(`PER ${fin.per.toFixed(1)}배로 수익 대비 저평가`);
  if (fin.roe > 10) reasons.push(`ROE ${fin.roe.toFixed(1)}%로 자본효율성 양호`);
  if (fin.dividendYield > 3) reasons.push(`배당수익률 ${fin.dividendYield.toFixed(1)}%`);
  
  const reason = reasons.length > 0 
    ? reasons.join('. ') + '.'
    : `PER ${fin.per.toFixed(1)}배, PBR ${fin.pbr.toFixed(2)}배로 밸류에이션 적정.`;
  
  // 리스크
  const risks: string[] = [];
  if (fin.earningsGrowth < 0) risks.push('이익 감소 추세');
  if (fin.debtRatio > 100) risks.push('높은 부채비율');
  if (stock.changePercent < -3) risks.push('단기 하락 모멘텀');
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: master.sector,
    sectorName: SECTOR_NAMES[master.sector],
    currentPrice: stock.currentPrice,
    change: stock.change,
    changePercent: stock.changePercent,
    scores: {
      total: Math.round(totalScore * 10) / 10,
      breakdown: [
        { name: '밸류에이션', score: Math.round(valuationScore), weight: 0.4, contribution: Math.round(valuationScore * 0.4) },
        { name: '재무건전성', score: Math.round(financialScore), weight: 0.3, contribution: Math.round(financialScore * 0.3) },
        { name: '수익성', score: Math.round(profitabilityScore), weight: 0.3, contribution: Math.round(profitabilityScore * 0.3) },
      ],
    },
    reason,
    targetPrice,
    targetPriceRatio: targetMultiplier,
    risks: risks.length > 0 ? risks : ['특이 리스크 없음'],
    keyMetrics: {
      PER: fin.per,
      PBR: fin.pbr,
      ROE: `${fin.roe}%`,
      '부채비율': `${fin.debtRatio}%`,
      '배당수익률': `${fin.dividendYield}%`,
    },
  };
}

/**
 * Gemi Nine (파괴적 혁신가) 스코어링
 * 성장 모멘텀 기반
 */
function scoreForGemini(stock: RealTimeStockData): ScoredStock {
  const { master } = stock;
  const fin = master.financials;
  const sectorChar = SECTOR_CHARACTERISTICS[master.sector];
  
  // === 성장성 점수 (50%) ===
  // 매출성장률: 높을수록 좋음 (-10~50 범위)
  const revenueGrowthScore = normalizeScore(fin.revenueGrowth, -10, 50);
  // 이익성장률: 높을수록 좋음 (-30~100 범위)
  const earningsGrowthScore = normalizeScore(fin.earningsGrowth, -30, 100);
  
  const growthScore = (revenueGrowthScore * 0.4 + earningsGrowthScore * 0.6);
  
  // === 모멘텀 점수 (30%) ===
  // 주가 등락률: 높을수록 좋음 (-5~5 범위)
  const priceMotScore = normalizeScore(stock.changePercent, -5, 5);
  // 성장섹터 보너스
  const sectorBonus = sectorChar.isGrowth ? 30 : 0;
  
  const momentumScore = (priceMotScore * 0.7) + sectorBonus;
  
  // === 혁신성 점수 (20%) ===
  // 섹터 기반 혁신성
  const innovationBase = sectorChar.isGrowth ? 80 : (sectorChar.volatility === 'high' ? 60 : 40);
  // 시총 기반 (작을수록 성장 잠재력)
  const capScore = fin.marketCap > 500000 ? 50 : (fin.marketCap > 100000 ? 70 : 90);
  
  const innovationScore = (innovationBase * 0.6 + capScore * 0.4);
  
  // 총점 계산
  const totalScore = (growthScore * 0.5) + (momentumScore * 0.3) + (innovationScore * 0.2);
  
  // 목표가 계산 (성장성에 따라 공격적으로)
  const targetMultiplier = 1.25 + (totalScore / 100) * 0.35; // 1.25 ~ 1.60
  const targetPrice = Math.round(stock.currentPrice * targetMultiplier);
  
  // 추천 이유 생성
  const reasons: string[] = [];
  if (fin.revenueGrowth > 20) reasons.push(`매출성장률 ${fin.revenueGrowth.toFixed(1)}%`);
  if (fin.earningsGrowth > 30) reasons.push(`이익성장률 ${fin.earningsGrowth.toFixed(1)}%`);
  if (sectorChar.isGrowth) reasons.push(`${SECTOR_NAMES[master.sector]} 성장섹터`);
  if (stock.changePercent > 2) reasons.push('강한 상승 모멘텀');
  
  const reason = reasons.length > 0 
    ? reasons.join('. ') + '. This is the future!'
    : `${SECTOR_NAMES[master.sector]} 섹터 내 성장 잠재력 보유.`;
  
  // 리스크
  const risks: string[] = [];
  if (fin.per > 30) risks.push('높은 밸류에이션');
  if (sectorChar.volatility === 'high') risks.push('높은 변동성');
  if (fin.debtRatio > 80) risks.push('재무 레버리지');
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: master.sector,
    sectorName: SECTOR_NAMES[master.sector],
    currentPrice: stock.currentPrice,
    change: stock.change,
    changePercent: stock.changePercent,
    scores: {
      total: Math.round(totalScore * 10) / 10,
      breakdown: [
        { name: '성장성', score: Math.round(growthScore), weight: 0.5, contribution: Math.round(growthScore * 0.5) },
        { name: '모멘텀', score: Math.round(momentumScore), weight: 0.3, contribution: Math.round(momentumScore * 0.3) },
        { name: '혁신성', score: Math.round(innovationScore), weight: 0.2, contribution: Math.round(innovationScore * 0.2) },
      ],
    },
    reason,
    targetPrice,
    targetPriceRatio: targetMultiplier,
    risks: risks.length > 0 ? risks : ['High risk, high return!'],
    keyMetrics: {
      '매출성장률': `${fin.revenueGrowth}%`,
      '이익성장률': `${fin.earningsGrowth}%`,
      'PER': fin.per,
      '섹터': SECTOR_NAMES[master.sector],
    },
  };
}

/**
 * G.P. Taylor (월가의 노장) 스코어링
 * 안정성/배당 기반
 */
function scoreForGPT(stock: RealTimeStockData): ScoredStock {
  const { master } = stock;
  const fin = master.financials;
  const sectorChar = SECTOR_CHARACTERISTICS[master.sector];
  
  // === 안정성 점수 (40%) ===
  // 베타: 낮을수록 좋음 (0.4~1.5 범위)
  const betaScore = normalizeScore(fin.beta, 0.4, 1.5, true);
  // 방어섹터 보너스
  const defensiveBonus = sectorChar.isDefensive ? 25 : 0;
  // 변동성
  const volScore = sectorChar.volatility === 'low' ? 90 : (sectorChar.volatility === 'medium' ? 60 : 30);
  
  const stabilityScore = (betaScore * 0.5 + volScore * 0.3) + defensiveBonus * 0.2;
  
  // === 배당 점수 (35%) ===
  // 배당수익률: 높을수록 좋음 (0~7 범위)
  const yieldScore = normalizeScore(fin.dividendYield, 0, 7);
  // 배당성향: 적정 범위(20~50)가 좋음
  const payoutScore = fin.payoutRatio >= 20 && fin.payoutRatio <= 50 ? 80 : 50;
  
  const dividendScore = (yieldScore * 0.7 + payoutScore * 0.3);
  
  // === 방어력 점수 (25%) ===
  // 시총: 클수록 안정적
  const capScore = fin.marketCap > 200000 ? 90 : (fin.marketCap > 100000 ? 70 : 50);
  // 부채비율: 낮을수록 좋음
  const debtScore = fin.debtRatio === 0 ? 80 : normalizeScore(fin.debtRatio, 0, 150, true);
  
  const defensiveScore = (capScore * 0.4 + debtScore * 0.6);
  
  // 총점 계산
  const totalScore = (stabilityScore * 0.4) + (dividendScore * 0.35) + (defensiveScore * 0.25);
  
  // 목표가 계산 (보수적)
  const targetMultiplier = 1.08 + (totalScore / 100) * 0.12; // 1.08 ~ 1.20
  const targetPrice = Math.round(stock.currentPrice * targetMultiplier);
  
  // 추천 이유 생성
  const reasons: string[] = [];
  if (fin.dividendYield > 3) reasons.push(`배당수익률 ${fin.dividendYield.toFixed(1)}%`);
  if (fin.beta < 0.8) reasons.push(`베타 ${fin.beta.toFixed(2)}로 낮은 변동성`);
  if (sectorChar.isDefensive) reasons.push(`${SECTOR_NAMES[master.sector]} 경기방어 섹터`);
  if (fin.marketCap > 200000) reasons.push('대형주 안정성');
  
  const reason = reasons.length > 0 
    ? reasons.join('. ') + '. 살아남아야 다음 기회가 있습니다.'
    : `안정적인 배당과 낮은 변동성. 장기 투자에 적합합니다.`;
  
  // 리스크
  const risks: string[] = [];
  if (fin.revenueGrowth < 0) risks.push('성장성 둔화');
  if (fin.dividendYield < 2) risks.push('낮은 배당');
  if (!sectorChar.isDefensive) risks.push('경기민감 섹터');
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: master.sector,
    sectorName: SECTOR_NAMES[master.sector],
    currentPrice: stock.currentPrice,
    change: stock.change,
    changePercent: stock.changePercent,
    scores: {
      total: Math.round(totalScore * 10) / 10,
      breakdown: [
        { name: '안정성', score: Math.round(stabilityScore), weight: 0.4, contribution: Math.round(stabilityScore * 0.4) },
        { name: '배당', score: Math.round(dividendScore), weight: 0.35, contribution: Math.round(dividendScore * 0.35) },
        { name: '방어력', score: Math.round(defensiveScore), weight: 0.25, contribution: Math.round(defensiveScore * 0.25) },
      ],
    },
    reason,
    targetPrice,
    targetPriceRatio: targetMultiplier,
    risks: risks.length > 0 ? risks : ['리스크 관리가 핵심입니다'],
    keyMetrics: {
      '배당수익률': `${fin.dividendYield}%`,
      '베타': fin.beta,
      'PBR': fin.pbr,
      '시총': `${Math.round(fin.marketCap / 10000)}조원`,
    },
  };
}

/**
 * 캐릭터별 스크리닝 함수
 */
const SCORING_FUNCTIONS: Record<CharacterType, (stock: RealTimeStockData) => ScoredStock> = {
  claude: scoreForClaude,
  gemini: scoreForGemini,
  gpt: scoreForGPT,
};

const CHARACTER_INFO: Record<CharacterType, { name: string; philosophy: string }> = {
  claude: {
    name: 'Claude Lee (클로드 리)',
    philosophy: '숫자는 거짓말하지 않습니다. 펀더멘털이 검증된 저평가 우량주를 찾습니다.',
  },
  gemini: {
    name: 'Gemi Nine (제미 나인)',
    philosophy: '역사는 미친 놈들이 만들어요. 미래를 선도할 고성장 혁신 기업을 찾습니다.',
  },
  gpt: {
    name: 'G.P. Taylor (지피 테일러)',
    philosophy: '살아남아야 다음 기회가 있습니다. 어떤 위기에도 버틸 수 있는 방어주를 찾습니다.',
  },
};

/**
 * 스크리닝 실행
 */
export function screenStocks(
  stocks: RealTimeStockData[],
  character: CharacterType,
  topN: number = 5
): ScreeningResult {
  const scoringFn = SCORING_FUNCTIONS[character];
  const charInfo = CHARACTER_INFO[character];
  
  // 모든 종목 스코어링
  const scoredStocks = stocks.map(stock => scoringFn(stock));
  
  // 점수 기준 정렬 및 상위 N개 선택
  const topStocks = scoredStocks
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, topN)
    .map((stock, index) => ({
      ...stock,
      rank: index + 1,
    }));
  
  return {
    character,
    characterName: charInfo.name,
    philosophy: charInfo.philosophy,
    stocks: topStocks,
    generatedAt: new Date(),
  };
}

/**
 * 모든 캐릭터에 대해 스크리닝 실행
 */
export function screenAllCharacters(
  stocks: RealTimeStockData[],
  topN: number = 5
): Record<CharacterType, ScreeningResult> {
  return {
    claude: screenStocks(stocks, 'claude', topN),
    gemini: screenStocks(stocks, 'gemini', topN),
    gpt: screenStocks(stocks, 'gpt', topN),
  };
}






