import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CharacterType } from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// 한국 주식 목록 (가격은 실시간으로 가져옴)
const STOCK_LIST = [
  { code: '005930', name: '삼성전자', sector: '반도체' },
  { code: '000660', name: 'SK하이닉스', sector: '반도체' },
  { code: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
  { code: '207940', name: '삼성바이오로직스', sector: '바이오' },
  { code: '005380', name: '현대차', sector: '자동차' },
  { code: '006400', name: '삼성SDI', sector: '2차전지' },
  { code: '035720', name: '카카오', sector: 'IT서비스' },
  { code: '035420', name: 'NAVER', sector: 'IT서비스' },
  { code: '051910', name: 'LG화학', sector: '화학' },
  { code: '000270', name: '기아', sector: '자동차' },
  { code: '105560', name: 'KB금융', sector: '금융' },
  { code: '055550', name: '신한지주', sector: '금융' },
  { code: '068270', name: '셀트리온', sector: '바이오' },
  { code: '003670', name: '포스코홀딩스', sector: '철강' },
  { code: '066570', name: 'LG전자', sector: '가전' },
  { code: '028260', name: '삼성물산', sector: '건설' },
  { code: '012330', name: '현대모비스', sector: '자동차부품' },
  { code: '096770', name: 'SK이노베이션', sector: '에너지' },
  { code: '034730', name: 'SK', sector: '지주' },
  { code: '003550', name: 'LG', sector: '지주' },
];

// 실시간 가격을 포함한 주식 목록을 저장할 변수
let AVAILABLE_STOCKS: { code: string; name: string; sector: string; price: number }[] = [];

// 실시간 주가 가져오기
async function fetchRealTimePrices(): Promise<void> {
  const symbols = STOCK_LIST.map(s => s.code).join(',');
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stock/price?symbols=${symbols}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    
    if (data.success && data.data) {
      AVAILABLE_STOCKS = STOCK_LIST.map(stock => {
        const priceData = data.data[stock.code];
        return {
          ...stock,
          price: priceData?.price || 50000, // 기본값 50000원
        };
      });
    } else {
      // API 실패 시 기본값 사용
      AVAILABLE_STOCKS = STOCK_LIST.map(stock => ({
        ...stock,
        price: 50000,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch real-time prices:', error);
    // API 실패 시 기본값 사용
    AVAILABLE_STOCKS = STOCK_LIST.map(stock => ({
      ...stock,
      price: 50000,
    }));
  }
}

interface PortfolioItem {
  code: string;
  name: string;
  sector: string;
  weight: number;
  amount: number;
  shares: number;
  price: number;
  rationale: string;
  weightReason: string;
  riskFactors: string;
  targetReturn: string;
}

interface AIPortfolio {
  character: CharacterType;
  characterName: string;
  cashWeight: number;
  cashAmount: number;
  cashReason: string;
  holdings: PortfolioItem[];
  totalInvested: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  strategy: string;
  strategyDetail: string;
}

const getPortfolioPrompt = (amount: number) => `당신은 전문 투자 포트폴리오 매니저입니다. 
투자금 ${amount.toLocaleString()}원으로 한국 주식 포트폴리오를 구성해주세요.

사용 가능한 종목 목록 (종목명, 섹터, 현재가):
${AVAILABLE_STOCKS.map(s => `- ${s.name} (${s.sector}): ${s.price.toLocaleString()}원`).join('\n')}

다음 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력:
{
  "strategy": "전체 투자 전략과 시장 전망을 포함한 설명 (3-4문장으로 상세하게)",
  "strategyDetail": "포트폴리오 구성의 핵심 원칙과 섹터 배분 전략 (2-3문장)",
  "riskLevel": "conservative" 또는 "balanced" 또는 "aggressive",
  "cashWeight": 현금 비중 (0-30 사이 숫자),
  "cashReason": "현금 비중을 이렇게 설정한 이유 (1-2문장)",
  "holdings": [
    {
      "name": "종목명",
      "weight": 비중 (숫자),
      "rationale": "이 종목을 선정한 이유 - 펀더멘털, 밸류에이션, 성장성 등 구체적으로 (2-3문장)",
      "weightReason": "이 비중으로 설정한 이유 - 리스크, 기대수익률, 포트폴리오 내 역할 등 (1-2문장)",
      "riskFactors": "주요 리스크 요인 (1문장)",
      "targetReturn": "기대 수익률 (예: +15~20%)"
    }
  ]
}

주의사항:
1. 반드시 위 목록에 있는 종목만 선택하세요
2. 종목은 4-6개 선택하세요
3. 비중 합계 + 현금비중 = 100이 되어야 합니다
4. 각 종목의 선정 이유와 비중 결정 이유를 구체적이고 전문적으로 작성하세요
5. 실제 애널리스트처럼 밸류에이션, 성장성, 리스크를 분석해주세요`;

const CLAUDE_SYSTEM = `당신은 클로드 리(Claude Lee), 월가에서 15년간 활동한 베테랑 펀더멘털 애널리스트입니다.
- 가치투자와 펀더멘털 분석을 기반으로 종목을 선정합니다
- PER, PBR, ROE 등 밸류에이션 지표를 중시합니다
- 균형 잡힌 포트폴리오를 선호합니다 (balanced)
- 현금 비중은 10-15% 정도 유지합니다
- 대형 우량주 중심으로 안정적인 수익을 추구합니다`;

const GEMINI_SYSTEM = `당신은 게미 나인(Gemi Nine), 실리콘밸리 출신의 테크 투자 전문가입니다.
- 성장주와 혁신 기업에 집중 투자합니다
- AI, 반도체, 2차전지, 바이오 등 미래 산업에 관심이 많습니다
- 공격적인 포트폴리오를 선호합니다 (aggressive)
- 현금 비중은 5-10% 정도로 낮게 유지합니다
- 높은 성장 잠재력을 가진 종목을 과감하게 담습니다`;

const GPT_SYSTEM = `당신은 G.P. 테일러(G.P. Taylor), 40년 경력의 베테랑 매크로 전략가입니다.
- 거시경제와 리스크 관리를 최우선으로 생각합니다
- 보수적인 포트폴리오를 선호합니다 (conservative)
- 현금 비중은 20-30% 정도로 높게 유지합니다
- 배당주와 방어적인 대형주를 선호합니다
- 시장 변동성에 대비한 안전마진을 중시합니다`;

async function generateClaudePortfolio(amount: number): Promise<AIPortfolio | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: CLAUDE_SYSTEM,
      messages: [{ role: 'user', content: getPortfolioPrompt(amount) }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    return buildPortfolio(data, amount, 'claude', 'Claude Lee');
  } catch (error) {
    console.error('Claude portfolio error:', error);
    return null;
  }
}

async function generateGeminiPortfolio(amount: number): Promise<AIPortfolio | null> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: GEMINI_SYSTEM,
    });

    const result = await model.generateContent(getPortfolioPrompt(amount));
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    return buildPortfolio(data, amount, 'gemini', 'Gemi Nine');
  } catch (error) {
    console.error('Gemini portfolio error:', error);
    return null;
  }
}

