import type { LLMAdapter, LLMContext, LLMResponse, CharacterType } from './types';
import { CHARACTER_PERSONAS } from './types';
import { createMockAdapter } from './mock';

export interface DebateRoundResult {
  messages: Array<{
    role: CharacterType;
    content: string;
    risks: string;
    sources: string[];
    score: number;
  }>;
  consensusScore: number;
  hasConsensus: boolean;
}

export interface OrchestratorConfig {
  adapters?: {
    claude?: LLMAdapter;
    gemini?: LLMAdapter;
    gpt?: LLMAdapter;
  };
}

export class DebateOrchestrator {
  private adapters: Record<CharacterType, LLMAdapter>;

  constructor(config?: OrchestratorConfig) {
    this.adapters = {
      CLAUDE: config?.adapters?.claude || createMockAdapter('CLAUDE'),
      GEMINI: config?.adapters?.gemini || createMockAdapter('GEMINI'),
      GPT: config?.adapters?.gpt || createMockAdapter('GPT'),
    };
  }

  async generateRound(context: LLMContext): Promise<DebateRoundResult> {
    const order: CharacterType[] = ['CLAUDE', 'GEMINI', 'GPT'];
    const messages: DebateRoundResult['messages'] = [];
    
    // Generate messages in sequence (each character can reference previous messages)
    for (const character of order) {
      const adapter = this.adapters[character];
      const persona = CHARACTER_PERSONAS[character];
      
      const prompt = this.buildPrompt(character, persona, context, messages);
      const response = await adapter.generateStructured(prompt, {
        ...context,
        previousMessages: [
          ...context.previousMessages,
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      });

      messages.push({
        role: character,
        content: response.content,
        risks: response.risks,
        sources: response.sources,
        score: response.score,
      });
    }

    // Calculate consensus
    const scores = messages.map(m => m.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const hasConsensus = minScore >= 4;

    return {
      messages,
      consensusScore: Math.round(avgScore * 10) / 10,
      hasConsensus,
    };
  }

  async evaluateSymbol(
    symbol: string,
    symbolName: string,
    sector: string
  ): Promise<{
    avgScore: number;
    scores: Record<CharacterType, number>;
    riskFlags: string[];
    hasConsensus: boolean;
  }> {
    const context: LLMContext = {
      symbol,
      symbolName,
      sector,
      round: 1,
      previousMessages: [],
    };

    const result = await this.generateRound(context);
    
    const scores: Record<CharacterType, number> = {
      CLAUDE: 0,
      GEMINI: 0,
      GPT: 0,
    };
    
    const riskFlags: string[] = [];
    
    for (const msg of result.messages) {
      scores[msg.role] = msg.score;
      if (msg.risks) {
        riskFlags.push(...msg.risks.split(',').map(r => r.trim()));
      }
    }

    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 3;
    const minScore = Math.min(...Object.values(scores));

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      scores,
      riskFlags: [...new Set(riskFlags)].slice(0, 3),
      hasConsensus: minScore >= 4,
    };
  }

  private buildPrompt(
    character: CharacterType,
    persona: typeof CHARACTER_PERSONAS[CharacterType],
    context: LLMContext,
    previousMessages: Array<{ role: string; content: string }>
  ): string {
    const basePrompt = `
You are ${persona.name}, a ${persona.title}.
Your analysis style: ${persona.style}
Your focus areas: ${persona.focus.join(', ')}

Analyze the stock: ${context.symbolName} (${context.symbol})
Sector: ${context.sector}
Round: ${context.round}

IMPORTANT RULES:
1. Never give direct buy/sell recommendations
2. Always include risk factors
3. Present balanced analysis with both positives and concerns
4. Cite data sources
5. Use professional, measured language

Previous discussion:
${previousMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Provide your analysis in Korean. Be concise but thorough.
    `.trim();

    return basePrompt;
  }
}

// Factory function
export function createOrchestrator(config?: OrchestratorConfig): DebateOrchestrator {
  return new DebateOrchestrator(config);
}

