/**
 * api/gemini.ts — Vercel serverless proxy for Gemini text generation.
 *
 * The Gemini API key is read from process.env (server-only) and is NEVER
 * shipped to the client. The browser hits this endpoint with a prompt and
 * gets back the model's text response.
 *
 * Limitations:
 *  • Only handles `generateContent` (text). The Live API (real-time voice)
 *    requires WebSocket-style streaming and ephemeral tokens; that flow is
 *    documented separately in README.md.
 *
 * Production hardening checklist (do before public launch):
 *  • Authenticate every request (verify session cookie or signed JWT)
 *  • Rate-limit per user (e.g. via Upstash Redis)
 *  • Validate prompt length and content
 */
import { GoogleGenAI } from '@google/genai';
import { guardRequest, jsonResponse } from '../server/api-security';
import { LLM_VOICE_CONFIG, VOICE_MODELS } from '../server/voice-models';
import { vercelHandler } from '../server/vercel-adapter';

interface GeminiRequest {
  prompt?: string;
  model?: string;
  responseMimeType?: string;
}

export const config = {
  runtime: 'nodejs',
};

async function handleGemini(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server is missing GEMINI_API_KEY' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: GeminiRequest;
  try {
    body = (await req.json()) as GeminiRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing `prompt`' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (prompt.length > 8000) {
    return new Response(JSON.stringify({ error: 'Prompt too long (max 8000 chars)' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: body.model || VOICE_MODELS.llm,
      contents: prompt,
      config: {
        ...(body.responseMimeType ? { responseMimeType: body.responseMimeType } : {}),
        thinkingConfig: { thinkingBudget: LLM_VOICE_CONFIG.thinkingBudget },
      },
    });
    return new Response(JSON.stringify({ text: response.text ?? '' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Gemini call failed' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}

export default vercelHandler(handleGemini);
