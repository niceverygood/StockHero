import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchMultipleStockPrices } from '@/lib/market-data/kis';

// Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AI Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// 분석 대상 종목
const ANALYSIS_STOCKS = [
  { symbol: '005930', name: '삼성전자', sector: '반도체', per: 15.2, pbr: 1.1, roe: 8.5, dividend: 1.8, growth: 10.5 },
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체', per: 8.5, pbr: 1.8, roe: 22.1, dividend: 0.5, growth: 45.2 },
  { symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지', per: 45.0, pbr: 3.5, roe: 15.0, dividend: 0.3, growth: 35.5 },
  { symbol: '207940', name: '삼성바이오로직스', sector: '바이오', per: 60.0, pbr: 5.0, roe: 10.0, dividend: 0.1, growth: 20.0 },
  { symbol: '005380', name: '현대차', sector: '자동차', per: 7.0, pbr: 0.7, roe: 12.0, dividend: 3.0, growth: 8.0 },
  { symbol: '006400', name: '삼성SDI', sector: '2차전지', per: 30.0, pbr: 2.0, roe: 13.0, dividend: 0.4, growth: 28.0 },
  { symbol: '035720', name: '카카오', sector: 'IT서비스', per: 28.0, pbr: 1.5, roe: 7.0, dividend: 0.2, growth: 18.0 },
  { symbol: '035420', name: 'NAVER', sector: 'IT서비스', per: 22.0, pbr: 1.2, roe: 9.0, dividend: 0.3, growth: 15.0 },
  { symbol: '051910', name: 'LG화학', sector: '화학', per: 18.0, pbr: 1.0, roe: 11.0, dividend: 1.5, growth: 12.0 },
  { symbol: '000270', name: '기아', sector: '자동차', per: 6.5, pbr: 0.6, roe: 13.0, dividend: 3.5, growth: 9.0 },
  { symbol: '105560', name: 'KB금융', sector: '금융', per: 6.2, pbr: 0.52, roe: 9.8, dividend: 5.1, growth: 5.0 },
  { symbol: '055550', name: '신한지주', sector: '금융', per: 5.8, pbr: 0.48, roe: 9.5, dividend: 4.8, growth: 4.5 },
  { symbol: '068270', name: '셀트리온', sector: '바이오', per: 50.0, pbr: 4.0, roe: 11.0, dividend: 0.2, growth: 18.0 },
  { symbol: '003670', name: '포스코홀딩스', sector: '철강', per: 12.0, pbr: 0.7, roe: 7.0, dividend: 2.5, growth: 7.0 },
  { symbol: '066570', name: 'LG전자', sector: '가전', per: 10.0, pbr: 0.8, roe: 10.0, dividend: 1.0, growth: 6.0 },
  { symbol: '017670', name: 'SK텔레콤', sector: '통신', per: 10.5, pbr: 0.85, roe: 8.2, dividend: 4.2, growth: 3.0 },
  { symbol: '030200', name: 'KT', sector: '통신', per: 9.0, pbr: 0.7, roe: 7.0, dividend: 4.5, growth: 2.5 },
  { symbol: '032830', name: '삼성생명', sector: '보험', per: 7.5, pbr: 0.75, roe: 6.5, dividend: 3.8, growth: 4.0 },
  { symbol: '086790', name: '하나금융지주', sector: '금융', per: 5.2, pbr: 0.45, roe: 10.2, dividend: 5.5, growth: 6.0 },
  { symbol: '009150', name: '삼성전기', sector: '전자부품', per: 18.0, pbr: 1.3, roe: 12.0, dividend: 0.8, growth: 10.0 },
];

// Claude 분석
async function analyzeWithClaude(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, PER ${s.per}, PBR ${s.pbr}, ROE ${s.roe}%, 배당 ${s.dividend}%`;
  }).join('\n');

  const prompt = `당신은 펀더멘털 분석가입니다. 아래 종목들 중 저평가된 우량주 Top 5를 선정하세요.
  
종목 목록:
${stockList}

JSON 형식으로 응답:
{"top5":[{"rank":1,"symbol":"코드","name":"종목명","score":4.5,"reason":"분석이유"}]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content.find(b => b.type === 'text');
    const jsonMatch = (text as any)?.text?.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]).top5;
  } catch (error) {
    console.error('Claude error:', error);
  }
  return [];
}

