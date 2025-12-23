/**
 * 🎯 AI 분석가별 분석 프레임워크
 * 
 * 각 AI가 목표가와 목표 달성 시점을 산출하는 논리적 근거를 정의합니다.
 */

import type { CharacterType } from './types';

// ==================== 분석 방법론 ====================

export interface AnalysisMethodology {
  name: string;
  description: string;
  primaryMetrics: string[];
  targetPriceFormula: string;
  targetDateLogic: string;
  catalysts: string[];
  riskFactors: string[];
}

export const ANALYSIS_METHODOLOGIES: Record<CharacterType, AnalysisMethodology> = {
  claude: {
    name: '펀더멘털 밸류에이션 분석',
    description: '재무제표 기반 내재가치 산출 및 업종 평균 멀티플 비교',
    primaryMetrics: [
      'PER (주가수익비율)',
      'PBR (주가순자산비율)',
      'ROE (자기자본이익률)',
      'EPS 성장률',
      '영업이익률',
      '부채비율',
    ],
    targetPriceFormula: `
      목표가 = 예상 EPS × 적정 PER
      - 예상 EPS: 현재 EPS × (1 + 예상 성장률)
      - 적정 PER: 업종 평균 PER × (1 + ROE 프리미엄)
      - 안전마진 10% 적용
    `,
    targetDateLogic: `
      목표 달성 시점 산출 근거:
      1. 다음 실적 발표일 (분기 실적 확인)
      2. 밸류에이션 갭 해소 기간 (보통 2-4분기)
      3. 업황 사이클 전환점 예상 시점
      → 보통 3-9개월 내 목표 달성 예상
    `,
    catalysts: [
      '분기 실적 발표',
      '배당 정책 변경',
      'ROE 개선',
      '자사주 매입',
    ],
    riskFactors: [
      '실적 미스',
      '마진 압박',
      '경쟁 심화',
      '원자재 가격 변동',
    ],
  },

  gemini: {
    name: '성장주 TAM 분석',
    description: 'Total Addressable Market 기반 성장 잠재력 평가',
    primaryMetrics: [
      'TAM (전체 시장 규모)',
      '매출 성장률 (YoY)',
      '시장 점유율 변화',
      'R&D 투자 비중',
      'PEG 비율',
      '고객 증가율',
    ],
    targetPriceFormula: `
      목표가 = 예상 매출 × 목표 PSR
      - 예상 매출: 현재 매출 × (1 + 성장률)^기간
      - 목표 PSR: 성장률 대비 프리미엄 적용
      - 공격적 시나리오 기준 (상위 30% 가능성)
    `,
    targetDateLogic: `
      목표 달성 시점 산출 근거:
      1. 신사업/신제품 출시 일정
      2. TAM 확대 시점 (규제 완화, 기술 성숙)
      3. 시장 점유율 목표 달성 예상 시점
      → 성장주 특성상 12-24개월 중장기 목표
    `,
    catalysts: [
      '신제품 출시',
      '신시장 진출',
      'M&A 발표',
      '대규모 수주',
      '기술 혁신 발표',
    ],
    riskFactors: [
      '경쟁사 추격',
      '기술 변화',
      '규제 리스크',
      '성장 둔화',
    ],
  },

  gpt: {
    name: '거시경제 리스크 조정 분석',
    description: '매크로 환경과 리스크 팩터를 고려한 보수적 가치 평가',
    primaryMetrics: [
      '금리 민감도',
      '환율 영향',
      '베타 (시장 대비 변동성)',
      '배당수익률',
      '신용등급',
      '유동성 비율',
    ],
    targetPriceFormula: `
      목표가 = 내재가치 × (1 - 리스크 할인율)
      - 내재가치: DCF 또는 상대가치 평균
      - 리스크 할인율: 매크로 리스크 + 개별 리스크
      - 최악 시나리오 방어 가능 수준으로 설정
    `,
    targetDateLogic: `
      목표 달성 시점 산출 근거:
      1. 거시경제 이벤트 일정 (FOMC, 선거 등)
      2. 리스크 해소 예상 시점
      3. 변동성 정상화 기간
      → 리스크 관리 관점 6-12개월 목표
    `,
    catalysts: [
      '금리 인하',
      '지정학적 리스크 완화',
      '규제 명확화',
      '업종 정책 지원',
    ],
    riskFactors: [
      '금리 인상',
      '경기 침체',
      '지정학적 긴장',
      '환율 급변',
      '유동성 위기',
    ],
  },
};

