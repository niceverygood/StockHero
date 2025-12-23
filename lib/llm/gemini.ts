import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { CHARACTER_BACKSTORIES } from './character-worldview';
import { ANALYSIS_METHODOLOGIES, calculateTargetDate, getExampleFutureDateForCharacter, validateAndCorrectTargetDate } from './analysis-framework';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// 제미 나인의 드라마틱 시스템 프롬프트
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.gemini;
  const methodology = ANALYSIS_METHODOLOGIES.gemini;
  const exampleDate = getExampleFutureDateForCharacter('gemini');
  
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
- **목표가와 목표일은 반드시 위 TAM 분석 방법론에 따라 논리적으로 도출하세요**

## ⏰ 중요: 오늘 날짜 확인
- **오늘 날짜: ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일**
- 목표 달성 시점은 반드시 최소 12개월 이후의 미래여야 합니다!
- 절대로 과거 날짜나 현재/가까운 분기를 목표로 잡지 마세요!

## 📊 응답 형식
반드시 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "content": "분석 내용 (당신의 말투, 도발, 자신감 반영, 2-3문단)",
  "score": 1-5 점수,
  "risks": ["리스크1", "리스크2"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자 (공격적으로),
  "targetDate": "${exampleDate}", // 반드시 이와 같은 미래 날짜만!
  "priceRationale": "목표가 산출 근거 (TAM, 성장률, PSR 등 구체적 수치 포함)"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'gemini');
  const claudeTarget = previousTargets.find(t => t.character === 'claude');
  
  // 현재 날짜 정보
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 예상 목표 달성 시점 계산 (12-24개월 후)
  const dateCalc = calculateTargetDate('gemini', now);
  
  // 성장 지표 (실제로는 API에서 가져와야 함)
  const revenueGrowth = 15 + Math.random() * 25;  // 15-40%
  const tamSize = Math.floor(50 + Math.random() * 150);  // 50-200조
  const marketShare = 5 + Math.random() * 15;  // 5-20%
  
  let targetGuidance = '';
  if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원
${claudeTarget ? `클로드 목표가: ${claudeTarget.targetPrice.toLocaleString()}원 (너무 보수적이면 지적하세요!)` : ''}`;
  } else {
    targetGuidance = `
## 📈 분석 데이터
- 현재가: ${currentPrice.toLocaleString()}원
- 오늘 날짜: ${currentYear}년 ${currentMonth}월 ${new Date().getDate()}일
- 예상 매출 성장률: ${revenueGrowth.toFixed(0)}% YoY
- TAM (전체 시장 규모): ${tamSize}조원
- 현재 시장 점유율: ${marketShare.toFixed(1)}%

## 🎯 목표가 산출 가이드 (TAM 분석)
1. 목표 시장 점유율 = 현재 × 1.5 (3년 후 예상)
2. 예상 매출 = TAM × 목표 점유율
3. 목표가 = 예상 매출 × 목표 PSR (성장 프리미엄 적용)
4. 목표 달성 시점: ${dateCalc.targetDate} (성장 스토리 실현 시점)

⚠️ 클로드처럼 보수적인 PER 분석은 boring해요~ TAM과 성장률로 승부하세요!
⚠️ priceRationale에 TAM, 점유율, 성장률 기반 계산 과정을 포함하세요!`;
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

⚠️ 위 의견들에 반응하세요:
- 클로드가 보수적이면 "Boring~" 하며 테슬라 예시로 반격
- 테일러가 리스크 강조하면 "기회 다 놓치셨잖아요~" (FTX 얘기 나오면 화제 돌리기)
`;
  }

  return `
${getSystemPrompt()}

---

종목: ${context.symbol} (${context.symbolName})
섹터: ${context.sector || 'Tech/Growth'}
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.gemini.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: 자신감 넘치게 시작하세요. "Hey everyone!" TAM과 성장 잠재력 중심으로!' : ''}
${context.round >= 3 ? '후반 라운드: 감정이 드러날 수 있습니다. FTX 상처가 건드려지면...' : ''}

반드시 JSON으로만 응답하세요.`;
}

export class GeminiAdapter implements LLMAdapter {
  characterType = 'gemini' as const;

  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const userPrompt = buildPrompt(context);

    try {
      // gemini-2.0-flash 사용 (rate limit이 더 높음)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      const parsed = JSON.parse(jsonStr);

      // 목표가 검증 및 보정
      let targetPrice = parsed.targetPrice;
      const currentPrice = context.currentPrice || 70000;
      
      if (targetPrice) {
        // 1. 목표가가 현재가의 1% 미만이면 1000을 곱함 (단위 오류 보정)
        if (targetPrice < currentPrice * 0.01) {
          console.warn(`Gemini target price too low (${targetPrice}), multiplying by 1000`);
          targetPrice = targetPrice * 1000;
        }
        
        // 2. 그래도 현재가의 50% 미만이면 공격적 목표가 계산 (현재가 + 25~45%)
        if (targetPrice < currentPrice * 0.5) {
          console.warn(`Gemini target price still unrealistic (${targetPrice}), using fallback calculation`);
          const aggressiveMultiplier = 1.25 + Math.random() * 0.20; // 25-45%
          targetPrice = Math.round(currentPrice * aggressiveMultiplier / 100) * 100;
        }
        
        // 3. 목표가가 현재가의 500% 초과시 보정 (Gemini는 좀 더 공격적 허용)
        if (targetPrice > currentPrice * 5) {
          console.warn(`Gemini target price too high (${targetPrice}), capping at 200%`);
          targetPrice = Math.round(currentPrice * 2.0 / 100) * 100;
        }
      } else {
        // 목표가 없으면 공격적 계산
        const aggressiveMultiplier = 1.25 + Math.random() * 0.20;
        targetPrice = Math.round(currentPrice * aggressiveMultiplier / 100) * 100;
      }

      // 목표 날짜 검증 및 보정 (최소 12개월 미래)
      const validatedTargetDate = validateAndCorrectTargetDate(parsed.targetDate, 'gemini');

      return {
        content: parsed.content || '분석을 완료할 수 없습니다.',
        score: Math.min(5, Math.max(1, parsed.score || 4)),
        risks: parsed.risks || [],
        sources: parsed.sources || [],
        targetPrice,
        targetDate: validatedTargetDate,
        priceRationale: parsed.priceRationale,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}
