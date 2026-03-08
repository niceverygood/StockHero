/**
 * OpenRouter API - 주식 추천(verdict) 전용
 * 환경변수: OPENROUTER_API_KEY
 */

export const VERDICT_MODELS = {
  claude: 'anthropic/claude-opus-4-5',     // Claude Opus 4.5
  gemini: 'google/gemini-3',               // Gemini 3
  gpt: 'openai/gpt-5.4',                  // GPT 5.4
} as const;

export type VerdictModelKey = keyof typeof VERDICT_MODELS;

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callOpenRouterCompletion(
  model: string,
  messages: OpenRouterMessage[],
  maxTokens: number = 2048
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. .env에 키를 설정하세요.');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://stockhero.app',
      'X-Title': 'StockHero Daily Verdict',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`OpenRouter [${model}] error:`, err);
    throw new Error(`OpenRouter failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
