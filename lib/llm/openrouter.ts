/**
 * OpenRouter API 어댑터
 * 하나의 API로 Claude, GPT, Gemini 등 다양한 모델 사용 가능
 * https://openrouter.ai/
 */

import type { LLMAdapter, LLMContext, LLMResponse, CharacterType } from './types';
import { CHARACTER_PERSONAS } from './types';
import { getMinimumFutureDate, validateAndCorrectTargetDate } from './analysis-framework';

// OpenRouter 최신 모델 (2026년 1월) - 실제 존재하는 모델
const MODEL_MAP: Record<CharacterType, string> = {
  claude: 'anthropic/claude-sonnet-4',           // Claude Sonnet 4
  gemini: 'google/gemini-2.5-pro-preview',       // Gemini 2.5 Pro
  gpt: 'openai/gpt-4o',                          // GPT-4o
};

// 대체 모델 (rate limit이나 에러 시)
const FALLBACK_MODEL_MAP: Record<CharacterType, string> = {
  claude: 'anthropic/claude-3.5-sonnet',         // Claude 3.5 Sonnet
  gemini: 'google/gemini-2.0-flash-exp:free',    // Gemini 2.0 Flash (무료)
  gpt: 'openai/gpt-4o-mini',                     // GPT-4o Mini
};

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getSystemPrompt(character: CharacterType): string {
  const persona = CHARACTER_PERSONAS[character];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  
  // 캐릭터별 최소 미래 개월 수
  const minMonths = character === 'gemini' ? 12 : 6;
  const futureExample = getMinimumFutureDate(minMonths);
  
  const basePrompts: Record<CharacterType, string> = {
    claude: `당신은 ${persona.name}입니다. ${persona.title}로서 ${persona.style}을 보여줍니다.
    
분석 시 집중하는 영역: ${persona.focus.join(', ')}

## ⏰ 현재 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일
⚠️ 목표 달성 시점(targetDate)은 반드시 오늘로부터 최소 6개월 이후의 미래여야 합니다!
절대로 과거나 현재 분기의 날짜를 목표로 잡지 마세요!

## 응답 규칙
1. 반드시 JSON 형식으로 응답
2. 구체적인 수치와 근거 제시
3. 냉철하고 논리적인 어조 유지
4. "제 분석으로는...", "숫자는 거짓말하지 않습니다" 등 시그니처 표현 사용
5. targetDate는 "${futureExample}" 형식으로 미래 날짜만 사용!`,

    gemini: `당신은 ${persona.name}입니다. ${persona.title}로서 ${persona.style}을 보여줍니다.

분석 시 집중하는 영역: ${persona.focus.join(', ')}

## ⏰ 현재 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일
⚠️ 목표 달성 시점(targetDate)은 반드시 오늘로부터 최소 12개월 이후의 미래여야 합니다!
절대로 과거나 가까운 미래의 날짜를 목표로 잡지 마세요!

## 응답 규칙
1. 반드시 JSON 형식으로 응답
2. 성장 잠재력과 혁신성 강조
3. 에너지 넘치고 자신감 있는 어조
4. 영어 표현 섞어 사용 ("This is THE play!", "Huge TAM")
5. targetDate는 "${futureExample}" 형식으로 미래 날짜만 사용!`,

    gpt: `당신은 ${persona.name}입니다. ${persona.title}로서 ${persona.style}을 보여줍니다.

분석 시 집중하는 영역: ${persona.focus.join(', ')}

## ⏰ 현재 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일
⚠️ 목표 달성 시점(targetDate)은 반드시 오늘로부터 최소 6개월 이후의 미래여야 합니다!
절대로 과거나 현재 분기의 날짜를 목표로 잡지 마세요!

## 응답 규칙
1. 반드시 JSON 형식으로 응답
2. 리스크와 안정성 중심 분석
3. 노련하고 차분한 어조 유지
4. "내가 40년간 본 바로는...", "젊은 친구..." 등 경험 강조
5. targetDate는 "${futureExample}" 형식으로 미래 날짜만 사용!`
  };
  
  return basePrompts[character];
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  model: string,
  maxTokens: number = 2048
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
      'X-Title': 'StockHero AI Analysis',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`OpenRouter API error (${model}):`, error);
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }
  
  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

export class OpenRouterAdapter implements LLMAdapter {
  characterType: CharacterType;
  
  constructor(characterType: CharacterType) {
    this.characterType = characterType;
  }
  
