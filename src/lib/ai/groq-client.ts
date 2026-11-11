/**
 * @fileOverview Groq High-Speed Multi-Key Fallback AI Engine
 *
 * Implements high-throughput, low-latency AI generation with automatic multi-key
 * rotation across high-speed keys provided in environment variables (GROQ_API_KEYS),
 * rate-limit backoff handling, and model fallback cascades.
 *
 * Models supported:
 *   - openai/gpt-oss-120b (Primary reasoning, reports, curriculum generation)
 *   - openai/gpt-oss-20b (Ultra-fast generation, sub-second latency)
 *   - qwen/qwen3.8-27b (Bilingual Kiswahili/English & STEM problem solving)
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  jsonMode?: boolean;
}

class GroqKeyPool {
  private keys: string[] = [];
  private currentIndex = 0;
  private cooldowns: Map<string, number> = new Map();

  constructor() {
    this.refreshKeys();
  }

  public refreshKeys(): void {
    const envKeys = process.env.GROQ_API_KEYS
      ? process.env.GROQ_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    this.keys = Array.from(new Set(envKeys));
  }

  public getNextKey(): string {
    this.refreshKeys();
    const total = this.keys.length;

    if (total === 0) {
      throw new Error(
        'Groq API keys are not configured. Please set GROQ_API_KEYS in your environment variables.'
      );
    }

    const now = Date.now();

    for (let attempts = 0; attempts < total; attempts++) {
      const key = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % total;

      const cooldownUntil = this.cooldowns.get(key) || 0;
      if (now >= cooldownUntil) {
        return key;
      }
    }

    // If all keys are in cooldown, pick the one with earliest cooldown expiry
    let bestKey = this.keys[0];
    let minTime = Infinity;
    for (const key of this.keys) {
      const time = this.cooldowns.get(key) || 0;
      if (time < minTime) {
        minTime = time;
        bestKey = key;
      }
    }
    return bestKey;
  }

  public markCooldown(key: string, durationMs = 60000): void {
    const keyPreview = `${key.slice(0, 8)}...${key.slice(-4)}`;
    console.warn(`[GroqPool] Key ${keyPreview} placed on cooldown for ${Math.round(durationMs / 1000)}s.`);
    this.cooldowns.set(key, Date.now() + durationMs);
  }

  public getKeyCount(): number {
    this.refreshKeys();
    return this.keys.length;
  }
}

export const groqPool = new GroqKeyPool();

export const GROQ_MODELS = {
  PREMIER: 'openai/gpt-oss-120b',
  FAST: 'openai/gpt-oss-20b',
  MULTILINGUAL: 'qwen/qwen3.8-27b',
} as const;

/** Map legacy model names to active live Groq models */
function resolveModel(modelName?: string): string {
  if (!modelName) return GROQ_MODELS.PREMIER;
  if (modelName === 'llama-3.3-70b-versatile' || modelName.includes('70b') || modelName.includes('120b')) {
    return GROQ_MODELS.PREMIER;
  }
  if (
    modelName === 'llama-3.1-8b-instant' ||
    modelName.includes('8b') ||
    modelName.includes('instant') ||
    modelName.includes('20b')
  ) {
    return GROQ_MODELS.FAST;
  }
  if (modelName.includes('mixtral') || modelName.includes('qwen')) {
    return GROQ_MODELS.MULTILINGUAL;
  }
  return modelName;
}

export async function groqChatCompletion(
  messages: ChatMessage[],
  options: GroqCompletionOptions = {}
): Promise<{ text: string; modelUsed: string; keyUsed: string }> {
  const requestedModel = resolveModel(options.model || process.env.GROQ_DEFAULT_MODEL);

  const modelChain = Array.from(
    new Set([
      requestedModel,
      GROQ_MODELS.FAST,
      GROQ_MODELS.MULTILINGUAL,
      GROQ_MODELS.PREMIER,
    ])
  );

  const maxAttemptsPerModel = Math.max(groqPool.getKeyCount(), 3);
  let lastError: Error | null = null;

  for (const model of modelChain) {
    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      const apiKey = groqPool.getNextKey();
      const keyPreview = `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;

      try {
        const body: Record<string, any> = {
          model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.max_tokens ?? 2048,
          top_p: options.top_p ?? 1,
        };

        if (options.jsonMode) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (res.status === 429) {
          // Rate limit — put key on cooldown and immediately try next key
          groqPool.markCooldown(apiKey, 45000);
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          // Bad or revoked key — mark for longer cooldown
          groqPool.markCooldown(apiKey, 600000);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          if (res.status >= 500) {
            groqPool.markCooldown(apiKey, 15000);
            continue;
          }
          if (res.status === 404 || res.status === 400) {
            console.warn(`[Groq] Model ${model} not available (${res.status}), trying next fallback model.`);
            break;
          }
          throw new Error(`Groq API returned ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content ?? '';

        return {
          text: content,
          modelUsed: model,
          keyUsed: keyPreview,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Groq] Attempt ${attempt + 1} with ${model} error:`, err?.message || err);
      }
    }
  }

  throw new Error(`All Groq keys and fallback models failed. Last error: ${lastError?.message}`);
}

/**
 * High-level helper for generating text responses
 */
export async function generateAiText(
  prompt: string,
  systemPrompt = 'You are Shule Altra AI, an expert school administration and Tanzanian education specialist.'
): Promise<string> {
  const result = await groqChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]);
  return result.text;
}

/**
 * High-level helper for generating strictly structured JSON
 */
export async function generateAiJSON<T>(
  prompt: string,
  schemaGuidance: string,
  systemPrompt = 'You are a structured data extractor. Return ONLY valid JSON adhering to the required schema.'
): Promise<T> {
  const fullPrompt = `${prompt}\n\nREQUIRED JSON SCHEMA / FORMAT:\n${schemaGuidance}\n\nReturn strictly valid JSON only:`;
  const result = await groqChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: fullPrompt },
    ],
    { jsonMode: true, temperature: 0.1 }
  );

  return JSON.parse(result.text) as T;
}
