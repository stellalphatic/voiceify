import { PERSONA_TIME_SAVERS } from '../positioning';

export interface VoicePersona {
  id: string;
  name: string;
  tagline: string;
  voiceId: string;
  accent: string;
  languages: string;
  tags: string[];
  greeting: string;
  greetingUr: string;
  greetingAuto: string;
}

export const DEMO_PERSONAS: VoicePersona[] = [
  {
    id: 'restaurant',
    name: 'Nova',
    tagline: 'Rush-hour reservations',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    accent: 'Warm, Female',
    languages: 'English · Urdu · Auto',
    tags: ['Rush hour', 'Booking', 'Multilingual'],
    greeting:
      "Welcome to Voiceify! I'm Nova from Garden Bistro. I answer rush-hour calls in seconds — try booking a table or asking about our menu.",
    greetingUr:
      'وائسفائی میں خوش آمدید! میں نووا، گارڈن بائسٹرو سے۔ ٹیبل بک کریں یا مینو پوچھیں — میں فوراً مدد کروں گی۔',
    greetingAuto:
      "Welcome to Voiceify! I'm Nova — any language works. Book a table or ask about the menu. / ٹیبل بک کریں، میں تیار ہوں!",
  },
  {
    id: 'healthcare',
    name: 'Dr. Sarah',
    tagline: 'No-hold scheduling',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    accent: 'Calm, Female',
    languages: 'English · Urdu · Auto',
    tags: ['Appointments', 'No hold', 'Multilingual'],
    greeting:
      "Hi, Sarah at CityCare Clinic — I'll schedule you quickly. What visit do you need?",
    greetingUr:
      'السلام علیکم! سارہ، سٹی کیئر کلینک — جلدی اپائنٹمنٹ لگا دوں گی۔ کس قسم کی ملاقات چاہیے؟',
    greetingAuto:
      "Hello, I'm Sarah — any language works. / کوئی بھی زبان چلے گی۔",
  },
  {
    id: 'support',
    name: 'Alex',
    tagline: 'Instant tier-one support',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    accent: 'Friendly, Male',
    languages: 'English · Urdu · Auto',
    tags: ['Billing', 'No callback', 'Multilingual'],
    greeting:
      "Hey, Alex from Voiceify — no hold, I'll fix this fast. What's the issue?",
    greetingUr:
      'السلام علیکم! ایلیکس، وائسفائی — بغیر انتظار حل کریں گے۔ مسئلہ کیا ہے؟',
    greetingAuto:
      "Hey, Alex here — speak any language. / کسی بھی زبان میں بولیں۔",
  },
];

/** One-line value prop per persona — matches landing positioning. */
export function getPersonaTimeSaver(id: string): string {
  return PERSONA_TIME_SAVERS[id as keyof typeof PERSONA_TIME_SAVERS] ?? PERSONA_TIME_SAVERS.restaurant;
}

export function getPersona(id: string): VoicePersona {
  return DEMO_PERSONAS.find((p) => p.id === id) ?? DEMO_PERSONAS[0];
}
