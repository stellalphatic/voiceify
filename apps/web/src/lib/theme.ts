export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ag-theme';
const LEGACY_KEYS = ['voiceify-theme', 'theme'] as const;

export function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const raw = document.documentElement.getAttribute('data-theme');
  return raw === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private browsing */
  }
}

/** Run once at boot — migrates legacy keys into ag-theme. */
export function bootstrapTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  let theme: Theme | null = null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch {
    /* ignore */
  }

  if (!theme) {
    for (const key of LEGACY_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val === 'light' || val === 'dark') {
          theme = val;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }

  const resolved: Theme = theme === 'light' ? 'light' : 'dark';
  applyTheme(resolved);

  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }

  return resolved;
}

export function enablePixelUi() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-pixel', 'on');
}
