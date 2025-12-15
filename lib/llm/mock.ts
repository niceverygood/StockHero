import type { LLMAdapter, LLMResponse, LLMContext, CharacterType } from './types';
import { CHARACTER_PERSONAS } from './types';

// Seeded random for reproducibility
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

const ANALYSIS_TEMPLATES: Record<CharacterType, Record<number, string[]>> = {
  CLAUDE: {
    1: [
      '{name}의 최근 분기 실적을 분석해 보겠습니다. 매출은 전년 동기 대비 성장세를 유지하고 있으며, 영업이익률도 안정적입니다. 재무 건전성 측면에서 부채비율이 양호하고, 현금 흐름도 긍정적입니다. 다만, 글로벌 경기 둔화에 따른 수요 감소 가능성은 모니터링이 필요한 부분입니다.',
      '{name}의 재무제표를 살펴보면, 자기자본이익률(ROE)이 업계 평균을 상회하고 있습니다. 매출원가율 개선으로 수익성도 향상되었습니다. {sector} 업종 내에서 경쟁력 있는 포지션을 유지하고 있으나, 원자재 가격 변동에 대한 민감도는 주시할 필요가 있습니다.',
    ],
    2: [
      '추가적으로 {name}의 사업 포트폴리오를 살펴보면, 핵심 사업부의 시장 점유율이 견고합니다. 경쟁사 대비 기술력과 브랜드 가치가 높게 평가됩니다. 밸류에이션 측면에서도 동종 업계 평균 대비 적정 수준으로 판단됩니다.',
      '{name}의 밸류에이션을 점검하면, 현재 PER은 업종 평균 수준이며 PBR은 과거 밴드 하단에 위치해 있습니다. 배당 정책도 안정적이어서 장기 투자자에게 매력적인 요소가 있습니다. 다만 단기 실적 변동성은 고려해야 합니다.',
    ],
  },
  GEMINI: {
    1: [
      '트렌드 관점에서 {name}을 보면, 신사업 확장이 주목할 만합니다. 특히 AI 관련 투자 확대와 신기술 도입이 중장기 성장 동력이 될 수 있습니다. 글로벌 시장에서의 경쟁력도 개선되고 있어 긍정적입니다. 단기적으로는 투자 비용 증가로 인한 수익성 압박이 있을 수 있으나, 이는 미래를 위한 선투자로 볼 수 있습니다.',
      '{sector} 업종의 성장 트렌드를 고려할 때, {name}은 혁신 역량 면에서 두각을 나타내고 있습니다. R&D 투자 비중이 높고, 신규 특허 출원도 활발합니다. 시장 변화에 대한 대응 속도도 빠른 편입니다.',
    ],
    2: [
      '혁신 지표를 추가로 살펴보면, {name}의 R&D 투자 비중이 업계 상위권입니다. 특허 출원 건수와 기술 경쟁력 지표도 양호합니다. 신성장 분야에서의 포지셔닝이 향후 기업 가치에 긍정적으로 반영될 것으로 예상됩니다.',
      '성장 모멘텀 측면에서, {name}은 신규 시장 진출과 사업 다각화를 적극 추진하고 있습니다. 디지털 전환 투자도 순항 중입니다. 중장기적 관점에서 성장 잠재력은 충분하다고 판단됩니다.',
    ],
  },
  GPT: {
    1: [
      '거시경제 관점에서 정리해 보겠습니다. 현재 금리 환경과 글로벌 경기 흐름을 고려할 때, {sector} 업종 전반에 대한 시장 심리는 조심스러운 편입니다. {name}은 동종 업계 내에서 상대적으로 안정적인 포지션을 가지고 있습니다. 대외 불확실성에 대한 대비는 필요하나, 펀더멘털은 양호한 것으로 평가됩니다.',
      '매크로 리스크를 점검하면, 글로벌 금리 인상 사이클과 경기 둔화 우려가 {sector} 업종에 부담으로 작용하고 있습니다. {name}은 재무 안정성 면에서 충격 흡수 능력이 있으나, 외부 변수에 대한 지속적인 모니터링이 필요합니다.',
    ],
    2: [
      '종합 의견으로 정리하면, 세 분석가 모두 {name}에 대해 기본적으로 긍정적인 시각을 가지고 있습니다. 실적 안정성, 기술 혁신 잠재력, 거시 환경 대응력을 종합적으로 고려할 때, 중장기적 관점에서 관심을 가져볼 만한 종목으로 판단됩니다. 다만, 단기 변동성과 대외 리스크는 지속적인 모니터링이 필요합니다.',
      '최종 정리하면, {name}은 {sector} 업종 내 경쟁력 있는 기업으로 평가됩니다. 실적 기반의 안정성과 성장 잠재력을 모두 갖추고 있습니다. 매크로 불확실성은 리스크 요인이나, 장기 투자 관점에서 관심을 둘 만한 종목입니다. 투자 판단은 개인의 책임하에 이루어져야 합니다.',
    ],
  },
};

