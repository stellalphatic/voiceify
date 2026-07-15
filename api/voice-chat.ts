import { handleVoiceChat } from '../server/api-handlers';
import { vercelHandler } from '../server/vercel-adapter';

export default vercelHandler((request) => handleVoiceChat(request));
