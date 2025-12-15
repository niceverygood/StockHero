import { NextRequest, NextResponse } from 'next/server';
import { createOrchestrator } from '@/lib/llm';
import type { LLMContext } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, symbol, symbolName, sector, round, previousMessages = [] } = body;

    if (!sessionId || !symbol || !symbolName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const orchestrator = createOrchestrator();
    
    const context: LLMContext = {
      symbol,
      symbolName,
      sector: sector || '기타',
      round: round + 1,
      previousMessages: previousMessages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    };

    const result = await orchestrator.generateRound(context);

    const newMessages = result.messages.map((msg, idx) => ({
      id: `${sessionId}-${msg.role.toLowerCase()}-${round + 1}-${idx}`,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      score: msg.score,
      risks: msg.risks,
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        round: round + 1,
        messages: newMessages,
        consensusScore: result.consensusScore,
        hasConsensus: result.hasConsensus,
      },
    });
  } catch (error) {
    console.error('Debate next error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate next round' },
      { status: 500 }
    );
  }
}

