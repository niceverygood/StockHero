import { NextRequest, NextResponse } from 'next/server';

// OpenRouter API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice?: number;
}

interface AIAdvice {
  symbol: string;
  name: string;
  action: 'hold' | 'increase' | 'decrease' | 'sell';
  reason: string;
}

async function getAIAnalysis(portfolio: PortfolioItem[], model: string): Promise<any> {
  const portfolioText = portfolio.map(p => 
    `- ${p.name}(${p.symbol}): ${p.quantity}주${p.avgPrice ? `, 평균단가 ${p.avgPrice.toLocaleString()}원` : ''}`
  ).join('\n');

  const prompt = `당신은 투자 분석 전문가입니다. 다음 포트폴리오를 분석해주세요.

[포트폴리오]
${portfolioText}

다음 JSON 형식으로만 응답하세요:
{
  "riskLevel": "low" | "medium" | "high",
  "diversificationScore": 1-10 점수,
  "advice": [
    {
      "symbol": "종목코드",
      "name": "종목명",
      "action": "hold" | "increase" | "decrease" | "sell",
      "reason": "20자 이내 간단한 이유"
    }
  ],
  "summary": "50자 이내 종합 의견"
}

JSON만 출력하세요.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse AI response');
}

export async function POST(request: NextRequest) {
  try {
    const { portfolio } = await request.json();
    
    if (!portfolio || portfolio.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Portfolio is empty' },
        { status: 400 }
      );
    }

    // Get analysis from multiple AIs
    const models = [
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.0-flash-001',
      'openai/gpt-4o',
    ];

    let bestAnalysis = null;
    let lastError = null;

    // Try each model until one succeeds
    for (const model of models) {
      try {
        const analysis = await getAIAnalysis(portfolio, model);
        
        // Validate structure
        if (analysis.riskLevel && analysis.advice && analysis.summary) {
          // Ensure all portfolio items have advice
          const adviceMap = new Map(analysis.advice.map((a: any) => [a.symbol, a]));
          const completeAdvice = portfolio.map((p: PortfolioItem) => {
            const existing = adviceMap.get(p.symbol);
            if (existing) return existing;
            return {
              symbol: p.symbol,
              name: p.name,
              action: 'hold',
              reason: '추가 분석 필요',
            };
          });

          bestAnalysis = {
            ...analysis,
            advice: completeAdvice,
          };
          break;
        }
      } catch (e) {
        lastError = e;
        console.error(`Model ${model} failed:`, e);
        continue;
      }
    }

    if (!bestAnalysis) {
      // Fallback response
      bestAnalysis = {
        riskLevel: portfolio.length < 3 ? 'high' : portfolio.length < 5 ? 'medium' : 'low',
        diversificationScore: Math.min(portfolio.length * 2, 10),
        advice: portfolio.map((p: PortfolioItem) => ({
          symbol: p.symbol,
          name: p.name,
          action: 'hold' as const,
          reason: '현재 상태 유지 권장',
        })),
        summary: `${portfolio.length}개 종목 보유 중. ${portfolio.length < 3 ? '분산투자를 권장합니다.' : '적절한 분산투자 상태입니다.'}`,
      };
    }

    return NextResponse.json({
      success: true,
      analysis: bestAnalysis,
    });

  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze portfolio' },
      { status: 500 }
    );
  }
}