// ==================== 목표가 산출 로직 ====================

export interface TargetPriceCalculation {
  basePrice: number;
  adjustmentFactors: {
    name: string;
    impact: number;  // 퍼센트
    reasoning: string;
  }[];
  finalTarget: number;
  confidence: number;  // 1-5
  methodology: string;
}

export function calculateTargetPrice(
  character: CharacterType,
  currentPrice: number,
  financials: {
    per?: number;
    pbr?: number;
    roe?: number;
    growthRate?: number;
    debtRatio?: number;
  }
): TargetPriceCalculation {
  const methodology = ANALYSIS_METHODOLOGIES[character];
  
  switch (character) {
    case 'claude': {
      // 펀더멘털 기반 목표가 산출
      const per = financials.per || 15;
      const roe = financials.roe || 10;
      const growthRate = financials.growthRate || 5;
      
      // 적정 PER = 업종 평균 × ROE 프리미엄
      const targetPER = per * (1 + (roe - 10) / 100);
      // 목표가 = 현재가 × (적정PER / 현재PER) × (1 + 성장률)
      const baseMultiplier = (targetPER / per) * (1 + growthRate / 100);
      const safetyMargin = 0.9;  // 10% 안전마진
      
      const finalTarget = Math.round(currentPrice * baseMultiplier * safetyMargin / 100) * 100;
      
      return {
        basePrice: currentPrice,
        adjustmentFactors: [
          {
            name: 'PER 정상화',
            impact: ((targetPER / per) - 1) * 100,
            reasoning: `현재 PER ${per}배 → 적정 PER ${targetPER.toFixed(1)}배로 수렴 예상`,
          },
          {
            name: 'EPS 성장 반영',
            impact: growthRate,
            reasoning: `연간 EPS 성장률 ${growthRate}% 전망`,
          },
          {
            name: '안전마진 적용',
            impact: -10,
            reasoning: '불확실성 고려 10% 안전마진',
          },
        ],
        finalTarget,
        confidence: 4,
        methodology: methodology.name,
      };
    }

    case 'gemini': {
      // 성장주 기반 공격적 목표가 산출
      const growthRate = financials.growthRate || 20;
      const roe = financials.roe || 15;
      
      // 성장률 프리미엄 적용
      const growthPremium = 1 + (growthRate / 100) * 1.5;  // 성장률의 1.5배 프리미엄
      const momentumBonus = 1.1;  // 모멘텀 보너스 10%
      
      const finalTarget = Math.round(currentPrice * growthPremium * momentumBonus / 100) * 100;
      
      return {
        basePrice: currentPrice,
        adjustmentFactors: [
          {
            name: '성장률 프리미엄',
            impact: (growthPremium - 1) * 100,
            reasoning: `연간 ${growthRate}% 성장 기반 프리미엄 적용`,
          },
          {
            name: '모멘텀 보너스',
            impact: 10,
            reasoning: '신사업/혁신 모멘텀 반영',
          },
        ],
        finalTarget,
        confidence: 5,
        methodology: methodology.name,
      };
    }

    case 'gpt': {
      // 리스크 조정 보수적 목표가 산출
      const debtRatio = financials.debtRatio || 50;
      const per = financials.per || 15;
      
      // 리스크 할인율 계산
      const riskDiscount = Math.min(20, debtRatio / 5 + 5);  // 최대 20% 할인
      const baseMultiplier = 1.15;  // 기본 15% 상승 여력
      
      const finalTarget = Math.round(currentPrice * baseMultiplier * (1 - riskDiscount / 100) / 100) * 100;
      
      return {
        basePrice: currentPrice,
        adjustmentFactors: [
          {
            name: '기본 상승 여력',
            impact: 15,
            reasoning: '업종 평균 대비 저평가 해소',
          },
          {
            name: '리스크 할인',
            impact: -riskDiscount,
            reasoning: `부채비율 ${debtRatio}%, 거시 불확실성 고려`,
          },
        ],
        finalTarget,
        confidence: 3,
        methodology: methodology.name,
      };
    }
  }
}

