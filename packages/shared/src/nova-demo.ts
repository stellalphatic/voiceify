/** Nova demo presentation — shared by client greeting + server TTS preload. */

export type DemoLanguageMode = 'auto' | 'en' | 'ur';

export const NOVA_DEMO_SCRIPT = {
  en:
    "Welcome to Voiceify! I'm Nova, your host at Garden Bistro. " +
    "I answer every rush-hour call in seconds — English, Urdu, or any language you speak. " +
    "Try asking me to book a table, check the menu, or change a reservation. Go ahead, I'm listening!",
  ur:
    'وائسفائی میں خوش آمدید! میں نووا ہوں، گارڈن بائسٹرو سے۔ ' +
    'میں ہر رش آور کال فوراً سنبھالتی ہوں — اردو، انگریزی، یا کوئی بھی زبان۔ ' +
    'ٹیبل بک کریں، مینو پوچھیں، یا ریزرویشن بدلیں۔ بتائیں، میں سن رہی ہوں!',
  auto:
    "Welcome to Voiceify! I'm Nova from Garden Bistro — rush-hour calls, any language. " +
    "Book a table, ask about the menu, or change a booking. / ٹیبل بک کریں یا مینو پوچھیں — I'm ready!",
} as const;

export function getNovaDemoGreeting(mode: DemoLanguageMode): string {
  if (mode === 'ur') return NOVA_DEMO_SCRIPT.ur;
  if (mode === 'auto') return NOVA_DEMO_SCRIPT.auto;
  return NOVA_DEMO_SCRIPT.en;
}

export function getDemoGreeting(personaId: string, mode: DemoLanguageMode): string | null {
  if (personaId === 'restaurant') return getNovaDemoGreeting(mode);
  return null;
}
