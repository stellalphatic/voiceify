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

export interface VoiceToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface VoiceToolCallResult {
  text: string;
  toolCalls: number;
}

type GroqMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

async function groqCompletion(body: Record<string, unknown>): Promise<Response> {
  const apiKey = groqApiKey();
  if (!apiKey) throw new Error('Groq is not configured');
  return fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModelId(),
      max_tokens: LLM_VOICE_CONFIG.maxOutputTokens,
      temperature: LLM_VOICE_CONFIG.temperature,
      ...body,
    }),
    signal: AbortSignal.timeout(12_000),
  });
}

/**
 * One bounded tool round followed by the final spoken response. Tool execution
 * stays in the API service through the callback, so provider output never gains
 * direct database or network access.
 */
export async function generateGroqAgentReply(
  prompt: string,
  tools: VoiceToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
): Promise<VoiceToolCallResult | null> {
  if (!groqApiKey() || tools.length === 0) return null;

  try {
    const messages: GroqMessage[] = [{ role: 'user', content: prompt }];
    const first = await groqCompletion({
      messages,
      tools: tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: 'auto',
    });
    if (!first.ok) return null;

    const firstData = (await first.json()) as {
      choices?: Array<{ message?: GroqMessage }>;
    };
    const assistant = firstData.choices?.[0]?.message;
    if (!assistant) return null;
    const calls = assistant.tool_calls?.slice(0, 3) ?? [];
    if (calls.length === 0) {
      const text = sanitizeVoiceReply(assistant.content?.trim() ?? '');
      return text ? { text, toolCalls: 0 } : null;
    }

    messages.push(assistant);
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(call.function.arguments) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        args = {};
      }
      const result = await executeTool(call.function.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 8_000),
      });
    }

    const second = await groqCompletion({ messages });
    if (!second.ok) return null;
    const secondData = (await second.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = sanitizeVoiceReply(
      secondData.choices?.[0]?.message?.content?.trim() ?? '',
    );
    return text ? { text, toolCalls: calls.length } : null;
  } catch {
    return null;
  }
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
