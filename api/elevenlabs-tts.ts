import { handleElevenLabsTts } from '../server/api-handlers';
import { vercelHandler } from '../server/vercel-adapter';

export default vercelHandler((request) => handleElevenLabsTts(request));
