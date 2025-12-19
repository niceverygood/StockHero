// This file re-exports the real adapters from their respective files
// The actual implementations are in claude.ts, gemini.ts, gpt.ts, openrouter.ts

import type { LLMAdapter } from './types';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { GPTAdapter } from './gpt';
import { MockLLMAdapter } from './mock';
import { createOpenRouterAdapters } from './openrouter';

// Factory function to create adapters based on environment
export function createAdapters(): { claude: LLMAdapter; gemini: LLMAdapter; gpt: LLMAdapter } {
  // OpenRouter가 설정되어 있으면 우선 사용 (하나의 API로 모든 모델 사용)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    console.log('[LLM] Using OpenRouter for all models');
    return createOpenRouterAdapters();
  }
  
  // 개별 API 키 확인
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY;

  return {
    claude: anthropicKey ? new ClaudeAdapter() : new MockLLMAdapter('claude'),
    gemini: googleKey ? new GeminiAdapter() : new MockLLMAdapter('gemini'),
    gpt: openaiKey ? new GPTAdapter() : new MockLLMAdapter('gpt'),
  };
}