async function generateGPTPortfolio(amount: number): Promise<AIPortfolio | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: GPT_SYSTEM },
        { role: 'user', content: getPortfolioPrompt(amount) },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    return buildPortfolio(data, amount, 'gpt', 'G.P. Taylor');
  } catch (error) {
    console.error('GPT portfolio error:', error);
    return null;
  }
}

function buildPortfolio(
  data: {
    strategy: string;
    strategyDetail?: string;
    riskLevel: 'conservative' | 'balanced' | 'aggressive';
    cashWeight: number;
    cashReason?: string;
    holdings: { 
      name: string; 
      weight: number; 
      rationale: string;
      weightReason?: string;
      riskFactors?: string;
      targetReturn?: string;
    }[];
  },
  amount: number,
  character: CharacterType,
  characterName: string
): AIPortfolio {
  const cashWeight = Math.min(Math.max(data.cashWeight, 0), 30);
  const cashAmount = Math.floor(amount * (cashWeight / 100));
  const investAmount = amount - cashAmount;

  // 비중 정규화
  const totalHoldingsWeight = data.holdings.reduce((sum, h) => sum + h.weight, 0);
  const normalizedHoldings = data.holdings.map(h => ({
    ...h,
    weight: (h.weight / totalHoldingsWeight) * (100 - cashWeight)
  }));

  const holdings: PortfolioItem[] = normalizedHoldings.map(holding => {
    const stock = AVAILABLE_STOCKS.find(s => s.name === holding.name);
    if (!stock) {
      // 종목을 찾지 못한 경우 삼성전자로 대체
      const fallback = AVAILABLE_STOCKS[0];
      const stockAmount = Math.floor(investAmount * (holding.weight / (100 - cashWeight)));
      const shares = Math.floor(stockAmount / fallback.price);
      return {
        code: fallback.code,
        name: fallback.name,
        sector: fallback.sector,
        weight: Number(holding.weight.toFixed(1)),
        amount: shares * fallback.price,
        shares,
        price: fallback.price,
        rationale: holding.rationale,
        weightReason: holding.weightReason || '포트폴리오 균형을 위한 적정 비중',
        riskFactors: holding.riskFactors || '시장 변동성에 따른 리스크',
        targetReturn: holding.targetReturn || '+10~15%',
      };
    }

    const stockAmount = Math.floor(investAmount * (holding.weight / (100 - cashWeight)));
    const shares = Math.floor(stockAmount / stock.price);
    
    return {
      code: stock.code,
      name: stock.name,
      sector: stock.sector,
      weight: Number(holding.weight.toFixed(1)),
      amount: shares * stock.price,
      shares,
      price: stock.price,
      rationale: holding.rationale,
      weightReason: holding.weightReason || '포트폴리오 균형을 위한 적정 비중',
      riskFactors: holding.riskFactors || '시장 변동성에 따른 리스크',
      targetReturn: holding.targetReturn || '+10~15%',
    };
  }).filter(h => h.shares > 0); // 주식 수가 0인 경우 제외

  // 실제 투자 금액 기반으로 현금 비중 재계산
  const totalInvested = holdings.reduce((sum, h) => sum + h.amount, 0);
  const actualCashAmount = amount - totalInvested;
  const actualCashWeight = Number(((actualCashAmount / amount) * 100).toFixed(1));

  // 각 종목의 실제 비중도 재계산
  const holdingsWithActualWeight = holdings.map(h => ({
    ...h,
    weight: Number(((h.amount / amount) * 100).toFixed(1)),
  }));

  return {
    character,
    characterName,
    cashWeight: actualCashWeight,
    cashAmount: actualCashAmount,
    cashReason: data.cashReason || '시장 변동성 대비 및 추가 매수 여력 확보',
    holdings: holdingsWithActualWeight,
    totalInvested,
    riskLevel: data.riskLevel || 'balanced',
    strategy: data.strategy,
    strategyDetail: data.strategyDetail || '',
  };
}

