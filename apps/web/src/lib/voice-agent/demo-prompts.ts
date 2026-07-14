export type DemoPromptCategory =
  | 'booking'
  | 'info'
  | 'modify'
  | 'billing'
  | 'multilingual'
  | 'edge'
  | 'rush';

export interface DemoPrompt {
  id: string;
  label: string;
  text: string;
  category: DemoPromptCategory;
  lang: 'en' | 'ur' | 'mixed';
}

export const DEMO_PROMPT_CATEGORIES: Record<DemoPromptCategory, string> = {
  booking: 'Booking',
  info: 'Info',
  modify: 'Change',
  billing: 'Billing',
  multilingual: 'Multilingual',
  edge: 'Edge case',
  rush: 'Rush hour',
};

/** Voice-first phrases: short, clear intent, STT-friendly — mirrors peak-hour caller scenarios. */
export const DEMO_PROMPTS = {
  restaurant: [
    {
      id: 'rest-rush',
      label: 'Calling during dinner rush',
      text: "I know you're busy — quick table for two at nine tonight?",
      category: 'rush',
      lang: 'en',
    },
    {
      id: 'rest-book-en',
      label: 'Table for four tonight',
      text: "I'd like to book a table for four at seven tonight.",
      category: 'booking',
      lang: 'en',
    },
    {
      id: 'rest-book-ur',
      label: 'Roman Urdu booking',
      text: 'Mujhe aaj raat 8 baje ke liye do logon ki table chahiye.',
      category: 'multilingual',
      lang: 'ur',
    },
    {
      id: 'rest-hours',
      label: 'Hours in Urdu',
      text: 'آج رات کتنے بجے تک کھلا ہے؟',
      category: 'info',
      lang: 'ur',
    },
    {
      id: 'rest-menu',
      label: 'Quick menu check',
      text: 'Do you have vegetarian options? I only have a minute.',
      category: 'info',
      lang: 'en',
    },
    {
      id: 'rest-modify',
      label: 'Change party size',
      text: 'Wait — actually make it six people, not four.',
      category: 'modify',
      lang: 'en',
    },
    {
      id: 'rest-mixed',
      label: 'English + Urdu mix',
      text: 'Table chahiye for three, outdoor seating if possible please.',
      category: 'multilingual',
      lang: 'mixed',
    },
    {
      id: 'rest-large',
      label: 'Large party',
      text: 'We need a table for twelve this Saturday — is that possible?',
      category: 'edge',
      lang: 'en',
    },
  ],
  healthcare: [
    {
      id: 'hc-rush',
      label: 'Quick appointment',
      text: "I'm on my lunch break — can I book a checkup for next week?",
      category: 'rush',
      lang: 'en',
    },
    {
      id: 'hc-book-en',
      label: 'Book checkup',
      text: 'I need to schedule a dental checkup next Tuesday morning.',
      category: 'booking',
      lang: 'en',
    },
    {
      id: 'hc-book-ur',
      label: 'Roman Urdu appointment',
      text: 'Mujhe agle hafte doctor se milna hai — appointment book karni hai.',
      category: 'multilingual',
      lang: 'ur',
    },
    {
      id: 'hc-hours',
      label: 'Clinic hours',
      text: 'کلینک ہفتے کے دن کب کھلتا ہے؟',
      category: 'info',
      lang: 'ur',
    },
    {
      id: 'hc-reschedule',
      label: 'Reschedule visit',
      text: 'I need to move my Thursday appointment to Friday afternoon.',
      category: 'modify',
      lang: 'en',
    },
    {
      id: 'hc-insurance',
      label: 'Insurance question',
      text: 'Do you accept insurance for routine visits?',
      category: 'info',
      lang: 'en',
    },
    {
      id: 'hc-emergency',
      label: 'Emergency redirect',
      text: 'I have severe chest pain right now — what should I do?',
      category: 'edge',
      lang: 'en',
    },
    {
      id: 'hc-mixed',
      label: 'Mixed language',
      text: 'Dr. Sarah se milna hai — kal subah ka slot available hai?',
      category: 'multilingual',
      lang: 'mixed',
    },
  ],
  support: [
    {
      id: 'sup-rush',
      label: 'No time to wait on hold',
      text: "I can't wait on hold — my invoice was charged twice, please fix it.",
      category: 'rush',
      lang: 'en',
    },
    {
      id: 'sup-bill-en',
      label: 'Billing question',
      text: 'I was charged twice on my latest invoice — can you check?',
      category: 'billing',
      lang: 'en',
    },
    {
      id: 'sup-bill-ur',
      label: 'Roman Urdu billing',
      text: 'Mera bill galat hai — double charge ho gaya, please help.',
      category: 'multilingual',
      lang: 'ur',
    },
    {
      id: 'sup-account',
      label: 'Account issue',
      text: 'میرا اکاؤنٹ لاگ ان نہیں ہو رہا — مدد چاہیے۔',
      category: 'edge',
      lang: 'ur',
    },
    {
      id: 'sup-api',
      label: 'API key reset',
      text: 'How do I rotate my ElevenLabs API key in Voiceify?',
      category: 'info',
      lang: 'en',
    },
    {
      id: 'sup-refund',
      label: 'Refund request',
      text: 'I want a refund for unused minutes on my Pro plan.',
      category: 'billing',
      lang: 'en',
    },
    {
      id: 'sup-demo',
      label: 'Demo limits',
      text: 'How many free minutes do I get on the starter plan?',
      category: 'info',
      lang: 'en',
    },
    {
      id: 'sup-mixed',
      label: 'Mixed language',
      text: 'Account email change karni hai — steps bata dein please.',
      category: 'multilingual',
      lang: 'mixed',
    },
  ],
} as const satisfies Record<string, DemoPrompt[]>;

export type DemoPersonaId = keyof typeof DEMO_PROMPTS;

export function getDemoPrompts(personaId: string): DemoPrompt[] {
  if (personaId in DEMO_PROMPTS) {
    return DEMO_PROMPTS[personaId as DemoPersonaId];
  }
  return DEMO_PROMPTS.restaurant;
}
