import { NextRequest, NextResponse } from 'next/server';
import { DebateOrchestrator } from '@/lib/llm';
import type { CharacterType } from '@/lib/llm';

// Korean stocks to analyze
const CANDIDATE_STOCKS = [
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
  { code: '096770', name: 'SK이노베이션', sector: '에너지' },
  { code: '034730', name: 'SK', sector: '지주' },
  { code: '003550', name: 'LG', sector: '지주' },
  { code: '066570', name: 'LG전자', sector: '가전' },
  { code: '028260', name: '삼성물산', sector: '건설' },
  { code: '012330', name: '현대모비스', sector: '자동차부품' },
  { code: '068270', name: '셀트리온', sector: '바이오' },
  { code: '003670', name: '포스코홀딩스', sector: '철강' },
];

// In-memory storage for today's verdict (in production, use DB)
let todayVerdict: {
  date: string;
  top5: Array<{
    rank: number;
    symbolCode: string;
    symbolName: string;
    sector: string;
    avgScore: number;
    scores: { claude: number; gemini: number; gpt: number };
    rationale: string;
  }>;
  isGenerated: boolean;
  generatedAt: string;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if already generated today
    if (todayVerdict && todayVerdict.date === todayStr) {
      return NextResponse.json({
        success: true,
        data: todayVerdict,
        cached: true,
      });
    }

    const stockScores: Array<{
      stock: typeof CANDIDATE_STOCKS[0];
      scores: { claude: number; gemini: number; gpt: number };
      avgScore: number;
      rationale: string;
    }> = [];

    // Analyze each stock with all 3 AIs
    for (const stock of CANDIDATE_STOCKS) {
      const orchestrator = new DebateOrchestrator();
      orchestrator.setCurrentPrice(50000); // Default price

      try {
        const messages = await orchestrator.generateRound(stock.code, stock.name, 1);
        
        const scores = {
          claude: 3,
          gemini: 3,
          gpt: 3,
        };

        let rationale = '';
        messages.forEach((msg) => {
          const charType = msg.character.toLowerCase() as CharacterType;
          if (charType in scores) {
            scores[charType as 'claude' | 'gemini' | 'gpt'] = msg.score;
          }
          rationale += `[${msg.character}] ${msg.content.substring(0, 100)}... `;
        });

        const avgScore = (scores.claude + scores.gemini + scores.gpt) / 3;

        stockScores.push({
          stock,
          scores,
          avgScore,
          rationale: rationale.substring(0, 300),
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error analyzing ${stock.name}:`, error);
        // Skip this stock on error
      }
    }

    // Sort by average score and get top 5
    stockScores.sort((a, b) => b.avgScore - a.avgScore);
    const top5 = stockScores.slice(0, 5).map((item, i) => ({
      rank: i + 1,
      symbolCode: item.stock.code,
      symbolName: item.stock.name,
      sector: item.stock.sector,
      avgScore: Number(item.avgScore.toFixed(2)),
      scores: item.scores,
      rationale: item.rationale,
    }));

    todayVerdict = {
      date: todayStr,
      top5,
      isGenerated: true,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: todayVerdict,
      cached: false,
    });
  } catch (error) {
    console.error('Generate today verdict error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate today verdict' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (todayVerdict && todayVerdict.date === todayStr) {
    return NextResponse.json({
      success: true,
      data: todayVerdict,
    });
  }

  return NextResponse.json({
    success: false,
    data: null,
    message: 'Today verdict not generated yet',
  });
}