  async generateStructured(context: LLMContext): Promise<LLMResponse> {
    const systemPrompt = getSystemPrompt(this.characterType);
    const model = MODEL_MAP[this.characterType];
    const fallbackModel = FALLBACK_MODEL_MAP[this.characterType];
    
    const previousContext = context.previousMessages
      .map(m => `${m.character}: ${m.content}${m.targetPrice ? ` (목표가: ${m.targetPrice.toLocaleString()}원)` : ''}`)
      .join('\n\n');
    
    const minMonths = this.characterType === 'gemini' ? 12 : 6;
    const futureExample = getMinimumFutureDate(minMonths);
    
    const userPrompt = `## 분석 대상
- 종목: ${context.symbolName} (${context.symbol})
- 섹터: ${context.sector || '미분류'}
- 현재가: ${context.currentPrice?.toLocaleString() || 'N/A'}원
${context.financials ? `- PER: ${context.financials.per || 'N/A'}, PBR: ${context.financials.pbr || 'N/A'}, ROE: ${context.financials.roe || 'N/A'}%` : ''}

## 토론 라운드: ${context.round}/3

${previousContext ? `## 이전 분석가들의 의견\n${previousContext}\n` : ''}

## 응답 형식 (JSON만 응답)
{
  "content": "당신의 분석 내용 (2-4문장, 캐릭터 말투 유지)",
  "score": 1-5 점수,
  "targetPrice": 목표가(숫자),
  "targetDate": "${futureExample}", // 반드시 이 형식의 미래 날짜만!
  "priceRationale": "목표가 산정 근거",
  "risks": ["리스크1", "리스크2"],
  "sources": ["분석 근거1", "분석 근거2"]
}`;
    
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    
    try {
      // 메인 모델 시도
      const responseText = await callOpenRouter(messages, model);
      return this.parseResponse(responseText, context);
    } catch (error) {
      console.warn(`Primary model failed for ${this.characterType}, trying fallback...`);
      
      try {
        // 폴백 모델 시도
        const responseText = await callOpenRouter(messages, fallbackModel);
        return this.parseResponse(responseText, context);
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${this.characterType}:`, fallbackError);
        return this.getDefaultResponse(context);
      }
    }
  }
  
  private parseResponse(responseText: string, context: LLMContext): LLMResponse {
    try {
      // JSON 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const currentPrice = context.currentPrice || 100000;
      
      // 목표가 검증
      let targetPrice = parsed.targetPrice;
      if (targetPrice) {
        // 너무 낮으면 보정
        if (targetPrice < currentPrice * 0.3) {
          targetPrice = Math.round(currentPrice * 1.15 / 100) * 100;
        }
        // 너무 높으면 보정
        if (targetPrice > currentPrice * 3) {
          targetPrice = Math.round(currentPrice * 1.5 / 100) * 100;
        }
      } else {
        // 캐릭터별 기본 목표가 계산
        const multipliers: Record<CharacterType, number> = {
          claude: 1.15, // 보수적
          gemini: 1.35, // 공격적
          gpt: 1.10,   // 매우 보수적
        };
        targetPrice = Math.round(currentPrice * multipliers[this.characterType] / 100) * 100;
      }
      
      // 목표 날짜 검증 및 보정 (최소 6개월 미래)
      const validatedTargetDate = validateAndCorrectTargetDate(parsed.targetDate, this.characterType);

      return {
        content: parsed.content || '분석을 완료했습니다.',
        score: Math.min(5, Math.max(1, parsed.score || 3)),
        targetPrice,
        targetDate: validatedTargetDate,
        priceRationale: parsed.priceRationale,
        risks: parsed.risks || [],
        sources: parsed.sources || [],
      };
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', error);
      return this.getDefaultResponse(context);
    }
  }
  
  private getDefaultResponse(context: LLMContext): LLMResponse {
    const currentPrice = context.currentPrice || 100000;
    const multipliers: Record<CharacterType, number> = {
      claude: 1.15,
      gemini: 1.30,
      gpt: 1.10,
    };
    
    const defaultMessages: Record<CharacterType, string> = {
      claude: `${context.symbolName}에 대해 펀더멘털 분석을 진행했습니다. 현재 밸류에이션과 재무 지표를 종합적으로 검토한 결과, 적정 수준으로 평가됩니다.`,
      gemini: `${context.symbolName}, 흥미로운 종목이에요! 성장 잠재력이 있어 보이지만, 몇 가지 체크포인트가 있습니다.`,
      gpt: `${context.symbolName}에 대해 40년 경험을 바탕으로 분석해봤네. 리스크 관리 관점에서 몇 가지 고려할 점이 있어.`,
    };
    
    return {
      content: defaultMessages[this.characterType],
      score: 3,
      targetPrice: Math.round(currentPrice * multipliers[this.characterType] / 100) * 100,
      targetDate: getMinimumFutureDate(6), // 최소 6개월 후
      risks: ['시장 변동성', '거시경제 불확실성'],
      sources: ['기업 공시', '산업 분석'],
    };
  }
}

// OpenRouter를 통한 채팅 API (consultation/chat용)
export async function chatWithOpenRouter(
  characterType: CharacterType,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const model = MODEL_MAP[characterType];
  const fallbackModel = FALLBACK_MODEL_MAP[characterType];
  
  const openRouterMessages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];
  
  try {
    return await callOpenRouter(openRouterMessages, model);
  } catch (error) {
    console.warn(`OpenRouter primary model failed, trying fallback...`);
    return await callOpenRouter(openRouterMessages, fallbackModel);
  }
}

// 팩토리 함수
export function createOpenRouterAdapters(): { claude: LLMAdapter; gemini: LLMAdapter; gpt: LLMAdapter } {
  return {
    claude: new OpenRouterAdapter('claude'),
    gemini: new OpenRouterAdapter('gemini'),
    gpt: new OpenRouterAdapter('gpt'),
  };
}

