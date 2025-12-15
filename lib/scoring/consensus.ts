import type { CharacterType } from '@/lib/llm/types';

export interface SymbolEvaluation {
  symbolId: string;
  symbol: string;
  name: string;
  sector: string;
  scores: Record<CharacterType, number>;
  avgScore: number;
  riskFlags: string[];
  hasUnanimous: boolean;
  rationale: string;
}

export interface Top5Result {
  date: string;
  top5: SymbolEvaluation[];
  totalCandidates: number;
  unanimousCount: number;
  rationale: string;
}

// Risk penalty weights
const RISK_PENALTY = 0.2;

export function calculateConsensusScore(
  scores: Record<CharacterType, number>,
  riskFlags: string[]
): number {
  const values = Object.values(scores);
  const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Apply risk penalty based on Claude and GPT (conservative analysts) flagging risks
  const riskPenalty = riskFlags.length > 2 ? RISK_PENALTY : 0;
  
  return Math.max(0, avgScore - riskPenalty);
}

export function isUnanimous(scores: Record<CharacterType, number>): boolean {
  return Object.values(scores).every(score => score >= 4);
}

export function selectTop5(evaluations: SymbolEvaluation[]): Top5Result {
  const today = new Date().toISOString().split('T')[0];
  
  // Sort by: 1) Unanimous first, 2) Then by adjusted score
  const sorted = [...evaluations].sort((a, b) => {
    // Unanimous takes priority
    if (a.hasUnanimous && !b.hasUnanimous) return -1;
    if (!a.hasUnanimous && b.hasUnanimous) return 1;
    
    // Then by average score (with risk penalty applied)
    const aAdjusted = calculateConsensusScore(a.scores, a.riskFlags);
    const bAdjusted = calculateConsensusScore(b.scores, b.riskFlags);
    return bAdjusted - aAdjusted;
  });

  const top5 = sorted.slice(0, 5);
  const unanimousCount = top5.filter(e => e.hasUnanimous).length;

  // Generate rationale
  let rationale = '';
  if (unanimousCount === 5) {
    rationale = '오늘 선정된 Top 5는 모두 세 분석가의 만장일치로 4점 이상을 획득했습니다. ';
  } else if (unanimousCount > 0) {
    rationale = `Top 5 중 ${unanimousCount}개 종목이 만장일치 합의를 얻었습니다. `;
  } else {
    rationale = '오늘은 만장일치 종목이 없어 평균 점수와 리스크 요인을 종합하여 선정했습니다. ';
  }
  
  // Add sector insight
  const sectors = [...new Set(top5.map(e => e.sector))];
  if (sectors.length <= 2) {
    rationale += `${sectors.join(', ')} 업종에 대한 선호가 두드러집니다.`;
  } else {
    rationale += '다양한 업종에 걸쳐 분산된 선정입니다.';
  }

  return {
    date: today,
    top5,
    totalCandidates: evaluations.length,
    unanimousCount,
    rationale,
  };
}

export function generateRationale(evaluation: SymbolEvaluation): string {
  const { name, sector, scores, hasUnanimous, riskFlags } = evaluation;
  const parts: string[] = [];

  if (hasUnanimous) {
    parts.push(`세 분석가 모두 ${name}에 대해 4점 이상의 긍정적 평가를 내렸습니다.`);
  }

  // Highlight highest scorer
  const maxScore = Math.max(...Object.values(scores));
  const maxScorer = Object.entries(scores).find(([_, s]) => s === maxScore)?.[0];
  if (maxScorer) {
    const scorerName = maxScorer === 'CLAUDE' ? 'Claude Lee' : 
                       maxScorer === 'GEMINI' ? 'Gemi Nine' : 'G.P. Taylor';
    parts.push(`${scorerName}가 ${maxScore}점으로 가장 높게 평가했습니다.`);
  }

  // Add sector context
  parts.push(`${sector} 업종 내 경쟁력을 갖추고 있습니다.`);

  // Add risk mention
  if (riskFlags.length > 0) {
    parts.push(`다만, ${riskFlags[0]} 등의 리스크 요인은 주시가 필요합니다.`);
  }

  return parts.join(' ');
}