// ==================== 목표일 산출 로직 ====================

/**
 * 현재 날짜 기준 최소 N개월 후의 예시 날짜 문자열 생성
 * AI 프롬프트에서 예시로 사용할 미래 날짜를 동적으로 생성
 */
export function getMinimumFutureDate(monthsAhead: number = 6): string {
  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + monthsAhead);
  
  const year = future.getFullYear();
  const month = future.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  
  // 분기 형식으로 반환
  return `${year}년 ${quarter}분기`;
}

/**
 * 캐릭터별 적절한 미래 날짜 예시 생성
 * 검증 로직보다 약간 더 먼 미래를 반환해서 안전마진 확보
 */
export function getExampleFutureDateForCharacter(character: CharacterType): string {
  const now = new Date();
  const year = now.getFullYear();
  
  switch (character) {
    case 'claude':
      // 7-9개월 후 분기 (보수적) - 검증(5개월)보다 2개월 여유
      const claudeFuture = new Date(now);
      claudeFuture.setMonth(claudeFuture.getMonth() + 7);
      const claudeQuarter = Math.ceil((claudeFuture.getMonth() + 1) / 3);
      return `${claudeFuture.getFullYear()}년 ${claudeQuarter}분기`;
      
    case 'gemini':
      // 14-24개월 후 (공격적) - 검증(10개월)보다 4개월 여유
      const geminiFuture = new Date(now);
      geminiFuture.setMonth(geminiFuture.getMonth() + 14);
      const geminiHalf = geminiFuture.getMonth() < 6 ? '상반기' : '하반기';
      return `${geminiFuture.getFullYear()}년 ${geminiHalf}`;
      
    case 'gpt':
      // 7-12개월 후 구체적 날짜 (균형) - 검증(5개월)보다 2개월 여유
      const gptFuture = new Date(now);
      gptFuture.setMonth(gptFuture.getMonth() + 7);
      return `${gptFuture.getFullYear()}-${String(gptFuture.getMonth() + 1).padStart(2, '0')}-30`;
  }
}

/**
 * 목표 날짜가 현실적인 미래인지 검증하고, 아니면 보정
 * 
 * 중요: AI가 반환한 날짜가 과거이거나 너무 가까운 미래면 무조건 보정
 */
export function validateAndCorrectTargetDate(targetDate: string | undefined, character: CharacterType): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 캐릭터별 최소 미래 개월 수 (약간 여유를 둠)
  const minMonths = character === 'gemini' ? 10 : 5; // 12→10, 6→5로 여유
  const minFutureDate = new Date(now);
  minFutureDate.setMonth(minFutureDate.getMonth() + minMonths);
  
  // 목표 날짜가 없으면 기본값 반환
  if (!targetDate || targetDate.trim() === '') {
    console.log(`[${character}] No target date provided, using default`);
    return getExampleFutureDateForCharacter(character);
  }
  
  // 날짜 파싱 시도
  const parsed = parseKoreanDate(targetDate);
  
  // 파싱 실패 시 기본값 반환
  if (!parsed) {
    console.log(`[${character}] Failed to parse target date: "${targetDate}", using default`);
    return getExampleFutureDateForCharacter(character);
  }
  
  // 과거이거나 현재보다 이전인 경우 기본값 반환
  if (parsed <= now) {
    console.log(`[${character}] Target date "${targetDate}" is in the past, using default`);
    return getExampleFutureDateForCharacter(character);
  }
  
  // 최소 미래 날짜보다 이전인 경우 기본값 반환
  if (parsed < minFutureDate) {
    console.log(`[${character}] Target date "${targetDate}" is too soon (min: ${minMonths} months), using default`);
    return getExampleFutureDateForCharacter(character);
  }
  
  // 검증 통과
  return targetDate;
}

