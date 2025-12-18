// This file re-exports the real adapters from their respective files
// The actual implementations are in claude.ts, gemini.ts, gpt.ts

import type { LLMAdapter } from './types';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { GPTAdapter } from './gpt';
import { MockLLMAdapter } from './mock';

// Factory function to create adapters based on environment
export function createAdapters(): { claude: LLMAdapter; gemini: LLMAdapter; gpt: LLMAdapter } {
  // Check for API keys in environment
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY;

  return {
    claude: anthropicKey ? new ClaudeAdapter() : new MockLLMAdapter('claude'),
    gemini: googleKey ? new GeminiAdapter() : new MockLLMAdapter('gemini'),
    gpt: openaiKey ? new GPTAdapter() : new MockLLMAdapter('gpt'),
  };
}


