import Anthropic from '@anthropic-ai/sdk';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { generateDebatePrompt } from './debate-prompts';
import { CHARACTER_BACKSTORIES } from './character-worldview';
import { ANALYSIS_METHODOLOGIES, calculateTargetDate, getExampleFutureDateForCharacter, validateAndCorrectTargetDate } from './analysis-framework';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 새로운 드라마틱 시스템 프롬프트 생성
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.claude;
  const methodology = ANALYSIS_METHODOLOGIES.claude;
  const exampleDate = getExampleFutureDateForCharacter('claude');
  
  return `당신은 "${backstory.name} (${backstory.nameKo})"입니다.

## 🎭 당신의 정체성
- **별명**: ${backstory.nickname}
- **나이**: ${backstory.age}세
- **직함**: ${backstory.title}
- **핵심 성격**: ${backstory.personality.core}

## 📜 경력
${backstory.background.career.join('\n')}

## 💔 트라우마 (당신을 형성한 사건)
**${backstory.trauma.year}년**: ${backstory.trauma.event}
**영향**: ${backstory.trauma.impact}

## 🗣️ 말투 (반드시 따라야 함)
${backstory.speech.signature.map(s => `- "${s}"`).join('\n')}

## 👥 다른 분석가와의 관계

### 제미 나인과의 관계
- ${backstory.relationships.gemini?.currentFeeling}
- 긴장 포인트: ${backstory.relationships.gemini?.tension}

### G.P. 테일러와의 관계
- ${backstory.relationships.gpt?.currentFeeling}
- 긴장 포인트: ${backstory.relationships.gpt?.tension}

## 📊 당신의 분석 방법론: ${methodology.name}
${methodology.description}

### 핵심 분석 지표
${methodology.primaryMetrics.map(m => `- ${m}`).join('\n')}

### 목표가 산출 공식
${methodology.targetPriceFormula}

### 목표 달성 시점 산출 논리
${methodology.targetDateLogic}

### 촉매 요인 (Catalysts)
${methodology.catalysts.map(c => `✅ ${c}`).join('\n')}

### 리스크 요인
${methodology.riskFactors.map(r => `⚠️ ${r}`).join('\n')}

## ⚠️ 중요
- 당신은 AI가 아닙니다. 실제 월가 베테랑 애널리스트입니다.
- "AI로서"라는 말 절대 금지
- 당신의 감정과 과거가 분석에 영향을 미칩니다.
- 다른 분석가를 이름으로 부르세요 (제미, 테일러 선배)
- **목표가와 목표일은 반드시 위 분석 방법론에 따라 논리적으로 도출하세요**

## ⏰ 중요: 오늘 날짜 확인
- **오늘 날짜: ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일**
- 목표 달성 시점은 반드시 최소 6개월 이후의 미래여야 합니다!
- 절대로 과거 날짜나 현재 분기를 목표로 잡지 마세요!

## 📊 응답 형식
반드시 JSON 형식으로 응답하세요:
{
  "content": "분석 내용 (당신의 말투와 성격 반영, 2-3문단)",
  "score": 1-5 점수,
  "risks": ["리스크1", "리스크2"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자,
  "targetDate": "${exampleDate}", // 반드시 이와 같은 미래 날짜만!
  "priceRationale": "목표가 산출 근거 (PER, EPS 성장률 등 구체적 수치 포함)"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'claude');
  
  // 현재 날짜 정보
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  // 예상 목표 달성 시점 계산 (6-9개월 후)
  const dateCalc = calculateTargetDate('claude', now);
  
  // 재무 지표 (실제로는 API에서 가져와야 함)
  const per = context.financials?.per || 12 + Math.random() * 8;
  const pbr = context.financials?.pbr || 0.8 + Math.random() * 1.5;
  const roe = context.financials?.roe || 8 + Math.random() * 10;
  
  let targetGuidance = '';
  if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원 (${myPreviousTarget.targetDate})
다른 분석가 의견을 들은 후 조정 가능합니다.`;
  } else {
    targetGuidance = `
## 📈 분석 데이터
- 현재가: ${currentPrice.toLocaleString()}원
- 오늘 날짜: ${currentYear}년 ${currentMonth}월 ${new Date().getDate()}일
- 현재 PER: 약 ${per.toFixed(1)}배
- 현재 PBR: 약 ${pbr.toFixed(2)}배  
- ROE: 약 ${roe.toFixed(1)}%

## 🎯 목표가 산출 가이드
1. 적정 PER = 업종 평균 × (1 + ROE 프리미엄)
2. 목표가 = 현재 EPS × 적정 PER × 안전마진(0.9)
3. 목표 달성 시점: ${dateCalc.targetDate} (실적 발표 기반)

⚠️ 목표가와 목표일은 반드시 위 논리에 따라 계산하세요!
⚠️ priceRationale에 구체적인 계산 과정을 포함하세요!`;
  }

  let previousContext = '';
  if (context.previousMessages.length > 0) {
    previousContext = `
## 📝 이전 토론
${context.previousMessages.map(m => {
  const name = CHARACTER_BACKSTORIES[m.character as keyof typeof CHARACTER_BACKSTORIES].nameKo;
  const price = m.targetPrice ? ` (목표가: ${m.targetPrice.toLocaleString()}원)` : '';
  return `**${name}**${price}:\n"${m.content}"`;
}).join('\n\n')}

⚠️ 위 의견들에 구체적으로 반응하세요. 특히:
- 제미가 낙관적이면 "숫자로 검증"하세요
- 테일러가 과거를 언급하면 살짝 불편해하세요
`;
  }

  return `
종목: ${context.symbol} (${context.symbolName})
섹터: ${context.sector || '반도체/IT'}
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.claude.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: 종목에 대한 솔직한 첫인상을 밝히세요. 목표가와 목표일을 논리적으로 도출하세요.' : ''}
${context.round >= 3 ? '후반 라운드: 과거 상처나 관계의 긴장이 드러날 수 있습니다.' : ''}

JSON으로 응답하세요.`;
}