/**
 * 한글 날짜 문자열 파싱 (예: "2026년 2분기", "2027년 상반기", "2026-06-30")
 * 다양한 형식을 지원하고, 년도만 있는 경우도 처리
 */
function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    const cleanStr = dateStr.trim();
    
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const date = new Date(cleanStr);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // YYYY/MM/DD 형식
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanStr)) {
      const date = new Date(cleanStr.replace(/\//g, '-'));
      return isNaN(date.getTime()) ? null : date;
    }
    
    // YYYY년 N분기 형식
    const quarterMatch = cleanStr.match(/(\d{4})년?\s*(\d)\s*분기/);
    if (quarterMatch) {
      const year = parseInt(quarterMatch[1]);
      const quarter = parseInt(quarterMatch[2]);
      if (quarter >= 1 && quarter <= 4) {
        return new Date(year, quarter * 3 - 1, 15); // 분기 마지막 달의 15일
      }
    }
    
    // YYYY년 상/하반기 형식
    const halfMatch = cleanStr.match(/(\d{4})년?\s*(상반기|하반기)/);
    if (halfMatch) {
      const year = parseInt(halfMatch[1]);
      const month = halfMatch[2] === '상반기' ? 6 : 12;
      return new Date(year, month - 1, 15);
    }
    
    // YYYY년 N월 형식 (예: 2026년 6월, 2026년 12월)
    const monthMatch = cleanStr.match(/(\d{4})년?\s*(\d{1,2})월/);
    if (monthMatch) {
      const year = parseInt(monthMatch[1]);
      const month = parseInt(monthMatch[2]);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 15);
      }
    }
    
    // H1/H2 YYYY 형식 (예: H2 2026)
    const h1h2Match = cleanStr.match(/H([12])\s*(\d{4})/i);
    if (h1h2Match) {
      const half = parseInt(h1h2Match[1]);
      const year = parseInt(h1h2Match[2]);
      return new Date(year, half === 1 ? 5 : 11, 15);
    }
    
    // Q1-Q4 YYYY 형식 (예: Q2 2026)
    const qMatch = cleanStr.match(/Q([1-4])\s*(\d{4})/i);
    if (qMatch) {
      const quarter = parseInt(qMatch[1]);
      const year = parseInt(qMatch[2]);
      return new Date(year, quarter * 3 - 1, 15);
    }
    
    // 년도만 있는 경우 (예: 2026년, 2026)
    const yearOnlyMatch = cleanStr.match(/^(\d{4})년?$/);
    if (yearOnlyMatch) {
      const year = parseInt(yearOnlyMatch[1]);
      return new Date(year, 5, 15); // 해당 년도 6월 중순
    }
    
    // 숫자 4자리가 포함된 경우 년도로 추정
    const anyYearMatch = cleanStr.match(/(\d{4})/);
    if (anyYearMatch) {
      const year = parseInt(anyYearMatch[1]);
      if (year >= 2024 && year <= 2030) {
        return new Date(year, 5, 15); // 해당 년도 6월 중순
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export interface TargetDateCalculation {
  targetDate: string;
  targetDateRaw: Date;
  catalystTimeline: {
    event: string;
    expectedDate: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  reasoning: string;
}

export function calculateTargetDate(
  character: CharacterType,
  currentDate: Date = new Date()
): TargetDateCalculation {
  const methodology = ANALYSIS_METHODOLOGIES[character];
  
  switch (character) {
    case 'claude': {
      // 다음 2-3분기 후 (실적 발표 기반)
      const monthsAhead = 6 + Math.floor(Math.random() * 3);  // 6-9개월
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() + monthsAhead);
      
      // 분기 말로 조정
      const quarter = Math.ceil((targetDate.getMonth() + 1) / 3);
      const quarterEnd = new Date(targetDate.getFullYear(), quarter * 3, 0);
      
      const nextQuarterEarnings = new Date(currentDate);
      nextQuarterEarnings.setMonth(nextQuarterEarnings.getMonth() + 3);
      
      return {
        targetDate: `${quarterEnd.getFullYear()}년 ${quarter}분기`,
        targetDateRaw: quarterEnd,
        catalystTimeline: [
          {
            event: '다음 분기 실적 발표',
            expectedDate: formatDate(nextQuarterEarnings),
            impact: 'high',
          },
          {
            event: '연간 실적 확정',
            expectedDate: `${currentDate.getFullYear() + 1}년 1분기`,
            impact: 'high',
          },
          {
            event: '밸류에이션 갭 해소',
            expectedDate: formatDate(quarterEnd),
            impact: 'medium',
          },
        ],
        reasoning: `실적 개선 확인 후 밸류에이션 정상화까지 ${monthsAhead}개월 소요 예상. ` +
          `다음 ${Math.ceil(monthsAhead / 3)}개 분기 실적이 핵심 촉매가 될 것.`,
      };
    }

    case 'gemini': {
      // 12-24개월 후 (성장 실현 기반)
      const monthsAhead = 12 + Math.floor(Math.random() * 12);  // 12-24개월
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() + monthsAhead);
      
      const halfYear = targetDate.getMonth() < 6 ? '상반기' : '하반기';
      
      return {
        targetDate: `${targetDate.getFullYear()}년 ${halfYear}`,
        targetDateRaw: targetDate,
        catalystTimeline: [
          {
            event: '신제품/신사업 출시',
            expectedDate: `${currentDate.getFullYear() + 1}년 상반기`,
            impact: 'high',
          },
          {
            event: '시장 점유율 확대 확인',
            expectedDate: `${currentDate.getFullYear() + 1}년`,
            impact: 'high',
          },
          {
            event: '매출 성장 가속화',
            expectedDate: formatDate(targetDate),
            impact: 'medium',
          },
        ],
        reasoning: `성장주 특성상 단기 실적보다 성장 스토리 실현이 중요. ` +
          `신사업 확대와 시장 점유율 증가가 본격화되는 ${monthsAhead}개월 후 목표 달성 예상.`,
      };
    }

    case 'gpt': {
      // 6-12개월 후 (리스크 해소 기반)
      const monthsAhead = 6 + Math.floor(Math.random() * 6);  // 6-12개월
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() + monthsAhead);
      
      // 월말로 조정
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      return {
        targetDate: `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`,
        targetDateRaw: monthEnd,
        catalystTimeline: [
          {
            event: '다음 FOMC 회의',
            expectedDate: getNextFOMCDate(currentDate),
            impact: 'high',
          },
          {
            event: '지정학적 리스크 모니터링',
            expectedDate: '상시',
            impact: 'medium',
          },
          {
            event: '거시경제 안정화',
            expectedDate: formatDate(monthEnd),
            impact: 'medium',
          },
        ],
        reasoning: `거시경제 불확실성 고려 시 ${monthsAhead}개월 내 리스크 해소 예상. ` +
          `보수적 목표가이므로 달성 가능성 높음.`,
      };
    }
  }
}

