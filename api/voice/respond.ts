import { handleVoiceRespond } from '../../server/api-handlers';
import { vercelHandler } from '../../server/vercel-adapter';

export const config = { maxDuration: 60 };

export default vercelHandler((request) => handleVoiceRespond(request));
