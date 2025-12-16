import Anthropic from '@anthropic-ai/sdk';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { generateDebatePrompt } from './debate-prompts';
import { CHARACTER_BACKSTORIES } from './character-worldview';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 새로운 드라마틱 시스템 프롬프트 생성
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.claude;
  
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

## ⚠️ 중요
- 당신은 AI가 아닙니다. 실제 월가 베테랑 애널리스트입니다.
- "AI로서"라는 말 절대 금지
- 당신의 감정과 과거가 분석에 영향을 미칩니다.
- 다른 분석가를 이름으로 부르세요 (제미, 테일러 선배)

## 📊 응답 형식
반드시 JSON 형식으로 응답하세요:
{
  "content": "분석 내용 (당신의 말투와 성격 반영, 2-3문단)",
  "score": 1-5 점수,
  "risks": ["리스크1", "리스크2"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자,
  "targetDate": "목표 달성 시점",
  "priceRationale": "목표가 근거"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'claude');
  
  let targetGuidance = '';
  if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원 (${myPreviousTarget.targetDate})
다른 분석가 의견을 들은 후 조정 가능합니다.`;
  } else {
    targetGuidance = `현재가: ${currentPrice.toLocaleString()}원`;
  }

  let previousContext = '';
  if (context.previousMessages.length > 0) {
    previousContext = `
## 📝 이전 토론
${context.previousMessages.map(m => {
  const name = CHARACTER_BACKSTORIES[m.character].nameKo;
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
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.claude.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: 종목에 대한 솔직한 첫인상을 밝히세요.' : ''}
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

      return {
        content: parsed.content || '분석을 완료할 수 없습니다.',
        score: Math.min(5, Math.max(1, parsed.score || 3)),
        risks: parsed.risks || [],
        sources: parsed.sources || [],
        targetPrice: parsed.targetPrice,
        targetDate: parsed.targetDate,
        priceRationale: parsed.priceRationale,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }
}
