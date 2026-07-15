/** Zero-dependency health check — must not import server/ (Vercel bundle safety). */
export default function handler(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'Voiceify Voice Agent',
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    scribeStt: Boolean(process.env.ELEVENLABS_API_KEY),
    scribeRealtime: Boolean(process.env.ELEVENLABS_API_KEY),
    diarization: Boolean(process.env.ELEVENLABS_API_KEY),
    bargeIn: true,
    models: {
      llm: process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant',
      llmFallback: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
      tts: process.env.TTS_MODEL?.trim() || 'eleven_flash_v2_5',
      stt: process.env.STT_MODEL?.trim() || 'scribe_v2',
      sttRealtime: process.env.STT_REALTIME_MODEL?.trim() || 'scribe_v2_realtime',
    },
    pipeline: 'stream-pcm-flash',
    targetLatencyMs: 500,
    stack: {
      stt: 'ElevenLabs scribe_v2_realtime (live) + scribe_v2 (batch refine)',
      llm: 'Groq llama-3.1-8b-instant (primary) · Google gemini-2.5-flash (fallback)',
      tts: 'ElevenLabs eleven_flash_v2_5 PCM',
    },
    docs: '/docs',
    openapi: '/api/openapi',
  });
}
