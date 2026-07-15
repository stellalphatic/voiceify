import { handleVoiceWarmup } from '../../server/api-handlers';
import { vercelHandler } from '../../server/vercel-adapter';

export const config = { maxDuration: 30 };

export default vercelHandler((request) => handleVoiceWarmup(request));
