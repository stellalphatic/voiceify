import type { LanguageMode } from './language';
import {
  getDemoGreeting,
  getNovaDemoGreeting,
  NOVA_DEMO_SCRIPT,
} from '@voiceify/shared';

export { getDemoGreeting, getNovaDemoGreeting, NOVA_DEMO_SCRIPT };

export const NOVA_DEMO_PROMPTS = [
  {
    id: 'nova-intro',
    label: 'After Nova introduces herself',
    text: "I'd like a table for four tonight at eight please.",
    hint: 'Say this right after Nova finishes her welcome.',
  },
  {
    id: 'nova-urdu',
    label: 'Urdu booking',
    text: 'Mujhe aaj raat 8 baje ke liye table chahiye, do log.',
    hint: 'Nova will reply in Roman Urdu / Urdu.',
  },
  {
    id: 'nova-menu',
    label: 'Menu question',
    text: 'Do you have halal or vegetarian options?',
    hint: 'Tests info replies.',
  },
] as const;

export type { LanguageMode };
