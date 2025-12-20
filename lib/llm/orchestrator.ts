import type { LLMAdapter, LLMContext, LLMResponse, CharacterType, PreviousTarget } from './types';
import { MockLLMAdapter } from './mock';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { GPTAdapter } from './gpt';
import { OpenRouterAdapter } from './openrouter';
import { deriveConsensus, type ConsensusResult } from './analysis-framework';

interface DebateMessage {
  character: CharacterType;
  content: string;
  score: number;
  risks: string[];
  sources: string[];
  targetPrice?: number;
  targetDate?: string;
  priceRationale?: string;
  dateRationale?: string;
  methodology?: string;
}

function getAdapter(character: CharacterType): LLMAdapter {
  // Check if API keys are available
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_AI_API_KEY;

  // Prefer OpenRouter if available (supports all models)
  if (hasOpenRouter) {
    return new OpenRouterAdapter(character);
  }

  // Fallback to individual API keys
  switch (character) {
    case 'claude':
      return hasAnthropic ? new ClaudeAdapter() : new MockLLMAdapter('claude');
    case 'gemini':
      return hasGoogle ? new GeminiAdapter() : new MockLLMAdapter('gemini');
    case 'gpt':
      return hasOpenAI ? new GPTAdapter() : new MockLLMAdapter('gpt');
    default:
      return new MockLLMAdapter(character);
  }
}

export class DebateOrchestrator {
  private previousMessages: DebateMessage[] = [];
  private previousTargets: PreviousTarget[] = [];
  private currentPrice: number = 70000;

  setCurrentPrice(price: number) {
    this.currentPrice = price;
  }

  async generateRound(
    symbol: string,
    symbolName: string,
    round: number
  ): Promise<DebateMessage[]> {
    const characters: CharacterType[] = ['claude', 'gemini', 'gpt'];
    const messages: DebateMessage[] = [];
    const newTargets: PreviousTarget[] = [];

    for (const character of characters) {
      const adapter = getAdapter(character);
      const context: LLMContext = {
        symbol,
        symbolName,
        round,
        currentPrice: this.currentPrice,
        previousMessages: [...this.previousMessages, ...messages].map(m => ({
          character: m.character,
          content: m.content,
          targetPrice: m.targetPrice,
          targetDate: m.targetDate,
        })),
        previousTargets: this.previousTargets,
      };

      try {
        const response = await adapter.generateStructured(context);
        
        // 최종 목표가 검증 (안전 장치)
        let validatedTargetPrice = response.targetPrice;
        if (validatedTargetPrice !== undefined) {
          // 목표가가 현재가의 50% 미만이거나 500% 초과면 보정
          if (validatedTargetPrice < this.currentPrice * 0.5) {
            console.warn(`[Orchestrator] ${character} target price ${validatedTargetPrice} is unrealistic, recalculating`);
            const fallbackMultiplier = character === 'gemini' ? 1.3 : character === 'claude' ? 1.15 : 1.1;
            validatedTargetPrice = Math.round(this.currentPrice * fallbackMultiplier / 100) * 100;
          } else if (validatedTargetPrice > this.currentPrice * 5) {
            console.warn(`[Orchestrator] ${character} target price ${validatedTargetPrice} is too high, capping`);
            const capMultiplier = character === 'gemini' ? 2.0 : 1.5;
            validatedTargetPrice = Math.round(this.currentPrice * capMultiplier / 100) * 100;
          }
        }
        
        const message: DebateMessage = {
          character,
          content: response.content,
          score: response.score,
          risks: response.risks,
          sources: response.sources,
          targetPrice: validatedTargetPrice,
          targetDate: response.targetDate,
          priceRationale: response.priceRationale,
          dateRationale: response.dateRationale,
          methodology: response.methodology,
        };
        messages.push(message);
        
        // Track target for next round
        if (validatedTargetPrice && response.targetDate) {
          newTargets.push({
            character,
            targetPrice: validatedTargetPrice,
            targetDate: response.targetDate,
          });
        }
      } catch (error) {
        console.error(`Error generating response for ${character}:`, error);
        // Fallback to mock if real API fails
        const mockAdapter = new MockLLMAdapter(character);
        const response = await mockAdapter.generateStructured(context);
        
        // Mock 응답도 검증 (이론상 필요 없지만 안전을 위해)
        let validatedTargetPrice = response.targetPrice;
        if (validatedTargetPrice !== undefined && validatedTargetPrice < this.currentPrice * 0.5) {
          const fallbackMultiplier = character === 'gemini' ? 1.3 : character === 'claude' ? 1.15 : 1.1;
          validatedTargetPrice = Math.round(this.currentPrice * fallbackMultiplier / 100) * 100;
        }
        
        const message: DebateMessage = {
          character,
          content: response.content,
          score: response.score,
          risks: response.risks,
          sources: response.sources,
          targetPrice: validatedTargetPrice,
          targetDate: response.targetDate,
          priceRationale: response.priceRationale,
          dateRationale: response.dateRationale,
          methodology: response.methodology,
        };
        messages.push(message);
        
        if (validatedTargetPrice && response.targetDate) {
          newTargets.push({
            character,
            targetPrice: validatedTargetPrice,
            targetDate: response.targetDate,
          });
        }
      }
    }

    this.previousMessages.push(...messages);
    
    // Update targets - keep only latest target per character
    for (const newTarget of newTargets) {
      const existingIndex = this.previousTargets.findIndex(t => t.character === newTarget.character);
      if (existingIndex >= 0) {
        this.previousTargets[existingIndex] = newTarget;
      } else {
        this.previousTargets.push(newTarget);
      }
    }
    
    return messages;
  }

  getMessages(): DebateMessage[] {
    return this.previousMessages;
  }

  getTargets(): PreviousTarget[] {
    return this.previousTargets;
  }

  /**
   * 합의 도출 - 세 분석가의 목표가와 분석 논리를 종합하여 합의점 계산
   */
  getConsensus(): ConsensusResult | null {
    if (this.previousTargets.length < 3) {
      return null;
    }

    const targets = this.previousTargets.map(t => {
      const message = this.previousMessages.find(m => 
        m.character === t.character && m.targetPrice === t.targetPrice
      );
      return {
        character: t.character as CharacterType,
        targetPrice: t.targetPrice,
        targetDate: t.targetDate,
        confidence: message?.score || 3,
      };
    });

    return deriveConsensus(targets);
  }

  reset(): void {
    this.previousMessages = [];
    this.previousTargets = [];
  }
}

// Session management for multiple debates
const sessions = new Map<string, DebateOrchestrator>();

export function getOrCreateSession(sessionId: string): DebateOrchestrator {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new DebateOrchestrator());
  }
  return sessions.get(sessionId)!;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
