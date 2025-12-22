// Compliance filter for investment content

// Prohibited phrases that suggest direct investment advice
const PROHIBITED_PATTERNS = [
  /무조건\s*(?:사|매수|매도)/gi,
  /지금\s*(?:당장\s*)?(?:사|매수|매도)/gi,
  /전재산/gi,
  /올인/gi,
  /(?:100|백)\s*%\s*확실/gi,
  /(?:반드시|꼭)\s*(?:오|상승|수익)/gi,
  /(?:수익|이익)\s*보장/gi,
  /절대\s*(?:손실|손해)\s*없/gi,
  /(?:대박|폭등|급등)\s*(?:예정|확실)/gi,
  /놓치면\s*(?:후회|안됨|큰일)/gi,
  /(?:빨리|어서)\s*(?:사|매수)/gi,
  /마지막\s*기회/gi,
  /(?:투자|매수)\s*(?:하세요|해라|해야)/gi,
];

// Replacement phrases that soften the language
const SOFTENING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/확실히\s*(?:오|상승)/gi, '상승 가능성이 있을 수 있습니다'],
  [/(?:반드시|꼭)\s*(?:오|상승)/gi, '긍정적 요인이 있습니다'],
  [/(?:사야|매수해야)\s*(?:합니다|한다)/gi, '관심을 가져볼 수 있습니다'],
  [/(?:팔아야|매도해야)\s*(?:합니다|한다)/gi, '포지션 점검이 필요할 수 있습니다'],
  [/강력\s*추천/gi, '긍정적 시각'],
  [/매수\s*추천/gi, '관심 종목'],
  [/매도\s*추천/gi, '리스크 주의'],
];

// Standard disclaimer to append
const STANDARD_DISCLAIMER = '본 내용은 투자 참고용 정보이며, 투자 판단의 책임은 본인에게 있습니다.';

export interface ComplianceResult {
  isCompliant: boolean;
  originalText: string;
  filteredText: string;
  violations: string[];
  warnings: string[];
}

export function checkCompliance(text: string): ComplianceResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  let filteredText = text;

  // Check for prohibited patterns
  for (const pattern of PROHIBITED_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push(`금지 표현 감지: "${matches[0]}"`);
      filteredText = filteredText.replace(pattern, '[내용 수정됨]');
    }
  }

  // Apply softening replacements
  for (const [pattern, replacement] of SOFTENING_REPLACEMENTS) {
    if (pattern.test(filteredText)) {
      warnings.push(`표현 완화: ${pattern.source}`);
      filteredText = filteredText.replace(pattern, replacement);
    }
  }

  // Check for missing risk mentions in longer content
  if (text.length > 200 && !/리스크|위험|주의|유의/i.test(text)) {
    warnings.push('리스크 언급 없음 - 리스크 요인 추가 권장');
  }

  return {
    isCompliant: violations.length === 0,
    originalText: text,
    filteredText,
    violations,
    warnings,
  };
}

export function sanitizeContent(text: string): string {
  const result = checkCompliance(text);
  return result.filteredText;
}

export function addDisclaimer(text: string, position: 'start' | 'end' = 'end'): string {
  if (text.includes(STANDARD_DISCLAIMER)) {
    return text;
  }

  if (position === 'start') {
    return `[${STANDARD_DISCLAIMER}]\n\n${text}`;
  }
  return `${text}\n\n[${STANDARD_DISCLAIMER}]`;
}

export function validateLLMOutput(response: {
  content: string;
  risks?: string;
  sources?: string[];
}): {
  isValid: boolean;
  sanitizedContent: string;
  issues: string[];
} {
  const issues: string[] = [];
  let sanitizedContent = response.content;

  // Check compliance
  const complianceResult = checkCompliance(response.content);
  if (!complianceResult.isCompliant) {
    issues.push(...complianceResult.violations);
    sanitizedContent = complianceResult.filteredText;
  }

  // Check if risks are mentioned
  if (!response.risks || response.risks.trim().length === 0) {
    issues.push('리스크 요인 누락');
  }

  // Check if sources are provided
  if (!response.sources || response.sources.length === 0) {
    issues.push('데이터 출처 누락');
  }

  return {
    isValid: issues.length === 0,
    sanitizedContent,
    issues,
  };
}

// Generate compliant analysis framework
export function generateComplianceGuidelines(): string {
  return `
분석 작성 시 준수 사항:
1. 직접적인 매수/매도 권유 금지
2. 수익 보장 또는 확실한 상승 표현 금지
3. 모든 분석에 리스크 요인 명시
4. 데이터 출처 명시
5. 투자 판단 책임은 본인에게 있음을 명시
6. 과거 실적이 미래 수익을 보장하지 않음을 인지
  `.trim();
}





