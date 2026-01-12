import { NextRequest } from 'next/server';
import { getOrCreateSession } from '@/lib/llm';
import { createDebateMessage, updateDebateSession } from '@/lib/supabase';
import type { CharacterType } from '@/lib/types';

// Mock current prices for stocks
const STOCK_PRICES: Record<string, number> = {
  '005930': 71500,
  '000660': 178000,
  '373220': 385000,
  '207940': 782000,
  '005380': 242000,
  '006400': 352000,
  '035720': 42500,
  '035420': 192000,
  '051910': 298000,
  '000270': 94800,
  '105560': 82400,
  '055550': 51200,
  '068270': 178500,
  '003670': 298000,
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, round, symbol, symbolName, currentPrice } = body;

  if (!sessionId || !round) {
    return new Response(JSON.stringify({ error: 'Missing sessionId or round' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const finalSymbol = symbol || '005930';
  const finalSymbolName = symbolName || '삼성전자';
  const finalCurrentPrice = currentPrice || STOCK_PRICES[finalSymbol] || 70000;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const characters: CharacterType[] = ['claude', 'gemini', 'gpt'];

      try {
        const orchestrator = getOrCreateSession(sessionId);
        orchestrator.setCurrentPrice(finalCurrentPrice);

        // Generate responses sequentially and stream each one
        for (let i = 0; i < characters.length; i++) {
          const character = characters[i];

          try {
            // Generate single character response
            const message = await orchestrator.generateSingleCharacter(
              finalSymbol,
              finalSymbolName,
              round,
              character
            );

            // Save to Supabase
            let savedMessage;
            try {
              const saved = await createDebateMessage(
                sessionId,
                message.character,
                message.content,
                message.score,
                message.risks,
                message.sources,
                round
              );
              savedMessage = {
                id: saved.id,
                ...message,
                createdAt: saved.created_at,
              };
            } catch (e) {
              console.log('Failed to save message to Supabase:', e);
              savedMessage = {
                id: `${sessionId}-${character}-${round}-${i}`,
                ...message,
                createdAt: new Date().toISOString(),
              };
            }

            // Send the message via SSE
            const event = `data: ${JSON.stringify({
              type: 'message',
              data: savedMessage,
              index: i,
              total: characters.length,
            })}\n\n`;
            
            controller.enqueue(encoder.encode(event));
          } catch (error) {
            console.error(`Error generating ${character} response:`, error);
            // Send error event but continue
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              character,
              error: 'Failed to generate response',
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }
        }

        // Update session round
        try {
          await updateDebateSession(sessionId, { current_round: round });
        } catch (e) {
          console.log('Failed to update session round:', e);
        }

        // Send completion event with targets and consensus
        const targets = orchestrator.getTargets();
        const consensus = orchestrator.getConsensus();
        const isComplete = round >= 4;

        const completeEvent = `data: ${JSON.stringify({
          type: 'complete',
          data: {
            sessionId,
            round,
            currentPrice: finalCurrentPrice,
            targets,
            consensus,
            isComplete,
          },
        })}\n\n`;
        
        controller.enqueue(encoder.encode(completeEvent));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        const errorEvent = `data: ${JSON.stringify({
          type: 'fatal_error',
          error: 'Failed to generate debate round',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}






