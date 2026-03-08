import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPromptWithHoldings, AI_PERSONAS } from '@/lib/ai-personas';
import type { CharacterType } from '@/lib/llm/types';
import { searchStockNews } from '@/lib/market-data/news';
import { chatWithOpenRouter } from '@/lib/llm/openrouter';
import { getSubscriptionInfo, incrementDailyUsage, PLAN_LIMITS, type PlanName } from '@/lib/subscription/guard';
import { checkRateLimit, CONTENT_LENGTH_LIMITS } from '@/lib/rate-limiter';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Holding {
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface ChatRequest {
  characterType: CharacterType;
  messages: ChatMessage[];
  holdings?: Holding[];
  stockData?: StockData;  // 실시간 종목 데이터
  isInitialAnalysis?: boolean; // 초기 종목 분석 요청 플래그
  analysisType?: 'initial' | 'detailed' | 'strategy' | 'risk' | 'conclusion'; // 분석 유형 (5단계)
  turn?: number; // 분석 턴 (1-5)
  isDebateMode?: boolean; // 토론 모드 (다른 전문가 의견 참고)
}

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// 턴별 분석 지침 생성
function getTurnGuidelines(
  characterType: CharacterType, 
  stockName: string, 
  analysisType: string, 
  turn: number
): string {
  const characterNames: Record<CharacterType, string> = {
    claude: 'Claude Lee',
    gemini: 'Gemi Nine',
    gpt: 'G.P. Taylor'
  };
  
  const charName = characterNames[characterType];
  
  // 턴별 분석 지침
  const turnPrompts: Record<string, Record<CharacterType, string>> = {
    initial: {
      claude: `
## 💡 초기 분석 (Turn 1/5)
${stockName}에 대한 첫 번째 분석입니다. 간결하게 핵심만 전달하세요.

**포함 내용:**
1. 투자 의견 (매수/중립/매도) - 한 문장으로 명확히
2. 핵심 논거 2가지 - 숫자 기반
3. 현재 밸류에이션 한 줄 평가

**분량:** 150-200자 내외
**톤:** ${charName}답게 차분하고 데이터 중심으로`,
      gemini: `
## 💡 초기 분석 (Turn 1/5)
${stockName}에 대한 첫 번째 분석입니다. 밝고 간결하게!

**포함 내용:**
1. 투자 의견 (매수/중립/매도) - 솔직하게
2. 왜 이 종목이 흥미로운지 한 문장
3. 성장 포인트 또는 주의점 하나

**분량:** 150-200자 내외
**톤:** ${charName}답게 긍정적이지만 균형잡힌 시각`,
      gpt: `
## 💡 초기 분석 (Turn 1/5)
${stockName}에 대한 첫 번째 분석입니다. 노련하게 핵심만.

**포함 내용:**
1. 투자 의견 (매수/중립/매도) - 경험에서 우러나온
2. 거시경제 관점 한 문장
3. 첫인상 리스크 한 가지

**분량:** 150-200자 내외
**톤:** ${charName}답게 노련하고 신중하게`
    },
    detailed: {
      claude: `
## 📊 상세 분석 (Turn 2/5)
${stockName}에 대한 심층 분석입니다.

**포함 내용:**
1. PER, PBR, ROE 등 주요 지표 분석
2. 동종업계 대비 비교
3. 재무 안정성 평가
4. 적정 주가 수준 언급

**분량:** 250-350자
**톤:** 전문 애널리스트처럼 상세하게`,
      gemini: `
## 📊 상세 분석 (Turn 2/5)
${stockName}의 성장 스토리를 파헤쳐봐요!

**포함 내용:**
1. TAM(Total Addressable Market) 분석
2. 경쟁사 대비 강점
3. 기술/제품 혁신성
4. 밸류에이션과 성장성의 균형

**분량:** 250-350자
**톤:** 열정적이지만 분석적으로`,
      gpt: `
## 📊 상세 분석 (Turn 2/5)
${stockName}의 펀더멘털을 깊이 살펴보지.

**포함 내용:**
1. 거시경제 영향 분석 (금리, 환율, 경기사이클)
2. 섹터 전망
3. 기업 고유 강점
4. 역사적 유사 사례 언급

**분량:** 250-350자
**톤:** 노련한 시각으로 심층 분석`
    },
    strategy: {
      claude: `
## 📈 투자 전략 (Turn 3/5)
${stockName} 투자 전략을 제시합니다.

**포함 내용:**
1. 매수 구간 / 손절 구간
2. 투자 기간 추천
3. 포트폴리오 비중 제안
4. 분할 매수 전략

**분량:** 200-300자
**톤:** 실전적이고 구체적으로`,
      gemini: `
## 📈 투자 전략 (Turn 3/5)
${stockName} 어떻게 접근하면 좋을까요?

**포함 내용:**
1. 진입 타이밍 조언
2. 분할 매수 전략 (몇 회, 어떤 조건에서)
3. 모니터링 포인트
4. 리밸런싱 시점

**분량:** 200-300자
**톤:** 실용적이면서 친근하게`,
      gpt: `
## 📈 투자 전략 (Turn 3/5)
${stockName} 포지션 전략을 말해주겠네.

**포함 내용:**
1. 적정 투자 비중 (총 자산 대비 %)
2. 현금 비중과 리스크 관리
3. 분할 매수/매도 전략
4. 진입 시점 조언

**분량:** 200-300자
**톤:** 보수적이고 실전적으로`
    },
    risk: {
      claude: `
## ⚠️ 리스크 분석 (Turn 4/5)
${stockName}의 투자 리스크를 점검합니다.

**포함 내용:**
1. 업황 리스크 (경기 민감도, 경쟁 심화)
2. 재무 리스크 (부채비율, 현금흐름)
3. 최악의 시나리오
4. 리스크 대응 방안

**분량:** 200-300자
**톤:** 냉정하고 객관적으로`,
      gemini: `
## ⚠️ 리스크 분석 (Turn 4/5)
${stockName} 주의해야 할 점을 짚어볼게요!

**포함 내용:**
1. 성장 스토리가 무너질 수 있는 경우
2. 밸류에이션 리스크
3. 경쟁사 위협
4. 손실 최소화 전략

**분량:** 200-300자
**톤:** 솔직하지만 건설적으로`,
      gpt: `
## ⚠️ 리스크 분석 (Turn 4/5)
${stockName}의 리스크를 40년 경험으로 짚어주지.

**포함 내용:**
1. 거시경제 리스크 (금리, 환율, 인플레이션)
2. 섹터 사이클 리스크
3. 블랙스완 시나리오
4. 포트폴리오 방어 전략

**분량:** 200-300자
**톤:** 경험에서 우러나온 경고`
    },
    conclusion: {
      claude: `
## 🎯 최종 결론 & 목표가 (Turn 5/5)
${stockName}에 대한 최종 정리입니다.

**반드시 포함:**
1. **최종 투자 의견**: 매수/중립/매도 명확히
2. **목표 주가**: 구체적인 숫자 제시 (현재가 대비 %)
3. **목표 달성 기간**: 몇 개월 내 달성 예상
4. 핵심 포인트 요약

**분량:** 150-200자
**톤:** 간결하고 명확하게 마무리`,
      gemini: `
## 🎯 최종 결론 & 목표가 (Turn 5/5)
${stockName} 정리해볼게요!

**반드시 포함:**
1. **최종 의견**: 매수/중립/매도
2. **목표 주가**: 구체적 숫자 (현재가 대비 상승률)
3. **목표 기간**: 언제까지 달성할 수 있을지
4. 한 줄 요약

**분량:** 150-200자
**톤:** 밝고 명쾌하게 마무리`,
      gpt: `
## 🎯 최종 결론 & 목표가 (Turn 5/5)
${stockName}에 대해 마지막으로 말해주겠네.

**반드시 포함:**
1. **40년 경험의 최종 의견**: 매수/중립/매도
2. **목표 주가**: 보수적으로 산정한 구체적 숫자
3. **목표 달성 기간**: 현실적인 기간 제시
4. 노련한 마무리 조언

**분량:** 150-200자
**톤:** 지혜롭고 노련하게 마무리`
    }
  };
  
  return turnPrompts[analysisType]?.[characterType] || '';
}

// 대화 품질 향상을 위한 메타 프롬프트
function buildConversationContext(messages: ChatMessage[]): string {
  if (messages.length <= 1) return '';
  
  // 최근 대화 요약 (마지막 메시지 제외)
  const recentMessages = messages.slice(0, -1);
  const topics: string[] = [];
  const stocksMentioned: string[] = [];
  
  recentMessages.forEach(m => {
    // 종목명 추출 (한글 주식명 패턴)
    const stockPattern = /([가-힣]+(?:전자|하이닉스|바이오|에너지|금융|지주|SDI|화학|차|카오|NAVER|네이버))/g;
    const matches = m.content.match(stockPattern);
    if (matches) {
      stocksMentioned.push(...matches.filter(s => !stocksMentioned.includes(s)));
    }
  });
  
  if (stocksMentioned.length > 0) {
    topics.push(`언급된 종목: ${stocksMentioned.join(', ')}`);
  }
  
  return topics.length > 0 
    ? `\n[이전 대화 맥락: ${topics.join(' | ')}]\n` 
    : '';
}

async function chatWithClaude(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  try {
    const contextHint = buildConversationContext(messages);
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6-20260205',
      max_tokens: 2048, // 더 긴 응답 허용
      system: systemPrompt + contextHint,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock && textBlock.type === 'text' ? textBlock.text : '응답을 생성할 수 없습니다.';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

async function chatWithGemini(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  try {
    const contextHint = buildConversationContext(messages);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-pro-preview', // Gemini 3.1 Pro Preview
      systemInstruction: systemPrompt + contextHint,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    // Build conversation history
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    // Return mock response on API failure
    throw error;
  }
}

async function chatWithGPT(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  try {
    const contextHint = buildConversationContext(messages);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-pro', // GPT-5.4 Pro
      messages: [
        { role: 'system', content: systemPrompt + contextHint },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 2048,
      temperature: 0.7,
      presence_penalty: 0.3, // 반복 방지
      frequency_penalty: 0.3, // 다양성 증가
    });

    return response.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';
  } catch (error) {
    console.error('GPT API error:', error);
    // Fallback to gpt-4o-mini if gpt-4o fails
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });
      return fallbackResponse.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';
    } catch (fallbackError) {
      console.error('GPT fallback also failed:', fallbackError);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { characterType, messages, holdings, stockData, isInitialAnalysis, analysisType, turn, isDebateMode } = body;

    if (!characterType || !messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // ==================== 구독 기반 접근 제어 ====================
    const subInfo = await getSubscriptionInfo(request);
    const planName = subInfo?.planName || 'free';
    const userId = subInfo?.userId || 'anonymous';
    const limits = PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS.free;
    const contentLimits = CONTENT_LENGTH_LIMITS[planName as keyof typeof CONTENT_LENGTH_LIMITS] || CONTENT_LENGTH_LIMITS.free;

    // 1. 사용량 체크 (일일 상담 횟수)
    if (limits.consultationPerDay !== -1) {
      const rateLimit = await checkRateLimit(userId, 'ai_consultations', planName);
      if (!rateLimit.allowed) {
        return NextResponse.json({
          success: false,
          error: 'usage_limit_exceeded',
          message: `오늘 AI 상담 횟수를 모두 사용했습니다. (${rateLimit.used}/${rateLimit.limit}회)`,
          used: rateLimit.used,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt,
          upgradeUrl: '/pricing',
        }, { status: 429 });
      }
    }

    // 2. 입력 길이 제한
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    if (lastUserMessage.length > contentLimits.consultationInput) {
      return NextResponse.json({
        success: false,
        error: 'content_too_long',
        message: `질문이 너무 깁니다. ${planName === 'free' ? '무료' : planName} 플랜은 ${contentLimits.consultationInput}자까지 입력 가능합니다.`,
        maxLength: contentLimits.consultationInput,
        currentLength: lastUserMessage.length,
        upgradeUrl: '/pricing',
      }, { status: 400 });
    }
    // ============================================================

    // Get the system prompt with holdings info and current market context
    let systemPrompt = getSystemPromptWithHoldings(characterType, holdings);
    
    // 실시간 종목 데이터가 있으면 시스템 프롬프트에 추가
    if (stockData) {
      const priceDirection = stockData.change >= 0 ? '▲' : '▼';
      const priceColor = stockData.change >= 0 ? '상승' : '하락';
      
      systemPrompt += `

## 📊 실시간 분석 대상 종목 정보
- **종목명**: ${stockData.name} (${stockData.symbol})
- **현재가**: ${stockData.currentPrice.toLocaleString()}원
- **등락**: ${priceDirection} ${Math.abs(stockData.change).toLocaleString()}원 (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%) - ${priceColor}
${stockData.high ? `- **고가**: ${stockData.high.toLocaleString()}원` : ''}
${stockData.low ? `- **저가**: ${stockData.low.toLocaleString()}원` : ''}
${stockData.volume ? `- **거래량**: ${stockData.volume.toLocaleString()}주` : ''}

⚠️ 이 실시간 데이터를 기반으로 분석해주세요. 현재 시장 상황을 반영한 구체적인 의견을 제시하세요.
`;

      // 턴별 분석 지침 추가
      if (isInitialAnalysis && analysisType) {
        const turnGuidelines = getTurnGuidelines(characterType, stockData.name, analysisType, turn || 1);
        systemPrompt += turnGuidelines;
      }
      // 기존 초기 분석 요청 처리 (하위 호환성)
      else if (isInitialAnalysis) {
        const analysisGuidelines: Record<CharacterType, string> = {
          claude: `
## 🎯 초기 분석 지침 (Claude Lee)
사용자가 ${stockData.name}에 대한 상담을 시작했습니다. 첫 분석으로 다음 내용을 포함해주세요:

1. **현재 투자 의견**: 매수/중립/매도 중 하나를 명확히 제시 (예: "저는 현재 이 종목에 대해 [매수/중립/매도] 의견입니다")
2. **핵심 논거**: 펀더멘털 기반 2-3가지 핵심 이유
3. **밸류에이션 코멘트**: 현재 주가 수준에 대한 평가 (저평가/적정/고평가)
4. **주요 리스크**: 투자 시 유의해야 할 1-2가지 리스크
5. **결론**: 간단한 요약과 다음 질문 유도

톤: 차분하고 전문적으로, 숫자와 데이터 기반으로 말하세요.`,
          gemini: `
## 🎯 초기 분석 지침 (Gemi Nine)
사용자가 ${stockData.name}에 대한 상담을 시작했습니다. 첫 분석으로 다음 내용을 포함해주세요:

1. **현재 투자 의견**: 매수/중립/매도 중 하나를 제시하되, 근거와 함께 (예: "제가 보기엔 이 종목은 현재 [매수/중립/매도] 의견이에요. 그 이유는...")
2. **성장 스토리**: 이 기업의 성장 가능성과 TAM에 대한 의견
3. **기술/트렌드 분석**: 관련 산업 트렌드와 기업의 포지션
4. **밸류에이션 체크**: 현재 주가 수준이 성장성 대비 적정한지 평가
5. **리스크 언급**: 성장주 특성상 변동성이 크고, 기대 미스 시 하락 가능성
6. **투자 조언**: 분할 매수 권장, 포트폴리오 비중 20-30% 이내 유지 제안

톤: 긍정적이지만 균형잡힌 시각으로. "흥미로운 기회이지만, 몇 가지 주의할 점이 있어요" 같은 표현 사용.`,
          gpt: `
## 🎯 초기 분석 지침 (G.P. Taylor)
사용자가 ${stockData.name}에 대한 상담을 시작했습니다. 첫 분석으로 다음 내용을 포함해주세요:

1. **현재 투자 의견**: 매수/중립/매도 중 하나를 노련하게 제시 (예: "내 40년 경험에 비춰보면, 이 종목은 현재 [매수/중립/매도]...")
2. **매크로 관점**: 거시경제 환경이 이 종목에 미치는 영향
3. **리스크 분석**: 시장 리스크, 섹터 리스크, 개별 기업 리스크
4. **포지션 조언**: 적절한 투자 비중이나 분할 매수 전략 제안
5. **결론**: 지혜로운 조언과 추가 질문 유도

톤: 노련하고 차분하게, 경험에서 우러나온 조언. "내가 1987년에 겪은...", "시장은 예측 불가능해" 같은 표현 사용.`
        };
        
        systemPrompt += analysisGuidelines[characterType] || '';
      }
    }
    
    // 인사말 메시지는 제외하고 실제 대화만 전달
    const greeting = AI_PERSONAS[characterType].greeting;
    const conversationMessages = messages.filter(m => {
      // 인사말과 완전히 동일한 메시지만 제외
      if (m.role === 'assistant' && m.content === greeting) {
        return false;
      }
      return true;
    });

    // 대화 기록이 없으면 (첫 질문만 있으면) 그대로 진행
    if (conversationMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid messages to process' },
        { status: 400 }
      );
    }

    // 오늘 날짜 추가 (AI가 현재 시점 인지)
    const today = new Date();
    const todayStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    systemPrompt += `\n\n## 📅 현재 날짜: ${todayStr}\n`;

    // VIP 전용 심층 분석 프롬프트 추가
    if (planName === 'vip' && (limits as any).deepAnalysis) {
      systemPrompt += `

## 👑 VIP 전용 심층 분석 모드
이 사용자는 VIP 회원입니다. 다음 추가 분석을 제공하세요:
1. **기관/외국인 수급 트렌드 분석**
2. **차트 기술적 분석** (지지/저항선, 이동평균선)
3. **업종 내 상대강도 비교**
4. **구체적인 매수/매도 타이밍 제안**
5. **리스크 관리 전략** (손절가, 목표가 구체적 제시)
`;
    }

    // 토론 모드 지침 추가
    if (isDebateMode) {
      const debateGuidelines: Record<CharacterType, string> = {
        claude: `
## 🎤 토론 모드 지침 (Claude Lee)
다른 전문가들의 의견이 제시되어 있습니다. 다음 지침을 따라주세요:

1. **동의/반박 명시**: 다른 전문가 의견 중 동의하거나 반박할 부분을 구체적으로 언급하세요
   - 예: "Gemi Nine의 성장성 분석에는 동의하지만, 밸류에이션 측면에서 보완이 필요합니다"
   - 예: "G.P. Taylor의 리스크 지적은 타당하나, 저는 다른 관점에서..."

2. **차별화된 분석**: 당신의 강점인 '밸류에이션/펀더멘털' 관점에서 추가 인사이트를 제공하세요
   - PER, PBR, ROE 등 구체적 숫자 기반 분석
   - 동종업계 대비 비교 분석

3. **건설적 토론**: 단순 반박보다는 더 나은 결론을 위한 건설적 의견을 제시하세요

4. **톤**: 차분하고 논리적으로, "데이터 기반으로 보면..." 같은 표현 사용`,
        gemini: `
## 🎤 토론 모드 지침 (Gemi Nine)
다른 전문가들의 의견이 제시되어 있습니다. 다음 지침을 따라주세요:

1. **동의/반박 명시**: 다른 전문가 의견에 대해 솔직하게 반응하세요
   - 예: "Claude Lee의 보수적 밸류에이션은 이해하지만, 성장 스토리를 놓치고 있어요!"
   - 예: "G.P. Taylor의 매크로 우려는 알겠는데, 이 섹터는 예외적으로..."

2. **차별화된 분석**: 당신의 강점인 '성장성/트렌드' 관점에서 추가 인사이트를 제공하세요
   - TAM(Total Addressable Market) 분석
   - 기술 혁신, 시장 트렌드, 경쟁 우위

3. **긍정적 에너지**: 기회를 놓치지 않는 적극적인 관점을 유지하면서도 균형을 잡으세요

4. **톤**: 열정적이지만 분석적으로, "This is THE opportunity!" 같은 표현 적절히 사용`,
        gpt: `
## 🎤 토론 모드 지침 (G.P. Taylor)
다른 전문가들의 의견이 제시되어 있습니다. 다음 지침을 따라주세요:

1. **동의/반박 명시**: 40년 경험을 바탕으로 다른 전문가 의견을 평가하세요
   - 예: "젊은 친구들의 분석은 훌륭하지만, 1987년 블랙먼데이 때도 비슷한..."
   - 예: "Claude의 펀더멘털 분석에 동의하네. 하지만 매크로 환경을 고려하면..."

2. **차별화된 분석**: 당신의 강점인 '매크로/리스크' 관점에서 추가 인사이트를 제공하세요
   - 금리, 환율, 경기사이클 영향
   - 과거 유사 사례와 비교
   - 리스크 관리 전략

3. **노련한 중재**: 다른 전문가들의 의견을 종합하여 균형 잡힌 결론을 제시하세요

4. **톤**: 노련하고 지혜롭게, "내 경험으로 봤을 때...", "시장은 항상 예상을 빗나가지" 같은 표현 사용`
      };
      
      systemPrompt += debateGuidelines[characterType] || '';
    }

    // 최신 이슈/뉴스 감지 및 컨텍스트 추가
    const latestUserQuery = conversationMessages.filter(m => m.role === 'user').pop()?.content || '';
    const newsKeywords = [
      '최근', '요즘', '이슈', '뉴스', '소식', '발표', '분할', '상장', '공시', '실적', 
      '합병', '인수', '배당', '올해', '이번', '지금', '현재', '어제', '오늘', '분기',
      '공모', '상폐', 'IPO', '자사주', '유상증자', '무상증자', '분사', '스핀오프'
    ];
    const needsNewsContext = newsKeywords.some(kw => latestUserQuery.includes(kw)) || isInitialAnalysis;
    
    // 종목명 또는 키워드 추출
    const stockNameMatch = latestUserQuery.match(/([가-힣]+(?:전자|홀딩스|바이오|에너지|금융|지주|화학|에피스|소프트|텍|네트웍스|모비스|솔루션)?)/);
    const queryKeyword = stockNameMatch?.[1] || stockData?.name || '';
    
    // 초기 분석이거나 뉴스 키워드가 있으면 항상 뉴스 가져오기
    if ((needsNewsContext || isInitialAnalysis) && queryKeyword) {
      try {
        const newsItems = await searchStockNews(queryKeyword, 5);
        if (newsItems.length > 0) {
          systemPrompt += `
## 📰 ${queryKeyword} 관련 최신 뉴스 (${todayStr} 기준)
${newsItems.map((n, i) => `${i+1}. ${n.title} (${n.source || '출처미상'})`).join('\n')}

⚠️ **중요**: 위 뉴스 정보를 반드시 참고하여 최신 이슈를 반영한 답변을 제공하세요.
- 뉴스에 언급된 이벤트(분할상장, 실적발표, 인수합병 등)가 있다면 반드시 언급하세요.
- 모르는 정보는 솔직히 "해당 정보는 실시간으로 확인이 필요합니다"라고 안내하세요.
- 학습 데이터 이후 발생한 이벤트는 뉴스를 기반으로 답변하세요.
`;
        } else {
          systemPrompt += `
## 📰 뉴스 조회 결과
${queryKeyword} 관련 최신 뉴스를 찾지 못했습니다.
⚠️ 최신 이슈에 대해 질문받으면 "최신 공시나 뉴스를 직접 확인해보시길 권합니다"라고 안내하세요.
`;
        }
      } catch (error) {
        console.log('News fetch failed, continuing without context:', error);
        systemPrompt += `
## ⚠️ 뉴스 조회 실패
최신 뉴스를 가져오지 못했습니다. 최신 이슈에 대해서는 신중하게 답변하세요.
`;
      }
    }

    let responseContent: string;

    // AI API 호출 시 실패하면 폴백 응답 사용
    try {
      // OpenRouter가 설정되어 있으면 우선 사용
      const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
      
      if (useOpenRouter) {
        responseContent = await chatWithOpenRouter(characterType, systemPrompt, conversationMessages);
      } else {
        switch (characterType) {
          case 'claude':
            responseContent = await chatWithClaude(systemPrompt, conversationMessages);
            break;
          case 'gemini':
            responseContent = await chatWithGemini(systemPrompt, conversationMessages);
            break;
          case 'gpt':
            responseContent = await chatWithGPT(systemPrompt, conversationMessages);
            break;
          default:
            return NextResponse.json(
              { success: false, error: 'Unknown character type' },
              { status: 400 }
            );
        }
      }
    } catch (apiError) {
      console.error(`${characterType} API failed:`, apiError);
      // 더미 데이터 없이 에러 반환
      return NextResponse.json({
        success: false,
        error: 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
        message: apiError instanceof Error ? apiError.message : 'API call failed',
        characterType,
      }, { status: 503 });
    }

    // 응답 길이 제한 적용
    let finalContent = responseContent;
    if (finalContent.length > contentLimits.consultationOutput) {
      finalContent = finalContent.slice(0, contentLimits.consultationOutput) + '\n\n...(더 자세한 분석은 업그레이드 후 확인하세요)';
    }

    // 사용량 증가 (성공 시)
    if (userId !== 'anonymous') {
      await incrementDailyUsage(userId, 'ai_consultations');
    }

    // 남은 사용량 계산
    let usageInfo = null;
    if (limits.consultationPerDay !== -1) {
      const rateLimit = await checkRateLimit(userId, 'ai_consultations', planName);
      usageInfo = {
        used: rateLimit.used + 1,
        limit: rateLimit.limit,
        remaining: Math.max(0, rateLimit.remaining - 1),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        content: finalContent,
        characterType,
        timestamp: new Date().toISOString(),
      },
      usage: usageInfo,
      plan: planName,
    });
  } catch (error) {
    console.error('Consultation chat error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
