export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/llm';
import { createDebateMessage, updateDebateSession } from '@/lib/supabase';

// Mock current prices for stocks
const STOCK_PRICES: Record<string, number> = {
  '005930': 71500, // 삼성전자
  '000660': 178000, // SK하이닉스
  '373220': 385000, // LG에너지솔루션
  '207940': 782000, // 삼성바이오로직스
  '005380': 242000, // 현대차
  '006400': 352000, // 삼성SDI
  '035720': 42500, // 카카오
  '035420': 192000, // NAVER
  '051910': 298000, // LG화학
  '000270': 94800, // 기아
  '105560': 82400, // KB금융
  '055550': 51200, // 신한지주
  '068270': 178500, // 셀트리온
  '003670': 298000, // 포스코홀딩스
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Debate next request body:', body);
    
    const { sessionId, round, symbol, symbolName, currentPrice } = body;

    if (!sessionId) {
      console.error('Missing sessionId in request');
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    if (!round) {
      console.error('Missing round in request');
      return NextResponse.json(
        { success: false, error: 'Missing round' },
        { status: 400 }
      );
    }

    const finalSymbol = symbol || '005930';
    const finalSymbolName = symbolName || '삼성전자';
    const finalCurrentPrice = currentPrice || STOCK_PRICES[finalSymbol] || 70000;

    console.log(`Generating round ${round} for ${finalSymbol} (${finalSymbolName}) at price ${finalCurrentPrice}`);

    const orchestrator = getOrCreateSession(sessionId);
    orchestrator.setCurrentPrice(finalCurrentPrice);
    const messages = await orchestrator.generateRound(finalSymbol, finalSymbolName, round);

    console.log(`Generated ${messages.length} messages`);

    // Try to save messages to Supabase
    const savedMessages = [];
    for (const msg of messages) {
      try {
        const saved = await createDebateMessage(
          sessionId,
          msg.character,
          msg.content,
          msg.score,
          msg.risks,
          msg.sources,
          round
        );
        savedMessages.push({
          id: saved.id,
          character: msg.character,
          content: msg.content,
          score: msg.score,
          risks: msg.risks,
          sources: msg.sources,
          targetPrice: msg.targetPrice,
          targetDate: msg.targetDate,
          priceRationale: msg.priceRationale,
          dateRationale: msg.dateRationale,
          methodology: msg.methodology,
          createdAt: saved.created_at,
        });
      } catch (e) {
        console.log('Failed to save message to Supabase:', e);
        // Use local message if Supabase fails
        savedMessages.push({
          id: `${sessionId}-${msg.character}-${round}-${messages.indexOf(msg)}`,
          character: msg.character,
          content: msg.content,
          score: msg.score,
          risks: msg.risks,
          sources: msg.sources,
          targetPrice: msg.targetPrice,
          targetDate: msg.targetDate,
          priceRationale: msg.priceRationale,
          dateRationale: msg.dateRationale,
          methodology: msg.methodology,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Try to update session round
    try {
      await updateDebateSession(sessionId, { current_round: round });
    } catch (e) {
      console.log('Failed to update session round:', e);
    }

    // Get current targets summary and consensus
    const targets = orchestrator.getTargets();
    const consensus = orchestrator.getConsensus();

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        round,
        currentPrice: finalCurrentPrice,
        messages: savedMessages,
        targets,
        consensus,  // 합의 도출 결과 (3명 모두 목표가 제시 시)
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
