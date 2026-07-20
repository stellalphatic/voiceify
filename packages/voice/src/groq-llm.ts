import { LLM_VOICE_CONFIG, resolveLlmModel } from './voice-models';
import { sanitizeVoiceReply } from './voice-sanitize';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function groqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}

export function groqModelId(): string {
  return resolveLlmModel();
}

/** Low-latency Groq chat — returns null on failure so caller can fall back to Gemini. */
export async function generateGroqReply(prompt: string): Promise<string | null> {
  const apiKey = groqApiKey();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModelId(),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: LLM_VOICE_CONFIG.maxOutputTokens,
        temperature: LLM_VOICE_CONFIG.temperature,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return sanitizeVoiceReply(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
