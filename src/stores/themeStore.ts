import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'alamo-theme';

// NOTE: index.html has a pre-paint inline script that duplicates this validation
// in plain JS (it runs before any module loads). Keep the two in sync.
export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to default.
  }
  return 'system';
}

/** Pure: resolves 'system' against the OS preference; passes literals through. */
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Best-effort persistence; state still updates in-memory.
    }
    set({ theme });
  },
}));
