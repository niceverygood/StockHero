export interface PredictionRecord {
  id: string;
  date: string;
  symbol: string;
  symbolName: string;
  predictedDirection: 'up' | 'down' | 'neutral';
  confidence: number;
  outcome?: {
    realizedReturn: number;
    isHit: boolean;
  };
}

export interface MetricsResult {
  totalPredictions: number;
  evaluatedPredictions: number;
  pendingPredictions: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgConfidence: number;
  byDirection: {
    up: { total: number; hits: number; hitRate: number };
    down: { total: number; hits: number; hitRate: number };
    neutral: { total: number; hits: number; hitRate: number };
  };
  byConfidence: {
    high: { total: number; hits: number; hitRate: number }; // >= 0.7
    medium: { total: number; hits: number; hitRate: number }; // 0.5-0.7
    low: { total: number; hits: number; hitRate: number }; // < 0.5
  };
}

export function calculateMetrics(predictions: PredictionRecord[]): MetricsResult {
  const evaluated = predictions.filter(p => p.outcome !== undefined);
  const pending = predictions.filter(p => p.outcome === undefined);
  
  const hits = evaluated.filter(p => p.outcome?.isHit);
  const misses = evaluated.filter(p => !p.outcome?.isHit);
  
  // By direction
  const byDirection = {
    up: { total: 0, hits: 0, hitRate: 0 },
    down: { total: 0, hits: 0, hitRate: 0 },
    neutral: { total: 0, hits: 0, hitRate: 0 },
  };
  
  for (const p of evaluated) {
    byDirection[p.predictedDirection].total++;
    if (p.outcome?.isHit) {
      byDirection[p.predictedDirection].hits++;
    }
  }
  
  for (const dir of ['up', 'down', 'neutral'] as const) {
    if (byDirection[dir].total > 0) {
      byDirection[dir].hitRate = byDirection[dir].hits / byDirection[dir].total;
    }
  }
  
  // By confidence
  const byConfidence = {
    high: { total: 0, hits: 0, hitRate: 0 },
    medium: { total: 0, hits: 0, hitRate: 0 },
    low: { total: 0, hits: 0, hitRate: 0 },
  };
  
  for (const p of evaluated) {
    const level = p.confidence >= 0.7 ? 'high' : p.confidence >= 0.5 ? 'medium' : 'low';
    byConfidence[level].total++;
    if (p.outcome?.isHit) {
      byConfidence[level].hits++;
    }
  }
  
  for (const level of ['high', 'medium', 'low'] as const) {
    if (byConfidence[level].total > 0) {
      byConfidence[level].hitRate = byConfidence[level].hits / byConfidence[level].total;
    }
  }
  
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    : 0;
  
  return {
    totalPredictions: predictions.length,
    evaluatedPredictions: evaluated.length,
    pendingPredictions: pending.length,
    hits: hits.length,
    misses: misses.length,
    hitRate: evaluated.length > 0 ? hits.length / evaluated.length : 0,
    avgConfidence,
    byDirection,
    byConfidence,
  };
}

export function evaluatePrediction(
  predictedDirection: 'up' | 'down' | 'neutral',
  realizedReturn: number
): boolean {
  switch (predictedDirection) {
    case 'up':
      return realizedReturn > 0;
    case 'down':
      return realizedReturn < 0;
    case 'neutral':
      return Math.abs(realizedReturn) < 1; // Within 1%
  }
}

// Seeded mock data generation for consistent results
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateMockPredictions(days: number): PredictionRecord[] {
  const predictions: PredictionRecord[] = [];
  const symbols = [
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
    { symbol: '373220', name: 'LG에너지솔루션' },
    { symbol: '035720', name: '카카오' },
    { symbol: '068270', name: '셀트리온' },
  ];
  
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    const random = seededRandom(i * 12345);
    
    // 5 predictions per day
    for (const sym of symbols) {
      const directions: Array<'up' | 'down' | 'neutral'> = ['up', 'down', 'neutral'];
      const direction = directions[Math.floor(random() * 3)];
      const confidence = 0.5 + random() * 0.4;
      
      const prediction: PredictionRecord = {
        id: `pred-${dateStr}-${sym.symbol}`,
        date: dateStr,
        symbol: sym.symbol,
        symbolName: sym.name,
        predictedDirection: direction,
        confidence,
      };
      
      // Add outcome for predictions older than 5 days
      if (i > 5) {
        const realizedReturn = (random() - 0.4) * 10; // -4% to +6%
        prediction.outcome = {
          realizedReturn,
          isHit: evaluatePrediction(direction, realizedReturn),
        };
      }
      
      predictions.push(prediction);
    }
  }
  
  return predictions;
}

