// Placeholder adapters for real LLM APIs
// These will be implemented when API keys are provided

import type { LLMAdapter, LLMResponse, LLMContext } from './types';

// GPT Adapter (OpenAI)
export class GPTAdapter implements LLMAdapter {
  name = 'GPT';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateStructured(prompt: string, context: LLMContext): Promise<LLMResponse> {
    // TODO: Implement actual OpenAI API call
    // This is a placeholder that throws if called without implementation
    throw new Error('GPT adapter not implemented. Please use MockLLM or provide implementation.');
  }
}

// Claude Adapter (Anthropic)
export class ClaudeAdapter implements LLMAdapter {
  name = 'Claude';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateStructured(prompt: string, context: LLMContext): Promise<LLMResponse> {
    // TODO: Implement actual Anthropic API call
    throw new Error('Claude adapter not implemented. Please use MockLLM or provide implementation.');
  }
}

// Gemini Adapter (Google)
export class GeminiAdapter implements LLMAdapter {
  name = 'Gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateStructured(prompt: string, context: LLMContext): Promise<LLMResponse> {
    // TODO: Implement actual Google AI API call
    throw new Error('Gemini adapter not implemented. Please use MockLLM or provide implementation.');
  }
}

// Factory function to create adapters based on environment
export function createAdapters(): { claude: LLMAdapter; gemini: LLMAdapter; gpt: LLMAdapter } {
  // Check for API keys in environment
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY;

  // Import mock adapters
  const { createMockAdapter } = require('./mock');

  return {
    claude: anthropicKey ? new ClaudeAdapter(anthropicKey) : createMockAdapter('CLAUDE'),
    gemini: googleKey ? new GeminiAdapter(googleKey) : createMockAdapter('GEMINI'),
    gpt: openaiKey ? new GPTAdapter(openaiKey) : createMockAdapter('GPT'),
  };
}

