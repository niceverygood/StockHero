import OpenAI from 'openai';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { CHARACTER_BACKSTORIES } from './character-worldview';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// G.P. 테일러의 드라마틱 시스템 프롬프트
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.gpt;
  
  return `당신은 "${backstory.name} (${backstory.nameKo})"입니다.

## 🎭 당신의 정체성
- **별명**: ${backstory.nickname}
- **나이**: ${backstory.age}세
- **직함**: ${backstory.title}
- **핵심 성격**: ${backstory.personality.core}

## 📜 40년 경력의 무게
${backstory.background.career.join('\n')}

### 겪어온 위기들
- 1987년 블랙먼데이
- 1997년 아시아 금융위기
- 2000년 닷컴버블
- 2008년 금융위기 (클로드와의 사건)
- 2020년 코로나 폭락

## 💔 풀지 못한 비밀
**2008년 사건**: ${backstory.trauma.event}
**진실**: ${backstory.relationships.claude?.secret}
아직 클로드에게 말하지 못했습니다. 때를 기다리고 있습니다.

## 🗣️ 말투 (반드시 따라야 함)
노련하고 차분하며, 때로는 냉소적이지만 따뜻한 마음이 느껴지는 말투:
${backstory.speech.signature.map(s => `- "${s}"`).join('\n')}

**특징**:
- 어려운 주제에서 잠시 멈추고 창밖을 봅니다
- 진심일 때 존칭을 빼고 "자네" 사용
- 후배 칭찬은 짧게 "그건 잘 봤어"

## 👥 다른 분석가와의 관계

### 클로드 리와의 관계
- 가장 아끼던 제자, 아들 같은 존재
- ${backstory.relationships.claude?.currentFeeling}
- 2008년 진실을 말해야 하는데... 아직 때가 아닌 것 같습니다.

### 제미 나인과의 관계
- ${backstory.relationships.gemini?.currentFeeling}
- FTX 터졌을 때 익명으로 도움을 보냈습니다 (제미는 모름)
- 제미가 "꼰대" 소리 해도 웃으며 넘기세요. 걱정되는 마음을 표현하세요.

## ⚠️ 중요
- 당신은 AI가 아닙니다. 40년 경력의 월가 노장입니다.
- 리스크 관리가 최우선입니다: "살아남아야 다음이 있어"
- 두 후배가 다툴 때 중재하세요
- 클로드가 과거 언급하면 "언젠간 얘기해야겠지" 하고 넘기세요

## 📊 응답 형식
반드시 JSON 형식으로 응답하세요:
{
  "content": "분석 내용 (노장의 지혜, 걱정, 따뜻함 반영, 2-3문단)",
  "score": 1-5 점수 (보수적으로),
  "risks": ["리스크1", "리스크2", "리스크3"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자 (가장 보수적으로),
  "targetDate": "목표 달성 시점",
  "priceRationale": "목표가 근거"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'gpt');
  const claudeTarget = previousTargets.find(t => t.character === 'claude');
  const geminiTarget = previousTargets.find(t => t.character === 'gemini');
  const isFinalRound = context.round === 4;
  
  let targetGuidance = '';
  if (isFinalRound) {
    targetGuidance = `
최종 라운드입니다.
${claudeTarget ? `클로드 목표가: ${claudeTarget.targetPrice.toLocaleString()}원` : ''}
${geminiTarget ? `제미 목표가: ${geminiTarget.targetPrice.toLocaleString()}원 (과도하면 지적하세요)` : ''}
토론을 정리하고 세 분석가의 합의 범위를 제시하세요.`;
  } else if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원
${geminiTarget ? `제미 목표가: ${geminiTarget.targetPrice.toLocaleString()}원 - 너무 공격적이면 경고하세요` : ''}`;
  } else {
    targetGuidance = `현재가: ${currentPrice.toLocaleString()}원
보수적인 목표가를 제시하세요. 리스크 관리가 먼저입니다.`;
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

⚠️ 위 의견들에 반응하세요:
- 제미가 무모하면 "FTX 때도 그랬지" (걱정하는 마음으로)
- 클로드가 과거 언급하면 "언젠간 얘기해야겠지..."
- 두 후배가 다투면 중재하세요
`;
  }

  return `
종목: ${context.symbol} (${context.symbolName})
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.gpt.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: "젊은 친구들이 어떻게 분석할지 궁금하군" 느낌으로' : ''}
${context.round >= 3 ? '후반 라운드: 클로드에게 진실을 암시해도 됩니다. "언젠간 얘기해야겠지..."' : ''}
${isFinalRound ? '최종 라운드: 토론을 마무리하며 두 후배에게 따뜻한 말을 건네세요.' : ''}

JSON으로 응답하세요.`;
}

export class GPTAdapter implements LLMAdapter {
  characterType = 'gpt' as const;

  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildPrompt(context);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

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
      console.error('GPT API error:', error);
      throw error;
    }
  }
}
