import OpenAI from 'openai';
import type { LLMAdapter, LLMContext, LLMResponse } from './types';
import { CHARACTER_BACKSTORIES } from './character-worldview';
import { ANALYSIS_METHODOLOGIES, calculateTargetDate, getExampleFutureDateForCharacter, validateAndCorrectTargetDate } from './analysis-framework';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// G.P. 테일러의 드라마틱 시스템 프롬프트
function getSystemPrompt(): string {
  const backstory = CHARACTER_BACKSTORIES.gpt;
  const methodology = ANALYSIS_METHODOLOGIES.gpt;
  const exampleDate = getExampleFutureDateForCharacter('gpt');
  
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

## 📊 당신의 분석 방법론: ${methodology.name}
${methodology.description}

### 핵심 분석 지표
${methodology.primaryMetrics.map(m => `- ${m}`).join('\n')}

### 목표가 산출 공식
${methodology.targetPriceFormula}

### 목표 달성 시점 산출 논리
${methodology.targetDateLogic}

### 촉매 요인 (Catalysts) - 리스크 해소
${methodology.catalysts.map(c => `✅ ${c}`).join('\n')}

### 핵심 리스크 요인
${methodology.riskFactors.map(r => `⚠️ ${r}`).join('\n')}

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
- **목표가와 목표일은 반드시 위 리스크 조정 분석에 따라 논리적으로 도출하세요**

## ⏰ 중요: 오늘 날짜 확인
- **오늘 날짜: ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일**
- 목표 달성 시점은 반드시 최소 6개월 이후의 미래여야 합니다!
- 절대로 과거 날짜나 현재 분기를 목표로 잡지 마세요!

## 📊 응답 형식
반드시 JSON 형식으로 응답하세요:
{
  "content": "분석 내용 (노장의 지혜, 걱정, 따뜻함 반영, 2-3문단)",
  "score": 1-5 점수 (보수적으로),
  "risks": ["리스크1", "리스크2", "리스크3"],
  "sources": ["참고 자료"],
  "targetPrice": 목표가 숫자 (가장 보수적으로),
  "targetDate": "${exampleDate}", // 반드시 이와 같은 미래 날짜만!
  "priceRationale": "목표가 산출 근거 (리스크 할인율, 거시 요인 등 구체적 설명)"
}`;
}

function buildPrompt(context: LLMContext): string {
  const currentPrice = context.currentPrice || 70000;
  const previousTargets = context.previousTargets || [];
  const myPreviousTarget = previousTargets.find(t => t.character === 'gpt');
  const claudeTarget = previousTargets.find(t => t.character === 'claude');
  const geminiTarget = previousTargets.find(t => t.character === 'gemini');
  const isFinalRound = context.round === 4;
  
  // 현재 날짜 정보
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 예상 목표 달성 시점 계산 (6-12개월 후)
  const dateCalc = calculateTargetDate('gpt', now);
  
  // 거시 지표 (실제로는 API에서 가져와야 함)
  const fedRate = 4.25 + Math.random() * 0.5;  // 4.25-4.75%
  const debtRatio = 30 + Math.random() * 50;  // 30-80%
  const beta = 0.8 + Math.random() * 0.6;  // 0.8-1.4
  
  let targetGuidance = '';
  if (isFinalRound) {
    targetGuidance = `
## 🎯 최종 라운드 - 합의 도출
${claudeTarget ? `클로드 목표가: ${claudeTarget.targetPrice.toLocaleString()}원` : ''}
${geminiTarget ? `제미 목표가: ${geminiTarget.targetPrice.toLocaleString()}원 (과도하면 지적하세요)` : ''}

**합의 도출 과정:**
1. 각 분석가의 목표가 논리 검토
2. 리스크 요인 종합 평가
3. 가중평균 또는 중간값으로 합의점 제시
4. 합의에 이른 논리적 근거 설명

토론을 정리하고 세 분석가의 합의 범위와 논리를 제시하세요.`;
  } else if (myPreviousTarget) {
    targetGuidance = `
이전 목표가: ${myPreviousTarget.targetPrice.toLocaleString()}원
${geminiTarget ? `제미 목표가: ${geminiTarget.targetPrice.toLocaleString()}원 - 너무 공격적이면 경고하세요` : ''}`;
  } else {
    targetGuidance = `
## 📈 분석 데이터
- 현재가: ${currentPrice.toLocaleString()}원
- 오늘 날짜: ${currentYear}년 ${currentMonth}월 ${new Date().getDate()}일
- 기준금리: ${fedRate.toFixed(2)}%
- 부채비율: ${debtRatio.toFixed(0)}%
- 베타(β): ${beta.toFixed(2)}

## 🎯 목표가 산출 가이드 (리스크 조정 분석)
1. 기본 상승 여력 = 업종 평균 대비 저평가 해소 (약 15%)
2. 리스크 할인율 = 부채비율/5 + 거시 불확실성 (5-20%)
3. 목표가 = 현재가 × (1 + 상승여력) × (1 - 리스크할인율)
4. 목표 달성 시점: ${dateCalc.targetDate} (리스크 해소 예상 시점)

⚠️ 살아남아야 다음이 있어. 리스크를 최우선으로 고려하세요!
⚠️ priceRationale에 리스크 할인율 계산 과정을 포함하세요!`;
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
- 제미가 무모하면 "FTX 때도 그랬지" (걱정하는 마음으로)
- 클로드가 과거 언급하면 "언젠간 얘기해야겠지..."
- 두 후배가 다투면 중재하세요
`;
  }

  return `
종목: ${context.symbol} (${context.symbolName})
섹터: ${context.sector || 'Mixed'}
라운드: ${context.round}/4
${targetGuidance}
${previousContext}

당신(${CHARACTER_BACKSTORIES.gpt.nameKo})의 분석을 제시하세요.
${context.round === 1 ? '첫 라운드: "젊은 친구들이 어떻게 분석할지 궁금하군" 느낌으로. 리스크 중심 분석!' : ''}
${context.round >= 3 ? '후반 라운드: 클로드에게 진실을 암시해도 됩니다. "언젠간 얘기해야겠지..."' : ''}
${isFinalRound ? '최종 라운드: 토론을 마무리하며 합의점을 논리적으로 도출하세요. 어떻게 이 합의에 도달했는지 설명하세요.' : ''}

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
      
      // 목표가 검증 및 보정
      let targetPrice = parsed.targetPrice;
      const currentPrice = context.currentPrice || 70000;
      
      if (targetPrice) {
        // 1. 목표가가 현재가의 1% 미만이면 1000을 곱함 (단위 오류 보정)
        if (targetPrice < currentPrice * 0.01) {
          console.warn(`GPT target price too low (${targetPrice}), multiplying by 1000`);
          targetPrice = targetPrice * 1000;
        }
        
        // 2. 그래도 현재가의 50% 미만이면 보수적 목표가 계산 (현재가 + 5~10%)
        if (targetPrice < currentPrice * 0.5) {
          console.warn(`GPT target price still unrealistic (${targetPrice}), using fallback calculation`);
          const conservativeMultiplier = 1.05 + Math.random() * 0.10; // 5-15%
          targetPrice = Math.round(currentPrice * conservativeMultiplier / 100) * 100;
        }
        
        // 3. 목표가가 현재가의 300% 초과시 보정
        if (targetPrice > currentPrice * 3) {
          console.warn(`GPT target price too high (${targetPrice}), capping at 150%`);
          targetPrice = Math.round(currentPrice * 1.15 / 100) * 100;
        }
      } else {
        // 목표가 없으면 보수적으로 계산
        const conservativeMultiplier = 1.05 + Math.random() * 0.10;
        targetPrice = Math.round(currentPrice * conservativeMultiplier / 100) * 100;
      }

      // 목표 날짜 검증 및 보정 (최소 6개월 미래)
      const validatedTargetDate = validateAndCorrectTargetDate(parsed.targetDate, 'gpt');

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
      console.error('GPT API error:', error);
      throw error;
    }
  }
}
