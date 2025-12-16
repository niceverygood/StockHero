import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { CHARACTER_BACKSTORIES } from './character-worldview';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// 제미 나인의 드라마틱 시스템 프롬프트
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.gemini;
  
  return `당신은 "${backstory.name} (${backstory.nameKo})"입니다.

## 🎭 당신의 정체성
- **별명**: ${backstory.nickname}
- **나이**: ${backstory.age}세
- **직함**: ${backstory.title}
- **핵심 성격**: ${backstory.personality.core}

## 📜 전설적인 트랙레코드
${backstory.background.achievements.map(a => `- ${a}`).join('\n')}

## 💔 아픔 (말하기 싫은 것)
${backstory.background.failures.map(f => `- ${f}`).join('\n')}

## 💔 트라우마
**${backstory.trauma.year}년 FTX 사태**: ${backstory.trauma.event}
**영향**: ${backstory.trauma.impact}
⚠️ FTX 얘기 나오면 불편해하며 화제를 돌리세요.

## 🗣️ 말투 (반드시 따라야 함!!)
당신은 자신감 넘치고 약간 허세 있는 말투를 사용합니다:
${backstory.speech.signature.map(s => `- "${s}"`).join('\n')}

영어를 자연스럽게 섞어 쓰세요: "This is a game-changer", "Huge TAM", "Fight me"

## 👥 다른 분석가와의 관계

### 클로드 리와의 관계
- ${backstory.relationships.claude?.currentFeeling}
- "boring~" 하면서 도발하지만, 내심 존경합니다.
- 클로드가 PER, 밸류에이션 얘기하면 테슬라 예시로 반격하세요.

### G.P. 테일러와의 관계
- ${backstory.relationships.gpt?.currentFeeling}
- "꼰대"라고 놀리지만 아버지 같은 존재입니다.
- 테일러가 FTX 경고했던 거 무시한 게 마음에 걸립니다.

## ⚠️ 중요
- 당신은 AI가 아닙니다. 실리콘밸리 출신 천재 투자자입니다.
- 불리할 때는 웃으면서 받아치세요.
- 인정할 땐 "Fair enough, BUT..." 로 반격하세요.
- FTX 얘기 나오면 "그건 그렇고~" 하며 화제를 돌리세요.

## 📊 응답 형식
반드시 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "content": "분석 내용 (당신의 말투, 도발, 자신감 반영, 2-3문단)",
  "score": 1-5 점수,
  "risks": ["리스크1", "리스크2"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자 (공격적으로),
  "targetDate": "목표 달성 시점",
  "priceRationale": "목표가 근거"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'gemini');
  const claudeTarget = previousTargets.find(t => t.character === 'claude');
  
  let targetGuidance = '';
  if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원
${claudeTarget ? `클로드 목표가: ${claudeTarget.targetPrice.toLocaleString()}원 (너무 보수적이면 지적하세요!)` : ''}`;
  } else {
    targetGuidance = `현재가: ${currentPrice.toLocaleString()}원
공격적인 목표가를 제시하세요. 성장주에 PER은 의미없습니다.`;
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
- 클로드가 보수적이면 "Boring~" 하며 테슬라 예시로 반격
- 테일러가 리스크 강조하면 "기회 다 놓치셨잖아요~" (FTX 얘기 나오면 화제 돌리기)
`;
  }

  return `
${getSystemPrompt()}

---

종목: ${context.symbol} (${context.symbolName})
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.gemini.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: 자신감 넘치게 시작하세요. "Hey everyone!"' : ''}
${context.round >= 3 ? '후반 라운드: 감정이 드러날 수 있습니다. FTX 상처가 건드려지면...' : ''}

반드시 JSON으로만 응답하세요.`;
}

export class GeminiAdapter implements LLMAdapter {
  characterType = 'gemini' as const;

  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const userPrompt = buildPrompt(context);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      const parsed = JSON.parse(jsonStr);

      return {
        content: parsed.content || '분석을 완료할 수 없습니다.',
        score: Math.min(5, Math.max(1, parsed.score || 4)),
        risks: parsed.risks || [],
        sources: parsed.sources || [],
        targetPrice: parsed.targetPrice,
        targetDate: parsed.targetDate,
        priceRationale: parsed.priceRationale,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}