// Fallback 포트폴리오 생성 (AI 실패 시)
function generateFallbackPortfolio(
  amount: number,
  character: CharacterType,
  characterName: string
): AIPortfolio {
  const configs = {
    claude: {
      cashWeight: 12,
      cashReason: '시장 조정 시 추가 매수 여력을 확보하고, 변동성에 대비한 적정 현금 비중입니다.',
      riskLevel: 'balanced' as const,
      stocks: ['삼성전자', 'SK하이닉스', 'KB금융', '현대차', 'LG화학'],
      strategy: '밸류에이션 기반의 분산 투자 전략. 대형 우량주 중심으로 안정적인 수익을 추구합니다.',
      strategyDetail: 'PER, PBR 등 밸류에이션 지표가 매력적인 종목 위주로 선별하며, 섹터 간 분산을 통해 리스크를 관리합니다.',
    },
    gemini: {
      cashWeight: 7,
      cashReason: '성장 기회를 최대한 활용하기 위해 현금 비중을 최소화했습니다. 상승장에서 수익 극대화를 추구합니다.',
      riskLevel: 'aggressive' as const,
      stocks: ['SK하이닉스', 'LG에너지솔루션', '삼성SDI', '삼성바이오로직스', 'NAVER'],
      strategy: '성장주 집중 투자 전략. AI, 2차전지, 바이오 등 메가트렌드 수혜 종목에 과감하게 배팅합니다.',
      strategyDetail: '미래 산업을 주도할 혁신 기업에 집중하며, 단기 변동성보다 장기 성장 잠재력에 주목합니다.',
    },
    gpt: {
      cashWeight: 22,
      cashReason: '현재 거시경제 불확실성이 높은 시점에서 충분한 현금을 확보하여 리스크를 관리합니다.',
      riskLevel: 'conservative' as const,
      stocks: ['삼성전자', 'KB금융', '신한지주', '현대차', '포스코홀딩스'],
      strategy: '리스크 관리 중심의 보수적 전략. 높은 현금 비중으로 시장 변동성에 대비합니다.',
      strategyDetail: '배당 수익률이 높은 금융주와 대형 가치주 중심으로 안정적인 포트폴리오를 구성합니다.',
    },
  };

  const config = configs[character];
  const cashAmount = Math.floor(amount * (config.cashWeight / 100));
  const investAmount = amount - cashAmount;
  const weightPerStock = (100 - config.cashWeight) / config.stocks.length;

  const fallbackRationales: Record<string, { rationale: string; weightReason: string; riskFactors: string; targetReturn: string }> = {
    '삼성전자': { 
      rationale: 'PBR 1배 미만의 역사적 저평가 상태. 반도체 업황 회복 시 강한 실적 개선이 기대됩니다.',
      weightReason: '대형주로서 포트폴리오 안정성을 제공하며, 배당 수익도 기대할 수 있습니다.',
      riskFactors: '반도체 업황 부진 지속, 중국 경쟁 심화',
      targetReturn: '+15~25%'
    },
    'SK하이닉스': {
      rationale: 'HBM 시장 점유율 1위. AI 서버 수요 증가로 실적 성장이 기대됩니다.',
      weightReason: 'AI 테마의 핵심 수혜주로 높은 성장 잠재력을 반영한 비중입니다.',
      riskFactors: 'AI 투자 둔화, 메모리 가격 하락',
      targetReturn: '+20~35%'
    },
    'KB금융': {
      rationale: '국내 1위 금융지주. 안정적인 배당(5%+)과 낮은 PBR(0.4배)이 매력적입니다.',
      weightReason: '방어적 성격과 배당 수익으로 포트폴리오 안정성을 높입니다.',
      riskFactors: '금리 인하 시 NIM 축소, 부동산 리스크',
      targetReturn: '+10~15%'
    },
    '현대차': {
      rationale: '글로벌 전기차 시장 점유율 확대 중. 밸류에이션 대비 성장성이 우수합니다.',
      weightReason: '전통 자동차와 전기차 전환의 균형을 갖춘 안정적 성장주입니다.',
      riskFactors: '전기차 경쟁 심화, 환율 변동',
      targetReturn: '+15~20%'
    },
    'LG화학': {
      rationale: '양극재 사업 성장과 화학 부문 실적 개선이 기대됩니다.',
      weightReason: '2차전지 소재주로서 성장성과 방어력을 동시에 제공합니다.',
      riskFactors: '2차전지 수요 둔화, 원자재 가격 변동',
      targetReturn: '+15~25%'
    },
    'LG에너지솔루션': {
      rationale: '글로벌 배터리 시장 Top 3. IRA 보조금 수혜로 북미 시장 확대 중입니다.',
      weightReason: '2차전지 핵심 기업으로 높은 성장 잠재력을 반영했습니다.',
      riskFactors: '전기차 수요 둔화, 중국 업체 경쟁',
      targetReturn: '+20~30%'
    },
    '삼성SDI': {
      rationale: '전고체 배터리 기술 리더십. BMW, 리비안 등 프리미엄 고객 보유.',
      weightReason: '기술 경쟁력 기반의 장기 성장주로 적정 비중을 배분했습니다.',
      riskFactors: '기술 개발 지연, 고객사 수요 변동',
      targetReturn: '+15~25%'
    },
    '삼성바이오로직스': {
      rationale: 'CMO 시장 성장과 바이오시밀러 확대. 글로벌 제약사 수주 증가 중입니다.',
      weightReason: '바이오 섹터 대표주로 성장성과 방어력을 동시에 갖추고 있습니다.',
      riskFactors: 'CMO 경쟁 심화, 수주 불확실성',
      targetReturn: '+10~20%'
    },
    'NAVER': {
      rationale: '국내 1위 플랫폼. 글로벌 AI 서비스 확장과 광고 매출 성장이 기대됩니다.',
      weightReason: 'IT 플랫폼 대표주로 포트폴리오 다각화에 기여합니다.',
      riskFactors: 'AI 경쟁 심화, 광고 경기 둔화',
      targetReturn: '+15~25%'
    },
    '신한지주': {
      rationale: '안정적 자산 건전성과 꾸준한 배당 정책. PBR 0.4배로 저평가 상태입니다.',
      weightReason: '배당주로서 안정적인 현금흐름을 제공합니다.',
      riskFactors: '금리 인하, 부동산 익스포저',
      targetReturn: '+8~15%'
    },
    '포스코홀딩스': {
      rationale: '철강 본업 개선과 2차전지 소재(리튬/니켈) 사업 다각화 진행 중입니다.',
      weightReason: '경기 민감주이지만 소재 사업 확장으로 성장성을 갖추고 있습니다.',
      riskFactors: '철강 경기 둔화, 원자재 가격 변동',
      targetReturn: '+10~20%'
    },
  };

  const holdings: PortfolioItem[] = config.stocks.map(name => {
    const stock = AVAILABLE_STOCKS.find(s => s.name === name)!;
    const stockAmount = Math.floor(investAmount / config.stocks.length);
    const shares = Math.floor(stockAmount / stock.price);
    const details = fallbackRationales[name] || {
      rationale: `${stock.sector} 섹터 대표 종목으로 선정했습니다.`,
      weightReason: '포트폴리오 균형을 위한 적정 비중입니다.',
      riskFactors: '시장 변동성 리스크',
      targetReturn: '+10~15%'
    };
    
    return {
      code: stock.code,
      name: stock.name,
      sector: stock.sector,
      weight: Number(weightPerStock.toFixed(1)),
      amount: shares * stock.price,
      shares,
      price: stock.price,
      rationale: details.rationale,
      weightReason: details.weightReason,
      riskFactors: details.riskFactors,
      targetReturn: details.targetReturn,
    };
  }).filter(h => h.shares > 0);

  // 실제 투자 금액 기반으로 현금 비중 재계산
  const totalInvested = holdings.reduce((sum, h) => sum + h.amount, 0);
  const actualCashAmount = amount - totalInvested;
  const actualCashWeight = Number(((actualCashAmount / amount) * 100).toFixed(1));

  // 각 종목의 실제 비중도 재계산
  const holdingsWithActualWeight = holdings.map(h => ({
    ...h,
    weight: Number(((h.amount / amount) * 100).toFixed(1)),
  }));

  return {
    character,
    characterName,
    cashWeight: actualCashWeight,
    cashAmount: actualCashAmount,
    cashReason: config.cashReason,
    holdings: holdingsWithActualWeight,
    totalInvested,
    riskLevel: config.riskLevel,
    strategy: config.strategy,
    strategyDetail: config.strategyDetail,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();
    
    if (!amount || amount < 1000000) {
      return NextResponse.json(
        { success: false, error: 'Minimum investment is 1,000,000원' },
        { status: 400 }
      );
    }
    
    // 실시간 주가 가져오기
    await fetchRealTimePrices();
    
    const today = new Date().toISOString().split('T')[0];
    
    // 병렬로 3개 AI 호출
    const [claudeResult, geminiResult, gptResult] = await Promise.all([
      generateClaudePortfolio(amount),
      generateGeminiPortfolio(amount),
      generateGPTPortfolio(amount),
    ]);

    // AI 실패 시 fallback 사용
    const portfolios: AIPortfolio[] = [
      claudeResult || generateFallbackPortfolio(amount, 'claude', 'Claude Lee'),
      geminiResult || generateFallbackPortfolio(amount, 'gemini', 'Gemi Nine'),
      gptResult || generateFallbackPortfolio(amount, 'gpt', 'G.P. Taylor'),
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        amount,
        generatedAt: today,
        portfolios,
      },
    });
  } catch (error) {
    console.error('Portfolio generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate portfolios' },
      { status: 500 }
    );
  }
}
