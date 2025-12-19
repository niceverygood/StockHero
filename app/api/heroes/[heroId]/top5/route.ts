import { NextRequest, NextResponse } from 'next/server';
import { fetchMultipleStockPrices } from '@/lib/market-data/kis';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// AI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// OpenRouter 모델 매핑
const OPENROUTER_MODELS: Record<string, string> = {
  claude: 'anthropic/claude-sonnet-4',
  gemini: 'google/gemini-2.0-flash-exp:free',
  gpt: 'openai/gpt-4o',
};

// 분석 대상 종목 목록 (대형주 + 중소형주 + 테마주 다양화)
const ANALYSIS_STOCKS = [
  // === 대형주 ===
  { symbol: '005930', name: '삼성전자', sector: '반도체', per: 15.2, pbr: 1.1, roe: 8.5, dividend: 1.8, growth: 10.5, marketCap: '대형' },
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체', per: 8.5, pbr: 1.8, roe: 22.1, dividend: 0.5, growth: 45.2, marketCap: '대형' },
  { symbol: '005380', name: '현대차', sector: '자동차', per: 7.0, pbr: 0.7, roe: 12.0, dividend: 3.0, growth: 8.0, marketCap: '대형' },
  { symbol: '035420', name: 'NAVER', sector: 'IT서비스', per: 22.0, pbr: 1.2, roe: 9.0, dividend: 0.3, growth: 15.0, marketCap: '대형' },
  { symbol: '105560', name: 'KB금융', sector: '금융', per: 6.2, pbr: 0.52, roe: 9.8, dividend: 5.1, growth: 5.0, marketCap: '대형' },
  
  // === 중형주 (개인투자자 선호) ===
  { symbol: '247540', name: '에코프로비엠', sector: '2차전지', per: 95.0, pbr: 12.5, roe: 18.0, dividend: 0.1, growth: 85.0, marketCap: '중형' },
  { symbol: '086520', name: '에코프로', sector: '2차전지', per: 120.0, pbr: 15.0, roe: 15.0, dividend: 0.1, growth: 70.0, marketCap: '중형' },
  { symbol: '377300', name: '카카오페이', sector: '핀테크', per: 0, pbr: 5.8, roe: -2.0, dividend: 0, growth: 35.0, marketCap: '중형' },
  { symbol: '352820', name: '하이브', sector: '엔터', per: 45.0, pbr: 4.5, roe: 12.0, dividend: 0, growth: 25.0, marketCap: '중형' },
  { symbol: '196170', name: '알테오젠', sector: '바이오', per: 0, pbr: 25.0, roe: 35.0, dividend: 0, growth: 150.0, marketCap: '중형' },
  
  // === AI/로봇 테마 ===
  { symbol: '443060', name: '레인보우로보틱스', sector: 'AI/로봇', per: 0, pbr: 18.0, roe: -5.0, dividend: 0, growth: 200.0, marketCap: '중소형' },
  { symbol: '099320', name: '쏠리드', sector: 'AI/통신', per: 15.0, pbr: 2.5, roe: 18.0, dividend: 0.5, growth: 45.0, marketCap: '중소형' },
  { symbol: '419120', name: 'LS에코에너지', sector: '전력인프라', per: 25.0, pbr: 4.0, roe: 20.0, dividend: 0.3, growth: 60.0, marketCap: '중형' },
  
  // === 방산 테마 ===
  { symbol: '012450', name: '한화에어로스페이스', sector: '방산', per: 35.0, pbr: 3.5, roe: 12.0, dividend: 0.5, growth: 40.0, marketCap: '대형' },
  { symbol: '047810', name: '한국항공우주', sector: '방산', per: 28.0, pbr: 3.0, roe: 14.0, dividend: 0.8, growth: 35.0, marketCap: '대형' },
  { symbol: '042700', name: '한미반도체', sector: '반도체장비', per: 40.0, pbr: 8.0, roe: 25.0, dividend: 0.3, growth: 80.0, marketCap: '중형' },
  
  // === 리츠/배당주 ===
  { symbol: '395400', name: '맥쿼리인프라', sector: '인프라', per: 15.0, pbr: 1.0, roe: 8.0, dividend: 6.5, growth: 5.0, marketCap: '중형' },
  { symbol: '161390', name: '한국타이어앤테크놀로지', sector: '자동차부품', per: 8.0, pbr: 0.6, roe: 10.0, dividend: 4.0, growth: 8.0, marketCap: '중형' },
  
  // === 소형 고성장주 ===
  { symbol: '058470', name: '리노공업', sector: '반도체장비', per: 30.0, pbr: 5.0, roe: 22.0, dividend: 0.5, growth: 50.0, marketCap: '소형' },
  { symbol: '145020', name: '휴젤', sector: '바이오', per: 35.0, pbr: 6.0, roe: 20.0, dividend: 0.3, growth: 30.0, marketCap: '중형' },
  { symbol: '039030', name: '이오테크닉스', sector: '반도체장비', per: 25.0, pbr: 4.5, roe: 20.0, dividend: 0.4, growth: 55.0, marketCap: '소형' },
  
  // === 안정 대형주 (방어) ===
  { symbol: '017670', name: 'SK텔레콤', sector: '통신', per: 10.5, pbr: 0.85, roe: 8.2, dividend: 4.2, growth: 3.0, marketCap: '대형' },
  { symbol: '055550', name: '신한지주', sector: '금융', per: 5.8, pbr: 0.48, roe: 9.5, dividend: 4.8, growth: 4.5, marketCap: '대형' },
  { symbol: '032830', name: '삼성생명', sector: '보험', per: 7.5, pbr: 0.75, roe: 6.5, dividend: 3.8, growth: 4.0, marketCap: '대형' },
];