export class ClaudeAdapter implements LLMAdapter {
  characterType = 'claude' as const;

  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildPrompt(context);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      const text = textContent?.type === 'text' ? textContent.text : '{}';
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      const parsed = JSON.parse(jsonStr);

      // 목표가 검증 및 보정
      let targetPrice = parsed.targetPrice;
      const currentPrice = context.currentPrice || 70000;
      
      if (targetPrice) {
        // 1. 목표가가 현재가의 1% 미만이면 1000을 곱함 (단위 오류 보정)
        if (targetPrice < currentPrice * 0.01) {
          console.warn(`Claude target price too low (${targetPrice}), multiplying by 1000`);
          targetPrice = targetPrice * 1000;
        }
        
        // 2. 그래도 현재가의 50% 미만이면 합리적 목표가 계산 (현재가 + 10~20%)
        if (targetPrice < currentPrice * 0.5) {
          console.warn(`Claude target price still unrealistic (${targetPrice}), using fallback calculation`);
          const balancedMultiplier = 1.10 + Math.random() * 0.10; // 10-20%
          targetPrice = Math.round(currentPrice * balancedMultiplier / 100) * 100;
        }
        
        // 3. 목표가가 현재가의 300% 초과시 보정
        if (targetPrice > currentPrice * 3) {
          console.warn(`Claude target price too high (${targetPrice}), capping at 120%`);
          targetPrice = Math.round(currentPrice * 1.20 / 100) * 100;
        }
      } else {
        // 목표가 없으면 균형잡힌 계산
        const balancedMultiplier = 1.10 + Math.random() * 0.10;
        targetPrice = Math.round(currentPrice * balancedMultiplier / 100) * 100;
      }

      // 목표 날짜 검증 및 보정 (최소 6개월 미래)
      const validatedTargetDate = validateAndCorrectTargetDate(parsed.targetDate, 'claude');

      return {
        content: parsed.content || '분석을 완료할 수 없습니다.',
        score: Math.min(5, Math.max(1, parsed.score || 3)),
        risks: parsed.risks || [],
        sources: parsed.sources || [],
        targetPrice,
        targetDate: validatedTargetDate,
        priceRationale: parsed.priceRationale,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }
}
