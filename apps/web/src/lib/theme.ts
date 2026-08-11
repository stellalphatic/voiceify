export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ag-theme';
const LEGACY_KEYS = ['voiceify-theme', 'theme'] as const;

/** Matches --bg-base in index.css for mobile browser chrome. */
export const THEME_COLOR: Record<Theme, string> = {
  light: '#f5f5f5',
  dark: '#0c0a09',
};

export function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const raw = document.documentElement.getAttribute('data-theme');
  return raw === 'dark' ? 'dark' : 'light';
}

function syncThemeColorMeta(theme: Theme) {
  if (typeof document === 'undefined') return;
  const color = THEME_COLOR[theme];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  syncThemeColorMeta(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private browsing */
  }
}

/** Run once at boot — migrates legacy keys into ag-theme. */
export function bootstrapTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

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

  const resolved: Theme = theme === 'dark' ? 'dark' : 'light';
  applyTheme(resolved);

  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }

  return resolved;
}
