import { franc } from 'franc-min';

export type LanguageMode = 'auto' | 'en' | 'ur';
export type LanguageCode = string;

const ARABIC_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const URDU_MARKERS = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06AF\u06BA\u06BE\u06C1\u06D2]/;

const ROMAN_URDU =
  /\b(salam|assalam|shukriya|meherbani|kya|mujhe|chahti|chahta|kitne|aaj|kal|waqt|mehman|bistar|chahiye|bata|karni|karna|subah|raat|baje|zaroor|bilkul|theek|masla|madad)\b/i;

/** Common English words — franc misclassifies short English phrases without these. */
const ENGLISH_MARKERS =
  /\b(i|me|my|we|you|your|the|a|an|is|are|was|were|want|need|book|reserve|reservation|table|appointment|help|hello|hi|hey|please|can|could|would|what|when|where|how|yes|no|for|to|at|on|in|do|does|did|have|has|had|like|make|get|talk|speak|call|menu|food|order|tonight|today|tomorrow)\b/i;

const SPANISH_MARKERS =
  /\b(quiero|reservar|mesa|hola|gracias|por favor|buenos|buenas|necesito|puedo|dónde|cómo|cuándo)\b/i;

const PORTUGUESE_MARKERS =
  /\b(quero|reservar|mesa|olá|obrigado|obrigada|por favor|preciso|posso|onde|como|quando|você|gostaria)\b/i;

