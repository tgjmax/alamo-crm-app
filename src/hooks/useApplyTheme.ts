import { useEffect, useState } from 'react';
import { resolveTheme, useThemeStore } from '../stores/themeStore';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MEDIA_QUERY).matches
    : false;
}

/** Resolved 'light' | 'dark', reactive to the store and OS appearance changes. */
export function useEffectiveTheme(): 'light' | 'dark' {
  const theme = useThemeStore((s) => s.theme);
  const [osDark, setOsDark] = useState(prefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return resolveTheme(theme, osDark);
}

/** Side-effect hook: keeps the <html> `.dark` class in sync with the effective theme. */
export function useApplyTheme(): void {
  const effective = useEffectiveTheme();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }, [effective]);
}
