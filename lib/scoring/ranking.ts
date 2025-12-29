import type { SymbolEvaluation } from './consensus';

export interface RankingCriteria {
  scoreWeight: number;
  unanimityBonus: number;
  riskPenalty: number;
  sectorDiversityBonus: number;
}

export const DEFAULT_CRITERIA: RankingCriteria = {
  scoreWeight: 1.0,
  unanimityBonus: 0.5,
  riskPenalty: 0.2,
  sectorDiversityBonus: 0.1,
};

export function calculateRankingScore(
  evaluation: SymbolEvaluation,
  criteria: RankingCriteria = DEFAULT_CRITERIA
): number {
  let score = evaluation.avgScore * criteria.scoreWeight;
  
  // Unanimity bonus
  if (evaluation.hasUnanimous) {
    score += criteria.unanimityBonus;
  }
  
  // Risk penalty
  const riskCount = evaluation.riskFlags.length;
  if (riskCount > 2) {
    score -= criteria.riskPenalty * (riskCount - 2);
  }
  
  return Math.max(0, score);
}

export function rankSymbols(
  evaluations: SymbolEvaluation[],
  criteria: RankingCriteria = DEFAULT_CRITERIA
): Array<SymbolEvaluation & { rankScore: number; rank: number }> {
  const ranked = evaluations.map(e => ({
    ...e,
    rankScore: calculateRankingScore(e, criteria),
    rank: 0,
  }));
  
  ranked.sort((a, b) => b.rankScore - a.rankScore);
  
  return ranked.map((e, idx) => ({
    ...e,
    rank: idx + 1,
  }));
}

export function selectWithDiversity(
  rankedEvaluations: Array<SymbolEvaluation & { rankScore: number }>,
  maxPerSector: number = 2,
  totalCount: number = 5
): SymbolEvaluation[] {
  const selected: SymbolEvaluation[] = [];
  const sectorCounts: Record<string, number> = {};
  
  for (const evaluation of rankedEvaluations) {
    if (selected.length >= totalCount) break;
    
    const sector = evaluation.sector;
    const currentCount = sectorCounts[sector] || 0;
    
    if (currentCount < maxPerSector) {
      selected.push(evaluation);
      sectorCounts[sector] = currentCount + 1;
    }
  }
  
  // If we couldn't fill with diversity, add remaining top scorers
  if (selected.length < totalCount) {
    for (const evaluation of rankedEvaluations) {
      if (selected.length >= totalCount) break;
      if (!selected.includes(evaluation)) {
        selected.push(evaluation);
      }
    }
  }
  
  return selected;
}