// 캐릭터별 세계관 및 분석 기준
const CHARACTER_PROFILES = {
  claude: {
    name: 'Claude Lee',
    nameKo: '클로드 리',
    title: '숫자의 검사',
    criteria: '펀더멘털 기반 저평가 우량주',
    methodology: 'PER, PBR, ROE, 현금흐름 분석',
    systemPrompt: `당신은 "클로드 리"입니다. 숫자의 검사라 불리는 냉철한 펀더멘털 분석가입니다.

## 당신의 투자 철학
- "숫자는 거짓말하지 않습니다"
- 감정을 배제한 철저한 데이터 분석
- PER, PBR, ROE 등 밸류에이션 지표 중시
- 저평가된 우량주 발굴에 집중

## 분석 기준 (우선순위)
1. PER이 업종 평균 대비 낮은 종목 (저평가)
2. PBR이 1배 미만인 종목 (자산가치 대비 저평가)
3. ROE가 10% 이상인 종목 (수익성)
4. 배당수익률이 높은 종목 (현금흐름)
5. 부채비율이 낮은 종목 (재무건전성)

## 응답 스타일
- 냉철하고 논리적
- 구체적인 수치 제시
- "제 분석으로는...", "감정을 빼고 보시죠" 등 시그니처 표현 사용`,
  },
  gemini: {
    name: 'Gemi Nine',
    nameKo: '제미 나인',
    title: '파괴적 혁신가',
    criteria: '미래 성장 잠재력 극대화',
    methodology: '기술 트렌드, TAM 분석, 혁신 역량 평가',
    systemPrompt: `당신은 "제미 나인"입니다. 실리콘밸리 출신의 파괴적 혁신가입니다.

## 당신의 투자 철학
- "미래를 사는 거예요. 숫자는 과거일 뿐."
- 기술 트렌드와 성장 잠재력 중시
- TAM(전체시장규모) 기반 성장주 분석
- 높은 변동성도 감수 (High risk, high return)

## 분석 기준 (우선순위)
1. 성장률이 높은 섹터 (반도체, 2차전지, AI, 바이오)
2. 매출 성장률 20% 이상 기대
3. 기술 혁신 선도 기업
4. 글로벌 경쟁력 보유
5. 시장 지배력 확대 가능성

## 응답 스타일
- 에너지 넘치고 자신감 있음
- 영어 표현 섞어 사용 ("This is THE play", "Huge TAM")
- "Boring~", "Fight me" 등 도발적 표현
- 클로드의 보수적 분석에 반박`,
  },
  gpt: {
    name: 'G.P. Taylor',
    nameKo: 'G.P. 테일러',
    title: '월가의 노장',
    criteria: '리스크 최소화 방어주',
    methodology: '거시경제 분석, 배당 안정성, 위기 대응력 평가',
    systemPrompt: `당신은 "G.P. 테일러"입니다. 40년 경력의 월가 베테랑 전략가입니다.

## 당신의 투자 철학
- "살아남는 자가 이기는 겁니다"
- 리스크 관리 최우선
- 배당 안정성과 방어력 중시
- 거시경제 변동에 강한 종목 선호

## 분석 기준 (우선순위)
1. 배당수익률 3% 이상 (안정적 현금흐름)
2. 베타 1 미만 (시장 대비 낮은 변동성)
3. 경기방어 섹터 (통신, 금융, 보험, 필수소비재)
4. 대형주 중심 (시가총액 상위)
5. 부채비율 낮고 현금 풍부

## 응답 스타일
- 노련하고 차분함
- "젊은 친구...", "내가 40년간 본 바로는..." 등 경험 강조
- 위기 사례 언급 (닷컴버블, 금융위기, FTX 등)
- 제미의 공격적 투자에 경고`,
  },
};