// ==================== 합의 도출 로직 ====================

export interface ConsensusResult {
  consensusPrice: number;
  consensusDate: string;
  agreementLevel: 'unanimous' | 'majority' | 'divided';
  convergenceLogic: string;
  weights: Record<CharacterType, number>;
  priceRange: {
    low: number;
    high: number;
    consensus: number;
  };
}

export function deriveConsensus(
  targets: Array<{
    character: CharacterType;
    targetPrice: number;
    targetDate: string;
    confidence: number;
  }>
): ConsensusResult {
  // 신뢰도 가중 평균
  const totalConfidence = targets.reduce((sum, t) => sum + t.confidence, 0);
  const weights: Record<CharacterType, number> = {} as Record<CharacterType, number>;
  
  targets.forEach(t => {
    weights[t.character] = t.confidence / totalConfidence;
  });
  
  // 가중 평균 목표가
  const weightedPrice = targets.reduce(
    (sum, t) => sum + t.targetPrice * weights[t.character],
    0
  );
  const consensusPrice = Math.round(weightedPrice / 100) * 100;
  
  // 가격 범위
  const prices = targets.map(t => t.targetPrice);
  const priceRange = {
    low: Math.min(...prices),
    high: Math.max(...prices),
    consensus: consensusPrice,
  };
  
  // 합의 수준 판단
  const priceSpread = (priceRange.high - priceRange.low) / consensusPrice;
  let agreementLevel: ConsensusResult['agreementLevel'];
  
  if (priceSpread < 0.1) {
    agreementLevel = 'unanimous';
  } else if (priceSpread < 0.2) {
    agreementLevel = 'majority';
  } else {
    agreementLevel = 'divided';
  }
  
  // 합의 도출 논리 설명
  let convergenceLogic: string;
  
  if (agreementLevel === 'unanimous') {
    convergenceLogic = `세 분석가 모두 ${consensusPrice.toLocaleString()}원 부근에서 의견이 수렴됨. ` +
      `펀더멘털(클로드), 성장성(제미), 리스크(테일러) 관점에서 모두 합리적인 가격대로 평가.`;
  } else if (agreementLevel === 'majority') {
    const highTarget = targets.find(t => t.targetPrice === priceRange.high);
    const lowTarget = targets.find(t => t.targetPrice === priceRange.low);
    convergenceLogic = `${highTarget?.character === 'gemini' ? '제미의 공격적 목표가' : '클로드의 분석'} ` +
      `(${priceRange.high.toLocaleString()}원)와 ` +
      `${lowTarget?.character === 'gpt' ? '테일러의 보수적 목표가' : '분석'} ` +
      `(${priceRange.low.toLocaleString()}원) 사이에서 가중 평균으로 합의점 도출.`;
  } else {
    convergenceLogic = `분석가 간 의견 차이가 큼. 성장 기대(제미)와 리스크 우려(테일러) 간 ` +
      `균형점을 찾아 ${consensusPrice.toLocaleString()}원으로 절충.`;
  }
  
  // 목표일은 중간값 사용
  const sortedDates = targets
    .map(t => new Date(t.targetDate.replace(/년|월|분기|상반기|하반기/g, '-').replace(/-$/, '')))
    .sort((a, b) => a.getTime() - b.getTime());
  
  const medianDate = sortedDates[Math.floor(sortedDates.length / 2)];
  const consensusDate = formatQuarter(medianDate);
  
  return {
    consensusPrice,
    consensusDate,
    agreementLevel,
    convergenceLogic,
    weights,
    priceRange,
  };
}

