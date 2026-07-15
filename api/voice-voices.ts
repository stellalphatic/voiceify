import { handleVoiceVoices } from '../server/api-handlers';
import { vercelHandler } from '../server/vercel-adapter';

export default vercelHandler(async (request) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }
  return handleVoiceVoices();
});