const RISK_TEMPLATES: Record<CharacterType, string[]> = {
  CLAUDE: [
    '글로벌 경기 둔화, 환율 변동, 원자재 가격 상승',
    '수요 감소 우려, 경쟁 심화, 마진 압박 가능성',
    '실적 변동성, 업황 사이클, 밸류에이션 부담',
  ],
  GEMINI: [
    '신사업 투자 비용 증가, 기술 경쟁 심화',
    'R&D 비용 부담, 신규 시장 진입 불확실성',
    '혁신 실패 리스크, 시장 변화 대응 지연 가능성',
  ],
  GPT: [
    '금리 변동, 지정학적 리스크, 글로벌 수요 변화',
    '매크로 불확실성, 정책 변화 리스크, 경기 침체 우려',
    '시스템 리스크, 외부 충격 가능성, 포트폴리오 집중 위험',
  ],
};

const SOURCE_TEMPLATES: Record<CharacterType, string[][]> = {
  CLAUDE: [
    ['분기보고서', '산업분석리포트'],
    ['재무제표', '애널리스트 컨센서스'],
    ['사업보고서', '밸류에이션 리포트'],
  ],
  GEMINI: [
    ['기술동향보고서', '시장분석'],
    ['R&D 지표', '특허 분석'],
    ['혁신지수 리포트', '트렌드 분석'],
  ],
  GPT: [
    ['매크로리포트', '업종분석', '리스크분석'],
    ['글로벌 경제전망', '금리 분석'],
    ['지정학적 리스크 보고서', '시나리오 분석'],
  ],
};

export class MockLLMAdapter implements LLMAdapter {
  name: string;
  private characterType: CharacterType;

  constructor(characterType: CharacterType) {
    this.characterType = characterType;
    this.name = `Mock${characterType}`;
  }

  async generateStructured(prompt: string, context: LLMContext): Promise<LLMResponse> {
    const random = seededRandom(`${context.symbol}-${context.round}-${this.characterType}`);
    
    // Normalize round to 1 or 2
    const roundKey = context.round <= 1 ? 1 : 2;
    const characterTemplates = ANALYSIS_TEMPLATES[this.characterType];
    const templates = characterTemplates[roundKey] || characterTemplates[1];
    const templateIndex = Math.floor(random() * templates.length);
    const template = templates[templateIndex];
    
    const content = template
      .replace(/{name}/g, context.symbolName || '종목')
      .replace(/{sector}/g, context.sector || '기타');

    const riskIndex = Math.floor(random() * RISK_TEMPLATES[this.characterType].length);
    const risks = RISK_TEMPLATES[this.characterType][riskIndex];

    const sourceIndex = Math.floor(random() * SOURCE_TEMPLATES[this.characterType].length);
    const sources = SOURCE_TEMPLATES[this.characterType][sourceIndex];

    // Score varies by character bias
    const persona = CHARACTER_PERSONAS[this.characterType];
    let baseScore = 3.5 + random() * 1.5; // 3.5 to 5.0
    if (persona.riskBias === 'conservative') {
      baseScore -= 0.3;
    } else if (persona.riskBias === 'aggressive') {
      baseScore += 0.2;
    }
    const score = Math.min(5, Math.max(1, Math.round(baseScore * 10) / 10));

    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 100 + random() * 200));

    return {
      content,
      risks,
      sources,
      score: Math.round(score),
    };
  }
}

export function createMockAdapter(characterType: CharacterType): LLMAdapter {
  return new MockLLMAdapter(characterType);
}

