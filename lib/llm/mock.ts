import type { LLMAdapter, LLMContext, LLMResponse, CharacterType, CharacterPersona } from './types';
import { CHARACTER_PERSONAS } from './types';
import { DRAMATIC_TEMPLATES } from './debate-prompts';
import { CHARACTER_BACKSTORIES } from './character-worldview';

// Seeded random for reproducible results
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// 리스크 템플릿 (캐릭터 성격 반영)
const RISK_TEMPLATES: Record<CharacterType, string[][]> = {
  claude: [
    ['밸류에이션 부담 (현 PER 기준)', '실적 성장 둔화 시 주가 조정 가능'],
    ['업종 내 경쟁 심화', '원자재/환율 변동 리스크'],
    ['글로벌 경기 둔화 영향', '수요 전망 불확실성'],
  ],
  gemini: [
    ['기술 혁신 속도 따라잡기 실패 가능성', '신사업 수익화 지연'],
    ['경쟁사의 추격 (특히 중국)', '규제 환경 변화 리스크'],
    ['시장 기대치 관리 실패', 'AI 투자 ROI 불확실'],
  ],
  gpt: [
    ['금리 인상 장기화 시 밸류에이션 압박', '경기 침체 진입 시 수요 급감', '지정학적 리스크 확대'],
    ['환율 변동성 확대', '글로벌 공급망 재편 비용', '인플레이션 재발 가능성'],
    ['정책 불확실성 (선거, 규제)', '유동성 축소 지속', '신용 경색 우려'],
  ],
};

// 근거 자료 템플릿
const SOURCE_TEMPLATES: Record<CharacterType, string[][]> = {
  claude: [
    ['분기 실적 보고서 (IR)', '재무제표 심층 분석'],
    ['업종 밸류에이션 비교', 'DCF 모델링'],
    ['경쟁사 수익성 지표 비교', '현금흐름 분석'],
  ],
  gemini: [
    ['기술 트렌드 리포트 (Gartner)', '산업 전망 (IDC)'],
    ['시장 점유율 분석', '성장률 기반 밸류에이션'],
    ['특허 출원 동향', 'VC 투자 트렌드'],
  ],
  gpt: [
    ['연준 FOMC 의사록', '글로벌 금리 전망'],
    ['환율 분석 (Bloomberg)', '거시경제 지표 종합'],
    ['리스크 시나리오 분석', '역사적 유사 국면 비교'],
  ],
};

// 목표가 배수 (캐릭터별)
const TARGET_MULTIPLIERS: Record<CharacterType, { min: number; max: number }> = {
  claude: { min: 1.10, max: 1.20 }, // 10-20% (균형)
  gemini: { min: 1.25, max: 1.45 }, // 25-45% (공격적)
  gpt: { min: 1.05, max: 1.15 }, // 5-15% (보수적)
};

// 목표 기간 (월)
const TARGET_DATE_RANGES: Record<CharacterType, { min: number; max: number }> = {
  claude: { min: 3, max: 6 },
  gemini: { min: 6, max: 12 },
  gpt: { min: 1, max: 3 },
};

// 목표가 근거 (캐릭터별 스타일)
const PRICE_RATIONALES: Record<CharacterType, string[]> = {
  claude: [
    '실적 개선과 밸류에이션 정상화를 반영한 목표가입니다. 숫자는 거짓말하지 않습니다.',
    '펀더멘털 분석 기반 적정 가치입니다. 감정이 아닌 데이터로 산출했습니다.',
    '업종 평균 PER과 예상 EPS 성장률을 적용한 목표가입니다.',
  ],
  gemini: [
    '성장 모멘텀을 최대한 반영했습니다. 보수적인 분들은 놀라시겠지만, 이게 현실이에요.',
    '신사업 기회와 TAM 확대를 고려한 공격적 목표가입니다. Fight me.',
    '혁신 프리미엄을 반영했습니다. 테슬라 때도 사람들이 미쳤다고 했었죠.',
  ],
  gpt: [
    '거시경제 리스크를 반영한 보수적 목표가입니다. 살아남아야 다음이 있어.',
    '변동성 확대 가능성을 고려해 안전마진을 적용했습니다.',
    '40년 경험에 기반한 현실적 목표가입니다.',
  ],
};

