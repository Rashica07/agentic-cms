'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'np-theme';

/** Apply the theme class + persist. Kept in sync with the no-flash script in layout.tsx. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode / storage disabled — the class still applies for this session */
  }
}

/**
 * Light/dark theme control. The actual class is set pre-paint by the inline
 * script in the root layout (no flash); this hook mirrors that state for the
 * toggle UI and flips it on demand. Light is the default.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    let stored: Theme = 'light';
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Theme) || 'light';
    } catch {
      /* ignore */
    }
    setThemeState(stored);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggle };
}
