import { NextRequest, NextResponse } from 'next/server';
import { createOrchestrator } from '@/lib/llm';
import { selectTop5, generateRationale, type SymbolEvaluation } from '@/lib/scoring';

// Mock symbols for evaluation
const CANDIDATE_SYMBOLS = [
  { id: '1', symbol: '005930', name: '삼성전자', sector: '반도체' },
  { id: '2', symbol: '000660', name: 'SK하이닉스', sector: '반도체' },
  { id: '3', symbol: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
  { id: '4', symbol: '207940', name: '삼성바이오로직스', sector: '바이오' },
  { id: '5', symbol: '005380', name: '현대차', sector: '자동차' },
  { id: '6', symbol: '006400', name: '삼성SDI', sector: '2차전지' },
  { id: '7', symbol: '035720', name: '카카오', sector: 'IT서비스' },
  { id: '8', symbol: '035420', name: 'NAVER', sector: 'IT서비스' },
  { id: '9', symbol: '051910', name: 'LG화학', sector: '화학' },
  { id: '10', symbol: '068270', name: '셀트리온', sector: '바이오' },
  { id: '11', symbol: '028260', name: '삼성물산', sector: '지주' },
  { id: '12', symbol: '105560', name: 'KB금융', sector: '금융' },
  { id: '13', symbol: '055550', name: '신한지주', sector: '금융' },
  { id: '14', symbol: '066570', name: 'LG전자', sector: '가전' },
  { id: '15', symbol: '012330', name: '현대모비스', sector: '자동차부품' },
  { id: '16', symbol: '003670', name: '포스코홀딩스', sector: '철강' },
  { id: '17', symbol: '000270', name: '기아', sector: '자동차' },
  { id: '18', symbol: '034730', name: 'SK', sector: '지주' },
  { id: '19', symbol: '096770', name: 'SK이노베이션', sector: '에너지' },
  { id: '20', symbol: '003550', name: 'LG', sector: '지주' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    const targetDate = date || new Date().toISOString().split('T')[0];
    const orchestrator = createOrchestrator();

    // Evaluate all candidates
    const evaluations: SymbolEvaluation[] = [];

    for (const candidate of CANDIDATE_SYMBOLS) {
      const result = await orchestrator.evaluateSymbol(
        candidate.symbol,
        candidate.name,
        candidate.sector
      );

      const evaluation: SymbolEvaluation = {
        symbolId: candidate.id,
        symbol: candidate.symbol,
        name: candidate.name,
        sector: candidate.sector,
        scores: result.scores,
        avgScore: result.avgScore,
        riskFlags: result.riskFlags,
        hasUnanimous: result.hasConsensus,
        rationale: '',
      };
      
      evaluation.rationale = generateRationale(evaluation);
      evaluations.push(evaluation);
    }

    // Select top 5 using consensus rules
    const top5Result = selectTop5(evaluations);

    // Format for storage
    const verdict = {
      id: `verdict-${targetDate}`,
      date: targetDate,
      top5: top5Result.top5.map((e, idx) => ({
        rank: idx + 1,
        symbolId: e.symbolId,
        symbol: e.symbol,
        name: e.name,
        avgScore: e.avgScore,
        rationale: e.rationale,
        hasUnanimous: e.hasUnanimous,
        riskFlags: e.riskFlags,
      })),
      rationale: top5Result.rationale,
      totalCandidates: top5Result.totalCandidates,
      unanimousCount: top5Result.unanimousCount,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: verdict,
    });
  } catch (error) {
    console.error('Verdict generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate verdict' },
      { status: 500 }
    );
  }
}