// 변수 치환 함수
function replaceVariables(
  template: string, 
  context: LLMContext, 
  random: () => number
): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  
  // 랜덤 값 생성
  const per = (10 + random() * 20).toFixed(1);
  const pbr = (0.8 + random() * 2).toFixed(1);
  const roe = (8 + random() * 15).toFixed(1);
  const roic = (6 + random() * 12).toFixed(1);
  const debtRatio = (30 + random() * 70).toFixed(0);
  const cash = (1 + random() * 50).toFixed(1);
  const netIncome = (0.5 + random() * 10).toFixed(1);
  const rate = '4.25-4.50';
  const exchange = (1380 + random() * 50).toFixed(0);
  
  // 목표가는 context에서 가져옴
  const targetPrice = context.currentPrice ? 
    Math.round(context.currentPrice * (1.1 + random() * 0.3) / 100) * 100 : 80000;
  
  // 목표 날짜
  const monthsAhead = 3 + Math.floor(random() * 6);
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthsAhead);
  const targetDateStr = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월`;
  
  return template
    .replace(/{name}/g, context.symbolName || '종목')
    .replace(/{sector}/g, context.sector || '기타')
    .replace(/{year}/g, String(year))
    .replace(/{quarter}/g, String(quarter))
    .replace(/{per}/g, per)
    .replace(/{pbr}/g, pbr)
    .replace(/{roe}/g, roe)
    .replace(/{roic}/g, roic)
    .replace(/{debtRatio}/g, debtRatio)
    .replace(/{cash}/g, cash)
    .replace(/{netIncome}/g, netIncome)
    .replace(/{rate}/g, rate)
    .replace(/{exchange}/g, exchange)
    .replace(/{targetPrice}/g, targetPrice.toLocaleString())
    .replace(/{targetDate}/g, targetDateStr);
}

// 이전 메시지 기반 동적 반응 생성
function generateDynamicReaction(
  character: CharacterType,
  previousMessages: LLMContext['previousMessages'],
  random: () => number
): string {
  if (!previousMessages || previousMessages.length === 0) return '';
  
  const backstory = CHARACTER_BACKSTORIES[character];
  const reactions: string[] = [];
  
  for (const msg of previousMessages) {
    if (msg.character === character) continue;
    
    const otherName = CHARACTER_BACKSTORIES[msg.character].nameKo;
    const content = msg.content.toLowerCase();
    
    // 캐릭터별 특정 트리거에 반응
    if (character === 'claude') {
      if (msg.character === 'gemini' && (content.includes('boring') || content.includes('재미없'))) {
        reactions.push(`*${otherName}의 "boring" 발언에* ...네, 저는 boring합니다. 하지만 boring한 분석이 살아남습니다.`);
      }
      if (msg.character === 'gpt' && content.includes('2008')) {
        reactions.push(`*테일러 선배를 향해* ...그 얘긴 지금 중요한 게 아닙니다.`);
      }
    }
    
    if (character === 'gemini') {
      if (msg.character === 'claude' && (content.includes('per') || content.includes('밸류'))) {
        reactions.push(`*클로드 선배를 향해 웃으며* 또 PER 얘기요? 테슬라 때도 그랬잖아요~`);
      }
      if (content.includes('ftx')) {
        reactions.push(`...그건 그렇고요. *살짝 불편한 표정*`);
      }
    }
    
    if (character === 'gpt') {
      if (msg.character === 'gemini' && content.includes('꼰대')) {
        reactions.push(`*웃으며* 제미, 꼰대 소리는 40년간 많이 들었어. 근데 그 꼰대가 아직 살아있잖아.`);
      }
      if (msg.character === 'claude' && content.includes('배신')) {
        reactions.push(`*잠시 침묵* ...클로드, 언젠간 얘기해야겠지. 지금은 아니지만.`);
      }
    }
  }
  
  return reactions.length > 0 ? reactions[Math.floor(random() * reactions.length)] + '\n\n' : '';
}

export class MockLLMAdapter implements LLMAdapter {
  characterType: CharacterType;

  constructor(characterType: CharacterType) {
    this.characterType = characterType;
  }

  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const symbol = context.symbol || '005930';
    const symbolName = context.symbolName || '종목';
    const sector = context.sector || '기타';
    const round = context.round || 1;
    const currentPrice = context.currentPrice || 70000;
    const previousMessages = context.previousMessages || [];
    
    const random = seededRandom(`${symbol}-${round}-${this.characterType}-${Date.now()}`);
    
    // 라운드에 해당하는 템플릿 선택
    const roundKey = Math.min(round, 4);
    const templates = DRAMATIC_TEMPLATES[this.characterType][roundKey] || DRAMATIC_TEMPLATES[this.characterType][1];
    const templateIndex = Math.floor(random() * templates.length);
    let template = templates[templateIndex];
    
    // 변수 치환
    let content = replaceVariables(template, context, random);
    
    // 이전 메시지가 있으면 동적 반응 추가
    if (round > 1 && previousMessages.length > 0) {
      const dynamicReaction = generateDynamicReaction(this.characterType, previousMessages, random);
      if (dynamicReaction) {
        content = dynamicReaction + content;
      }
    }

    // 리스크 선택
    const riskIndex = Math.floor(random() * RISK_TEMPLATES[this.characterType].length);
    const risks = RISK_TEMPLATES[this.characterType][riskIndex];

    // 근거 자료 선택
    const sourceIndex = Math.floor(random() * SOURCE_TEMPLATES[this.characterType].length);
    const sources = SOURCE_TEMPLATES[this.characterType][sourceIndex];

    // 점수 계산 (캐릭터 성향 반영)
    const persona = CHARACTER_PERSONAS[this.characterType];
    let baseScore = 3.5 + random() * 1.5;
    if (persona.riskBias === 'conservative') {
      baseScore -= 0.5;
    } else if (persona.riskBias === 'aggressive') {
      baseScore += 0.5;
    }
    const score = Math.min(5, Math.max(1, Math.round(baseScore * 10) / 10));

    // 목표가 계산
    const targetMultiplier = TARGET_MULTIPLIERS[this.characterType];
    const multiplier = targetMultiplier.min + random() * (targetMultiplier.max - targetMultiplier.min);
    
    // 이전 목표가가 있으면 조정
    const previousTargets = context.previousTargets || [];
    const myPreviousTarget = previousTargets.find(t => t.character === this.characterType);
    
    let targetPrice: number;
    if (myPreviousTarget && round > 1) {
      // 토론 기반 소폭 조정 (-3% ~ +3%)
      const adjustment = (random() - 0.5) * 0.06;
      targetPrice = Math.round(myPreviousTarget.targetPrice * (1 + adjustment) / 100) * 100;
    } else {
      targetPrice = Math.round(currentPrice * multiplier / 100) * 100;
    }
    
    // 목표 날짜
    const dateRange = TARGET_DATE_RANGES[this.characterType];
    const monthsAhead = Math.floor(dateRange.min + random() * (dateRange.max - dateRange.min));
    const targetDateObj = new Date();
    targetDateObj.setMonth(targetDateObj.getMonth() + monthsAhead);
    const targetDate = `${targetDateObj.getFullYear()}년 ${targetDateObj.getMonth() + 1}월`;
    
    // 목표가 근거
    const rationaleIndex = Math.floor(random() * PRICE_RATIONALES[this.characterType].length);
    const priceRationale = PRICE_RATIONALES[this.characterType][rationaleIndex];

    // 약간의 지연으로 실제 API 호출처럼 보이게
    await new Promise(resolve => setTimeout(resolve, 500 + random() * 1000));

    return {
      content,
      risks,
      sources,
      score: Math.round(score),
      targetPrice,
      targetDate,
      priceRationale,
    };
  }
}