// Gemini 분석
async function analyzeWithGemini(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 성장률 ${s.growth}%, 섹터: ${s.sector}`;
  }).join('\n');

  const prompt = `당신은 성장주 투자자입니다. 아래 종목들 중 성장 잠재력이 높은 Top 5를 선정하세요.

종목 목록:
${stockList}

JSON 형식으로 응답:
{"top5":[{"rank":1,"symbol":"코드","name":"종목명","score":4.8,"reason":"분석이유"}]}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]).top5;
  } catch (error) {
    console.error('Gemini error:', error);
  }
  return [];
}

// GPT 분석
async function analyzeWithGPT(stocks: typeof ANALYSIS_STOCKS, realPrices: Map<string, any>): Promise<any[]> {
  const stockList = stocks.map(s => {
    const realPrice = realPrices.get(s.symbol);
    return `${s.name}(${s.symbol}): 현재가 ${realPrice?.price?.toLocaleString() || 'N/A'}원, 배당 ${s.dividend}%, 섹터: ${s.sector}`;
  }).join('\n');

  const prompt = `당신은 방어주 투자자입니다. 아래 종목들 중 배당과 안정성이 높은 Top 5를 선정하세요.

종목 목록:
${stockList}

JSON 형식으로 응답:
{"top5":[{"rank":1,"symbol":"코드","name":"종목명","score":4.2,"reason":"분석이유"}]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    });
    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]).top5;
  } catch (error) {
    console.error('GPT error:', error);
  }
  return [];
}

// 점수 합산 및 Top 5 선정
interface StockScore {
  symbol: string;
  name: string;
  claudeScore: number;
  geminiScore: number;
  gptScore: number;
  reasons: string[];
}

function aggregateTop5(claudeTop5: any[], geminiTop5: any[], gptTop5: any[], realPrices: Map<string, any>): any[] {
  const scoreMap = new Map<string, StockScore>();

  // Claude 점수 집계
  claudeTop5.forEach((item, idx) => {
    const existing: StockScore = scoreMap.get(item.symbol) || { symbol: item.symbol, name: item.name, claudeScore: 0, geminiScore: 0, gptScore: 0, reasons: [] as string[] };
    existing.claudeScore = item.score || (5 - idx * 0.5);
    existing.reasons.push(`클로드: ${item.reason}`);
    scoreMap.set(item.symbol, existing);
  });

  // Gemini 점수 집계
  geminiTop5.forEach((item, idx) => {
    const existing: StockScore = scoreMap.get(item.symbol) || { symbol: item.symbol, name: item.name, claudeScore: 0, geminiScore: 0, gptScore: 0, reasons: [] as string[] };
    existing.geminiScore = item.score || (5 - idx * 0.5);
    if (item.name) existing.name = item.name;
    existing.reasons.push(`제미나인: ${item.reason}`);
    scoreMap.set(item.symbol, existing);
  });

  // GPT 점수 집계
  gptTop5.forEach((item, idx) => {
    const existing: StockScore = scoreMap.get(item.symbol) || { symbol: item.symbol, name: item.name, claudeScore: 0, geminiScore: 0, gptScore: 0, reasons: [] as string[] };
    existing.gptScore = item.score || (5 - idx * 0.5);
    if (item.name) existing.name = item.name;
    existing.reasons.push(`쥐피테일러: ${item.reason}`);
    scoreMap.set(item.symbol, existing);
  });

  // 총점 계산 및 정렬
  const aggregated = Array.from(scoreMap.values())
    .map(item => {
      const realPrice = realPrices.get(item.symbol);
      const totalScore = item.claudeScore + item.geminiScore + item.gptScore;
      const avgScore = totalScore / 3;
      const votedBy = [
        item.claudeScore > 0 ? 'claude' : null,
        item.geminiScore > 0 ? 'gemini' : null,
        item.gptScore > 0 ? 'gpt' : null,
      ].filter(Boolean);

      return {
        symbol: item.symbol,
        name: item.name || ANALYSIS_STOCKS.find(s => s.symbol === item.symbol)?.name || item.symbol,
        totalScore,
        avgScore: Math.round(avgScore * 10) / 10,
        claudeScore: item.claudeScore,
        geminiScore: item.geminiScore,
        gptScore: item.gptScore,
        votedBy,
        isUnanimous: votedBy.length === 3,
        currentPrice: realPrice?.price || 0,
        change: realPrice?.change || 0,
        changePercent: realPrice?.changePercent || 0,
        reasons: item.reasons,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return aggregated;
}

export async function GET(request: NextRequest) {
  // Verify cron secret (for security in production)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In development, allow without auth
  if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 한국 시간 기준 오늘 날짜
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
  const today = kstTime.toISOString().split('T')[0];
  console.log(`[${today}] Starting daily verdict generation...`);

  try {
    // 1. 오늘 이미 생성된 verdict가 있는지 확인
    const { data: existingVerdict } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', today)
      .single();

    if (existingVerdict) {
      console.log(`[${today}] Verdict already exists for today`);
      return NextResponse.json({ 
        success: true, 
        message: 'Verdict already exists for today',
        verdict: existingVerdict 
      });
    }

    // 2. 실시간 가격 조회
    const symbols = ANALYSIS_STOCKS.map(s => s.symbol);
    let realPrices: Map<string, any> = new Map();
    
    try {
      realPrices = await fetchMultipleStockPrices(symbols);
      console.log(`[${today}] Fetched real-time prices for ${realPrices.size} stocks`);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }

    // 3. 각 AI 분석 수행 (병렬)
    console.log(`[${today}] Running AI analysis...`);
    const [claudeTop5, geminiTop5, gptTop5] = await Promise.all([
      analyzeWithClaude(ANALYSIS_STOCKS, realPrices),
      analyzeWithGemini(ANALYSIS_STOCKS, realPrices),
      analyzeWithGPT(ANALYSIS_STOCKS, realPrices),
    ]);

    console.log(`[${today}] Claude: ${claudeTop5.length}, Gemini: ${geminiTop5.length}, GPT: ${gptTop5.length}`);

    // 4. 점수 합산 및 Top 5 선정
    const top5 = aggregateTop5(claudeTop5, geminiTop5, gptTop5, realPrices);

    if (top5.length === 0) {
      throw new Error('Failed to generate Top 5');
    }

    // 5. Verdict 저장
    const consensusSummary = `오늘 ${top5.filter(t => t.isUnanimous).length}개 종목이 3명의 AI 분석가 만장일치 추천을 받았습니다. 1위 ${top5[0]?.name}(${top5[0]?.symbol})은 평균 ${top5[0]?.avgScore}점을 기록했습니다.`;

    const { data: verdict, error } = await supabase
      .from('verdicts')
      .insert({
        date: today,
        top5: top5,
        consensus_summary: consensusSummary,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[${today}] Verdict saved successfully!`);
    console.log('Top 5:', top5.map(t => `${t.rank}. ${t.name}`).join(', '));

    // 6. Predictions 저장
    for (const stock of top5) {
      await supabase.from('predictions').insert({
        verdict_id: verdict.id,
        symbol_code: stock.symbol,
        symbol_name: stock.name,
        predicted_direction: stock.avgScore >= 4 ? 'up' : stock.avgScore >= 3 ? 'hold' : 'down',
        avg_score: stock.avgScore,
        date: today,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Daily verdict generated and saved',
      date: today,
      verdict: {
        id: verdict.id,
        top5: top5.map(t => ({
          rank: t.rank,
          symbol: t.symbol,
          name: t.name,
          avgScore: t.avgScore,
          isUnanimous: t.isUnanimous,
        })),
        consensusSummary,
      },
    });

  } catch (error: any) {
    console.error(`[${today}] Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate verdict' },
      { status: 500 }
    );
  }
}