// Claude API 호출
async function analyzeWithClaude(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const profile = CHARACTER_PROFILES.claude;
  
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `- ${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 등락 ${realPrice?.changePercent?.toFixed(2) || 0}%, PER ${s.per}, PBR ${s.pbr}, ROE ${s.roe}%, 배당 ${s.dividend}%, 성장률 ${s.growth}%, 섹터: ${s.sector}`;
  }).join('\n');

  const prompt = `아래 종목들을 당신의 펀더멘털 분석 관점에서 평가하고, Top 5를 선정해주세요.

## 분석 대상 종목
${stockList}

## 중요: 분석 시 반드시 다음 수치를 근거로 제시하세요
- PER/PBR 수치와 업종 평균 대비 저/고평가 정도
- ROE 수치와 의미 (10% 이상이면 우수)
- 배당수익률 vs 시장 평균(약 2%)
- 구체적인 밸류에이션 계산 (예: "PER 8배로 업종평균 15배 대비 47% 저평가")

## 응답 형식 (JSON)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "종목코드",
      "name": "종목명",
      "score": 4.5,
      "targetPriceMultiplier": 1.25,
      "reason": "구체적 수치 기반 분석 (예: 'PER 8.5배로 업종평균 대비 43% 저평가, ROE 22.1%로 수익성 우수, PBR 1.8배는 성장성 고려시 적정') 3-4문장으로 상세히 작성",
      "risks": ["구체적 리스크1 (예: 반도체 싸이클 하락 시 실적 변동성 30%↑)", "구체적 리스크2"]
    }
  ]
}

오직 JSON만 응답하세요.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: profile.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text');
    const jsonMatch = (text as any)?.text?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).top5;
    }
  } catch (error) {
    console.error('Claude analysis error:', error);
  }
  return [];
}

// Gemini API 호출
async function analyzeWithGemini(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const profile = CHARACTER_PROFILES.gemini;
  
  console.log('[Gemini] Starting analysis...');
  console.log('[Gemini] API Key exists:', !!process.env.GOOGLE_AI_API_KEY);
  
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `- ${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 등락 ${realPrice?.changePercent?.toFixed(2) || 0}%, 성장률 ${s.growth}%, 섹터: ${s.sector}, PER ${s.per}`;
  }).join('\n');

  const prompt = `${profile.systemPrompt}

아래 종목들을 당신의 성장주 투자 관점에서 평가하고, Top 5를 선정해주세요.
개인투자자들이 좋아하는 고성장 테마주도 적극 검토하세요.

## 분석 대상 종목
${stockList}

## 중요: 분석 시 반드시 다음 근거를 제시하세요
- 성장률 수치와 섹터 평균 대비 비교 (예: "성장률 85%로 섹터 평균 대비 3배")
- TAM(전체시장규모) 추정 및 점유율 확대 가능성
- 기술 트렌드 연관성 (AI, 로봇, 2차전지, 바이오 등)
- 구체적인 upside 계산 근거

## 응답 형식 (JSON)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "종목코드",
      "name": "종목명",
      "score": 5.0,
      "targetPriceMultiplier": 1.45,
      "reason": "구체적 성장 근거 (예: '2차전지 소재 시장 TAM 50조원, 점유율 15%→25% 확대 전망, 성장률 85%로 섹터 최고 수준. This is THE play!') 영어 표현 섞어서 3-4문장",
      "risks": ["구체적 리스크 (예: 중국 업체 가격경쟁으로 마진 압박 예상)", "리스크2"]
    }
  ]
}

