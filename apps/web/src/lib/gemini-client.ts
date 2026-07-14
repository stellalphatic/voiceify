/**
 * gemini-client.ts — thin client-side wrapper that calls our /api/gemini
 * serverless proxy. The Gemini API key NEVER touches the browser bundle.
 *
 * For the Live (real-time voice) API, see DashboardLayout.tsx — that flow
 * still requires special handling (ephemeral tokens or BYOK). It is gated
 * by a clear UI warning when not configured.
 */

export interface GeminiTextOptions {
  model?: string;
  responseMimeType?: string;
}

export async function generateText(
  prompt: string,
  opts: GeminiTextOptions = {},
): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, ...opts }),
  });

  if (!res.ok) {
    let message = `Gemini request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