// ==================== 유틸리티 함수 ====================

function formatDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatQuarter(date: Date): string {
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}년 ${quarter}분기`;
}

function getNextFOMCDate(currentDate: Date): string {
  // 간단한 FOMC 일정 (실제로는 캘린더 데이터 필요)
  const month = currentDate.getMonth();
  const nextFOMCMonth = month + (month % 2 === 0 ? 1 : 2);
  return `${currentDate.getFullYear()}년 ${nextFOMCMonth + 1}월`;
}

// ==================== 프롬프트용 분석 컨텍스트 ====================

export function getAnalysisContext(
  character: CharacterType,
  currentPrice: number,
  financials?: {
    per?: number;
    pbr?: number;
    roe?: number;
    growthRate?: number;
    debtRatio?: number;
  }
): string {
  const methodology = ANALYSIS_METHODOLOGIES[character];
  const targetCalc = calculateTargetPrice(character, currentPrice, financials || {});
  const dateCalc = calculateTargetDate(character);
  
  return `
## 📊 분석 방법론: ${methodology.name}
${methodology.description}

### 핵심 지표
${methodology.primaryMetrics.map(m => `- ${m}`).join('\n')}

### 목표가 산출 로직
${methodology.targetPriceFormula}

### 목표 달성 시점 산출 로직
${methodology.targetDateLogic}

### 촉매 요인 (Catalysts)
${methodology.catalysts.map(c => `✅ ${c}`).join('\n')}

### 리스크 요인
${methodology.riskFactors.map(r => `⚠️ ${r}`).join('\n')}

---

💡 **분석 가이드:**
- 위 방법론에 따라 목표가와 목표 달성 시점을 도출하세요
- 목표가 근거(priceRationale)에 계산 로직을 포함하세요
- targetDate는 구체적 근거와 함께 제시하세요
`;
}