const FRENCH_MARKERS =
  /\b(je|veux|réserver|bonjour|merci|s'il|besoin|pouvez|où|comment|quand)\b/i;

const GERMAN_MARKERS =
  /\b(ich|möchte|reservieren|tisch|hallo|danke|bitte|brauche|können|wo|wann|wie)\b/i;

/** Minimum text length before trusting franc-min on Latin script. */
const FRANC_MIN_CHARS = 28;

/** ISO 639-3 (Scribe / franc) → ISO 639-1 */
const ISO3_TO_ISO1: Record<string, LanguageCode> = {
  eng: 'en',
  urd: 'ur',
  hin: 'hi',
  ara: 'ar',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  por: 'pt',
  zho: 'zh',
  cmn: 'zh',
  jpn: 'ja',
  kor: 'ko',
  rus: 'ru',
  tur: 'tr',
  ben: 'bn',
  pan: 'pa',
  tam: 'ta',
  tel: 'te',
  mar: 'mr',
  ita: 'it',
  nld: 'nl',
  pol: 'pl',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  msa: 'ms',
  fil: 'fil',
  pus: 'ps',
  fas: 'fa',
  som: 'so',
  swa: 'sw',
};

/** Web Speech API BCP-47 locales */
const STT_LOCALES: Record<string, string> = {
  en: 'en-US',
  ur: 'ur-PK',
  hi: 'hi-IN',
  ar: 'ar-SA',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
  tr: 'tr-TR',
  bn: 'bn-BD',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
  ms: 'ms-MY',
  fil: 'fil-PH',
  fa: 'fa-IR',
  ps: 'ps-AF',
  sw: 'sw-KE',
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  ar: 'Arabic',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  tr: 'Turkish',
  bn: 'Bengali',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  fil: 'Filipino',
  fa: 'Persian',
  ps: 'Pashto',
  sw: 'Swahili',
  mixed: 'Mixed',
};

export const LANGUAGE_MODE_OPTIONS = [
  { id: 'auto' as const, label: 'Auto', hint: 'Any language' },
  { id: 'en' as const, label: 'English', hint: 'en-US' },
  { id: 'ur' as const, label: 'اردو', hint: 'ur-PK' },
] as const;

export function normalizeLanguageCode(raw?: string | null): LanguageCode {
  if (!raw) return 'en';
  const token = raw.toLowerCase().trim().split(/[-_]/)[0];
  if (ISO3_TO_ISO1[token]) return ISO3_TO_ISO1[token];
  if (token.length === 2 && LANGUAGE_LABELS[token]) return token;
  if (token === 'mixed') return 'mixed';
  return 'en';
}

export function getLanguageLabel(code: LanguageCode): string {
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS[normalizeLanguageCode(code)] ?? code.toUpperCase();
}

function detectScriptLanguage(text: string): LanguageCode | null {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  if (ARABIC_SCRIPT.test(text)) {
    return URDU_MARKERS.test(text) ? 'ur' : 'ar';
  }
  return null;
}

function countMarkerHits(text: string, pattern: RegExp): number {
  return text.match(new RegExp(pattern.source, 'gi'))?.length ?? 0;
}

function detectMarkedLatinLanguage(text: string): LanguageCode | null {
  const scores: Array<{ code: LanguageCode; hits: number }> = [
    { code: 'en', hits: countMarkerHits(text, ENGLISH_MARKERS) },
    { code: 'es', hits: countMarkerHits(text, SPANISH_MARKERS) },
    { code: 'pt', hits: countMarkerHits(text, PORTUGUESE_MARKERS) },
    { code: 'fr', hits: countMarkerHits(text, FRENCH_MARKERS) },
    { code: 'de', hits: countMarkerHits(text, GERMAN_MARKERS) },
  ].filter((entry) => entry.hits > 0);

  if (!scores.length) return null;

  const topHits = Math.max(...scores.map((entry) => entry.hits));
  const leaders = scores.filter((entry) => entry.hits === topHits);
  const english = scores.find((entry) => entry.code === 'en');

  if (english && english.hits >= 2 && english.hits >= topHits - 1) return 'en';
  if (leaders.length === 1) return leaders[0].code;
  return 'en';
}

function detectLatinLanguage(text: string): LanguageCode {
  const hasLatin = /[a-zA-Z]/.test(text);
  if (!hasLatin) return 'en';

  if (ROMAN_URDU.test(text)) {
    return ARABIC_SCRIPT.test(text) ? 'mixed' : 'mixed';
  }

  const marked = detectMarkedLatinLanguage(text);
  if (marked) return marked;

  if (text.trim().length >= FRANC_MIN_CHARS) {
    const iso3 = franc(text, { minLength: 12 });
    if (iso3 && iso3 !== 'und') {
      return normalizeLanguageCode(iso3);
    }
  }

  return 'en';
}

/** Whether a detected language switch is reliable enough to retarget STT. */
export function isConfidentLanguageSwitch(
  sampleText: string,
  detected: LanguageCode,
  current: LanguageCode = 'en',
): boolean {
  const normalized = normalizeLanguageCode(detected);
  const prev = normalizeLanguageCode(current);
  if (normalized === prev) return false;

  const trimmed = sampleText.trim();
  if (trimmed.length < 12) return false;

  const marked = detectMarkedLatinLanguage(trimmed);
  if (marked && marked === normalized) return true;

  if (detectScriptLanguage(trimmed)) return true;
  if (ARABIC_SCRIPT.test(trimmed)) return true;
  if (ROMAN_URDU.test(trimmed)) return true;

  if (prev === 'en' && ENGLISH_MARKERS.test(trimmed) && trimmed.length < FRANC_MIN_CHARS) {
    return false;
  }

  return trimmed.length >= FRANC_MIN_CHARS;
}

/** Detect language from user text — script, Roman Urdu, or franc-min for Latin scripts. */
export function detectLanguage(text: string): LanguageCode {
  const trimmed = text.trim();
  if (!trimmed) return 'en';

  const hasArabicScript = ARABIC_SCRIPT.test(trimmed);
  const hasLatin = /[a-zA-Z]/.test(trimmed);

  if (hasArabicScript && hasLatin) return 'mixed';
  if (hasArabicScript) return URDU_MARKERS.test(trimmed) ? 'ur' : 'ar';

  const script = detectScriptLanguage(trimmed);
  if (script) return script;

  if (ROMAN_URDU.test(trimmed) && hasLatin) return 'mixed';

  return detectLatinLanguage(trimmed);
}

export function detectLanguageFromAudioMeta(
  languageCode: string | undefined,
  probability: number | undefined,
  fallbackText: string,
): LanguageCode {
  if (languageCode && (probability ?? 0) >= 0.45) {
    return normalizeLanguageCode(languageCode);
  }
  return detectLanguage(fallbackText);
}

/** ISO 639-1 → ISO 639-3 for ElevenLabs Scribe `language_code`. */
const ISO1_TO_ISO3: Record<string, string> = {
  en: 'eng',
  ur: 'urd',
  hi: 'hin',
  ar: 'ara',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  pt: 'por',
  zh: 'zho',
  ja: 'jpn',
  ko: 'kor',
  ru: 'rus',
  tr: 'tur',
  bn: 'ben',
  pa: 'pan',
  ta: 'tam',
  te: 'tel',
  mr: 'mar',
  it: 'ita',
  nl: 'nld',
  pl: 'pol',
  th: 'tha',
  vi: 'vie',
  id: 'ind',
  ms: 'msa',
  fil: 'fil',
  fa: 'fas',
  ps: 'pus',
  sw: 'swa',
};

/** Scribe language hint — omit for auto-detect (mixed / auto mode). */
export function toScribeLanguageCode(code: LanguageCode, mode: LanguageMode = 'auto'): string | undefined {
  if (mode === 'auto') return undefined;
  const normalized = normalizeLanguageCode(code);
  if (normalized === 'mixed') return undefined;
  return ISO1_TO_ISO3[normalized];
}

export function resolveSttLocale(mode: LanguageMode, code: LanguageCode): string {
  if (mode === 'en') return 'en-US';
  if (mode === 'ur') return 'ur-PK';
  const normalized = normalizeLanguageCode(code);
  return STT_LOCALES[normalized] ?? 'en-US';
}

export function buildLanguageInstruction(code: LanguageCode): string {
  const normalized = normalizeLanguageCode(code);
  if (normalized === 'mixed') {
    return 'CRITICAL: Match the user exactly — reply in the same language mix they used (e.g. English + Urdu). ONE sentence, max 18 words.';
  }
  const label = getLanguageLabel(normalized);
  return `CRITICAL: The user is speaking ${label}. Reply ONLY in ${label} — natural spoken style, same language as the user. ONE sentence, max 18 words. Never switch languages unless the user does.`;
}

/** @deprecated Use LanguageCode */
export type SupportedLanguage = LanguageCode;