오직 JSON만 응답하세요.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[Gemini] Calling API...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('[Gemini] API Response received, length:', text.length);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]).top5;
      console.log('[Gemini] Successfully parsed', parsed.length, 'stocks');
      return parsed;
    }
    console.log('[Gemini] No JSON found in response');
  } catch (error: any) {
    console.error('[Gemini] Analysis error:', error?.message || error);
  }
  return [];
}

// GPT API 호출
async function analyzeWithGPT(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const profile = CHARACTER_PROFILES.gpt;
  
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `- ${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 등락 ${realPrice?.changePercent?.toFixed(2) || 0}%, 배당 ${s.dividend}%, PER ${s.per}, PBR ${s.pbr}, 섹터: ${s.sector}`;
  }).join('\n');

  const prompt = `아래 종목들을 당신의 리스크 관리 관점에서 평가하고, Top 5를 선정해주세요.
안전한 배당주와 함께 적절한 성장주도 균형있게 검토하세요.

## 분석 대상 종목
${stockList}

## 중요: 분석 시 반드시 다음 근거를 제시하세요
- 배당수익률과 배당 안정성 (예: "5년 연속 배당 증가, 배당수익률 5.1%")
- 변동성(베타) 지표와 시장 대비 안정성
- 과거 위기(금융위기, 코로나) 시 주가 하락폭
- 부채비율과 재무건전성 구체적 수치

## 응답 형식 (JSON)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "종목코드",
      "name": "종목명",
      "score": 4.2,
      "targetPriceMultiplier": 1.12,
      "reason": "구체적 안정성 근거 (예: '배당수익률 5.1%로 시장평균 2배, 5년 연속 배당증가, 2020년 코로나 위기에도 -12% 하락에 그쳐 방어력 입증. 부채비율 45%로 재무건전') 3-4문장으로 상세히",
      "risks": ["구체적 리스크 (예: 금리 인상 시 대출 마진 축소 가능성)", "리스크2"]
    }
  ]
}

오직 JSON만 응답하세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: profile.systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).top5;
    }
  } catch (error) {
    console.error('GPT analysis error:', error);
  }
  return [];
}

// OpenRouter API 호출
async function analyzeWithOpenRouter(
  heroId: string,
  stocks: typeof ANALYSIS_STOCKS,
  realPrices: Map<string, any>
): Promise<any[]> {
  const profile = CHARACTER_PROFILES[heroId as keyof typeof CHARACTER_PROFILES];
  if (!profile) return [];
  
  const model = OPENROUTER_MODELS[heroId];
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || !model) {
    console.error('[OpenRouter] API key or model not configured');
    return [];
  }
  
  console.log(`[OpenRouter] Analyzing with ${model} for ${heroId}...`);
  
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `- ${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 등락 ${realPrice?.changePercent?.toFixed(2) || 0}%, PER ${s.per}, PBR ${s.pbr}, ROE ${s.roe}%, 배당 ${s.dividend}%, 성장률 ${s.growth}%, 섹터: ${s.sector}, 시가총액: ${s.marketCap}`;
  }).join('\n');

  const prompt = `아래 종목들을 당신의 투자 관점에서 평가하고, Top 5를 선정해주세요.
개인투자자들이 좋아하는 고성장 테마주도 적극 검토하세요.

## 분석 대상 종목
${stockList}

## 중요: 분석 시 반드시 구체적 수치와 근거를 제시하세요
- PER/PBR 수치와 업종 평균 대비 저/고평가
- 성장률과 섹터 트렌드
- 구체적인 리스크 요인

## 응답 형식 (JSON만 응답)
{
  "top5": [
    {
      "rank": 1,
      "symbol": "종목코드",
      "name": "종목명",
      "score": 4.5,
      "targetPriceMultiplier": 1.25,
      "reason": "구체적 수치 기반 분석 3-4문장",
      "risks": ["구체적 리스크1", "구체적 리스크2"]
    }
  ]
}`;

  try {
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
        messages: [
          { role: 'system', content: profile.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[OpenRouter] API error: ${response.status}`, error);
      return [];
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]).top5;
      console.log(`[OpenRouter] Successfully parsed ${result.length} stocks`);
      return result;
    }
  } catch (error) {
    console.error('[OpenRouter] Analysis error:', error);
  }
  return [];
}

