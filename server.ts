import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PERSONAS,
  generateChatReply,
  synthesizeSpeech,
  type ChatMessage,
} from './server/voice-handlers';
import { kickTtsCachePreload } from './server/tts-cache';
import { VOICE_MODELS, LLM_VOICE_CONFIG } from './server/voice-models';
import {
  checkRateLimit,
  getClientIp,
  verifyApiKey,
} from './server/api-security';
import { forwardPostHandler } from './server/express-forward';
import {
  handleAgents,
  handleElevenLabsTts,
  handleHealth,
  handleOpenApi,
  handleScribeRealtimeToken,
  handleVoiceChat,
  handleVoiceRespond,
  handleVoiceTranscribe,
  handleVoiceVoices,
  handleVoiceWarmup,
} from './server/api-handlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Forward Web `Response` from api-handlers (sync or async) to Express. */
async function forwardWebResponse(
  res: express.Response,
  result: Response | Promise<Response>,
): Promise<void> {
  try {
    const webRes = await result;
    const body = Buffer.from(await webRes.arrayBuffer());
    res.status(webRes.status);
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });
    res.send(body);
  } catch (err: unknown) {
    if (!res.headersSent) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: msg });
    }
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 5173;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const apiGuard = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const auth = verifyApiKey(req.headers);
    if (!auth.ok) return res.status(401).json({ error: auth.message });
    const ip = getClientIp(req.headers);
    const rate = checkRateLimit(ip);
    if (!rate.ok) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSec: rate.retryAfterSec,
      });
    }
    return next();
  };

  app.use('/api/voice', apiGuard);
  app.use('/api/gemini', apiGuard);
  app.use('/api/voice-chat', apiGuard);
  app.use('/api/elevenlabs-tts', apiGuard);

  app.get('/api/health', (_req, res) => {
    void forwardWebResponse(res, handleHealth());
  });

  app.get('/api/openapi', (req, res) => {
    void forwardWebResponse(
      res,
      handleOpenApi(new Request(`http://${req.headers.host}${req.originalUrl}`)),
    );
  });

  app.get('/api/agents', (_req, res) => {
    void forwardWebResponse(res, handleAgents());
  });

  app.get('/api/voice-voices', (_req, res) => {
    void forwardWebResponse(res, handleVoiceVoices());
  });

  app.get('/api/voice/transcribe/token', (req, res) => {
    void forwardWebResponse(
      res,
      handleScribeRealtimeToken(new Request(`http://${req.headers.host}${req.originalUrl}`, { method: 'GET' })),
    );
  });

  app.post('/api/voice/transcribe/token', (req, res) => {
    void forwardWebResponse(
      res,
      handleScribeRealtimeToken(new Request(`http://${req.headers.host}${req.originalUrl}`, { method: 'POST' })),
    );
  });

  app.post('/api/voice-chat', async (req, res) => {
    const message = String(req.body?.message ?? '').trim();
    const personaId = String(req.body?.personaId ?? 'restaurant');
    const history = (Array.isArray(req.body?.history) ? req.body.history : []) as ChatMessage[];

    if (!message) return res.status(400).json({ error: 'Missing message' });
    if (!PERSONAS[personaId]) return res.status(400).json({ error: 'Unknown persona' });

    if (message === '__greeting__') {
      return res.json({
        text: PERSONAS[personaId].greeting,
        personaId,
        usedGemini: false,
      });
    }

    try {
      const reply = await generateChatReply(personaId, message, history.slice(-12), {
        language: req.body?.language,
      });
      res.json({
        text: reply,
        personaId,
        usedGemini: Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat failed';
      res.status(502).json({ error: msg });
    }
  });

  /** Low-latency unified pipeline: LLM → streamed PCM (NDJSON). */
  app.post('/api/voice/respond', (req, res) => {
    void forwardPostHandler(req, res, handleVoiceRespond);
  });

  app.post('/api/voice/transcribe', (req, res) => {
    void forwardPostHandler(req, res, handleVoiceTranscribe);
  });

  app.post('/api/voice/warmup', (req, res) => {
    void forwardPostHandler(req, res, handleVoiceWarmup);
  });

  app.post('/api/elevenlabs-tts', async (req, res) => {
    const text = String(req.body?.text ?? '').trim();
    const voiceId = String(req.body?.voiceId ?? 'EXAVITQu4vr4xnSDxMaL').trim();

    if (!text) return res.status(400).json({ error: 'Missing text' });

    try {
      const audio = await synthesizeSpeech(text, voiceId);
      res.setHeader('content-type', 'audio/mpeg');
      res.setHeader('cache-control', 'no-store');
      res.send(Buffer.from(audio));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'TTS failed';
      res.status(502).json({ error: msg });
    }
  });

  // Legacy Gemini text proxy (dashboard sandbox)
  app.post('/api/gemini', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const prompt = String(req.body?.prompt ?? '').trim();
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: req.body?.model || VOICE_MODELS.llm,
        contents: prompt,
        config: {
          ...(req.body?.responseMimeType ? { responseMimeType: req.body.responseMimeType } : {}),
          thinkingConfig: { thinkingBudget: LLM_VOICE_CONFIG.thinkingBudget },
        },
      });
      res.json({ text: response.text ?? '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gemini call failed';
      res.status(502).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  kickTtsCachePreload().then(() => {
    console.log('  TTS cache: preloaded demo phrases for sub-500ms replies');
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Voiceify running at http://localhost:${PORT}`);
    console.log(`  ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? 'configured' : 'MISSING — add ELEVENLABS_API_KEY to .env.local'}`);
    console.log(`  Groq LLM: ${process.env.GROQ_API_KEY ? 'configured (primary)' : 'MISSING — add GROQ_API_KEY to .env.local'}`);
    console.log(`  Gemini LLM: ${process.env.GEMINI_API_KEY ? 'configured (fallback)' : 'optional'}`);
    console.log(`  Models: LLM=${VOICE_MODELS.llm} · fallback=${VOICE_MODELS.llmFallback} · TTS=${VOICE_MODELS.tts} · STT=${VOICE_MODELS.stt}`);
    console.log(`  API docs: http://localhost:${PORT}/docs`);
    console.log(`  OpenAPI: http://localhost:${PORT}/api/openapi`);
  });
}

startServer();