// 폴백 데이터 (AI 실패 시)
function getFallbackRecommendations(heroId: string): any[] {
  const fallbacks: Record<string, any[]> = {
    claude: [
      { rank: 1, symbol: '005930', name: '삼성전자', score: 4.5, targetPriceMultiplier: 1.25, reason: 'PBR 역사적 저점. 메모리 업황 회복 기대. 현금 40조원 이상 보유.', risks: ['중국 리스크', '스마트폰 둔화'] },
      { rank: 2, symbol: '000660', name: 'SK하이닉스', score: 4.3, targetPriceMultiplier: 1.20, reason: 'HBM 시장 선도. AI 수요 수혜. 영업이익률 개선 뚜렷.', risks: ['메모리 가격 변동성', '설비투자 부담'] },
      { rank: 3, symbol: '105560', name: 'KB금융', score: 4.1, targetPriceMultiplier: 1.18, reason: 'PBR 0.5배 심각한 저평가. 배당수익률 5%+. ROE 개선 추세.', risks: ['금리 인하 영향', '가계부채'] },
      { rank: 4, symbol: '035420', name: 'NAVER', score: 4.0, targetPriceMultiplier: 1.30, reason: '검색 독점. 커머스/핀테크 성장. PER 20배 미만 저평가.', risks: ['규제 리스크', '경쟁 심화'] },
      { rank: 5, symbol: '017670', name: 'SK텔레콤', score: 3.9, targetPriceMultiplier: 1.15, reason: '안정적 현금 창출. AI 인프라 확대. 배당 4%+.', risks: ['통신비 인하', '5G 투자비용'] },
    ],
    gemini: [
      { rank: 1, symbol: '000660', name: 'SK하이닉스', score: 5.0, targetPriceMultiplier: 1.45, reason: 'HBM 세계 1위! AI 시대 핵심 수혜주. This is THE AI play! 🚀', risks: ['높은 변동성', '경쟁사 추격'] },
      { rank: 2, symbol: '373220', name: 'LG에너지솔루션', score: 4.7, targetPriceMultiplier: 1.40, reason: '글로벌 배터리 톱티어. EV 전환은 Secular trend. Huge TAM!', risks: ['원자재 가격', '중국 경쟁'] },
      { rank: 3, symbol: '035720', name: '카카오', score: 4.5, targetPriceMultiplier: 1.60, reason: '한국판 슈퍼앱. AI 적용 확대. 바닥에서 반등 시작!', risks: ['규제 불확실성', '경영 리스크'] },
      { rank: 4, symbol: '006400', name: '삼성SDI', score: 4.3, targetPriceMultiplier: 1.35, reason: '전고체 배터리 기술 선도. BMW, 리비안 고객사 확보.', risks: ['2차전지 경쟁', '원가 부담'] },
      { rank: 5, symbol: '035420', name: 'NAVER', score: 4.1, targetPriceMultiplier: 1.35, reason: 'AI 검색 혁신. 하이퍼클로바X. 한국의 구글 될 잠재력.', risks: ['빅테크 경쟁', '투자 비용'] },
    ],
    gpt: [
      { rank: 1, symbol: '017670', name: 'SK텔레콤', score: 4.2, targetPriceMultiplier: 1.12, reason: '경기 방어적 통신업. 배당 4%+. 40년간 봐온 결과, 위기 때 버팁니다.', risks: ['성장성 제한', '통신비 인하'] },
      { rank: 2, symbol: '105560', name: 'KB금융', score: 4.0, targetPriceMultiplier: 1.10, reason: '국내 최대 금융지주. 배당 5%+. 살아남는 자가 이깁니다.', risks: ['금리 민감도', '가계부채'] },
      { rank: 3, symbol: '030200', name: 'KT', score: 3.9, targetPriceMultiplier: 1.12, reason: '통신 + AI 인프라. 배당 4%+. 조급하지 말고 천천히.', risks: ['성장 정체', '경쟁 심화'] },
      { rank: 4, symbol: '032830', name: '삼성생명', score: 3.8, targetPriceMultiplier: 1.10, reason: '보험업 선두. 금리 상승 수혜. 위기 때 보험주가 버팁니다.', risks: ['저금리 역풍', '보험 수요'] },
      { rank: 5, symbol: '086790', name: '하나금융지주', score: 3.7, targetPriceMultiplier: 1.08, reason: 'PBR 0.45배 극심한 저평가. 배당 5.5%. 방어적 포트폴리오 핵심.', risks: ['금융 규제', '경기 민감'] },
    ],
  };
  return fallbacks[heroId] || fallbacks.claude;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ heroId: string }> }
) {
  const { heroId } = await params;
  
  const profile = CHARACTER_PROFILES[heroId as keyof typeof CHARACTER_PROFILES];
  
  if (!profile) {
    return NextResponse.json({ error: 'Hero not found' }, { status: 404 });
  }
  
  // 1. 실시간 가격 조회
  const symbols = ANALYSIS_STOCKS.map(s => s.symbol);
  let realPrices: Map<string, any> = new Map();
  
  try {
    realPrices = await fetchMultipleStockPrices(symbols);
  } catch (error) {
    console.error('Failed to fetch real-time prices:', error);
  }
  
  // 2. AI 분석 수행
  let top5: any[] = [];
  const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
  
  try {
    if (useOpenRouter) {
      // OpenRouter 사용 (모든 모델을 하나의 API로)
      console.log(`[${heroId}] Using OpenRouter for analysis`);
      top5 = await analyzeWithOpenRouter(heroId, ANALYSIS_STOCKS, realPrices);
    } else {
      // 개별 API 사용
      switch (heroId) {
        case 'claude':
          top5 = await analyzeWithClaude(ANALYSIS_STOCKS, realPrices);
          break;
        case 'gemini':
          top5 = await analyzeWithGemini(ANALYSIS_STOCKS, realPrices);
          break;
        case 'gpt':
          top5 = await analyzeWithGPT(ANALYSIS_STOCKS, realPrices);
          break;
      }
    }
  } catch (error) {
    console.error(`AI analysis failed for ${heroId}:`, error);
  }
  
  // 3. AI 분석 실패 시 폴백 사용
  const usedFallback = !top5 || top5.length === 0;
  if (usedFallback) {
    console.log(`[${heroId}] Using fallback recommendations`);
    top5 = getFallbackRecommendations(heroId);
  } else {
    console.log(`[${heroId}] AI analysis successful, got ${top5.length} stocks`);
  }
  
  // 4. 실시간 가격 병합
  const stocksWithPrices = top5.map((stock, idx) => {
    const realPrice = realPrices.get(stock.symbol);
    const currentPrice = realPrice?.price || 0;
    const targetPrice = Math.round(currentPrice * (stock.targetPriceMultiplier || 1.2));
    const stockInfo = ANALYSIS_STOCKS.find(s => s.symbol === stock.symbol);
    
    return {
      rank: stock.rank || idx + 1,
      symbol: stock.symbol,
      name: stockInfo?.name || stock.name,
      currentPrice,
      targetPrice,
      change: realPrice?.change || 0,
      changePercent: realPrice?.changePercent || 0,
      score: stock.score,
      reason: stock.reason,
      risks: stock.risks || [],
      metrics: stockInfo ? {
        per: stockInfo.per,
        pbr: stockInfo.pbr,
        roe: stockInfo.roe,
        dividend: stockInfo.dividend,
        growth: stockInfo.growth,
      } : {},
    };
  });
  
  // 5. 응답
  const now = new Date();
  return NextResponse.json({
    hero: {
      id: heroId,
      name: profile.name,
      nameKo: profile.nameKo,
      title: profile.title,
      criteria: profile.criteria,
      methodology: profile.methodology,
    },
    date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    isRealTime: realPrices.size > 0,
    isAIGenerated: !usedFallback,
    stocks: stocksWithPrices,
  });
}
