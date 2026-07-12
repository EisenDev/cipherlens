import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

/**
 * Applies the resolved theme to <html data-theme="..."> immediately and
 * re-applies whenever the user changes their theme preference.
 *
 * Scope: Only dashboard CSS token variables respond to [data-theme="dark"].
 * Landing, login, and signup pages use their own styles and are unaffected.
 */

/** Imperatively sets data-theme on <html> — called before first render too */
function applyThemeToDOM(mode: string): void {
  let resolved: 'light' | 'dark';
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = (mode === 'dark') ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
}

// ─── Bootstrap: apply stored theme before first React paint ───────────────────
// Zustand persist rehydrates synchronously from localStorage on module load.
// We read the stored mode here and apply it immediately to avoid flash.
try {
  const stored = localStorage.getItem('cipherlens-theme');
  if (stored) {
    const parsed = JSON.parse(stored);
    const mode = parsed?.state?.mode ?? 'light';
    applyThemeToDOM(mode);
  }
} catch {
  // localStorage not available (e.g., incognito block) — default to light
  document.documentElement.setAttribute('data-theme', 'light');
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, _setResolvedTheme } = useThemeStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      let resolved: 'light' | 'dark';
      if (mode === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light';
      } else {
        resolved = mode === 'dark' ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved);
      _setResolvedTheme(resolved);
    };

    apply();

    if (mode === 'system') {
      mediaQuery.addEventListener('change', apply);
      return () => mediaQuery.removeEventListener('change', apply);
    }
  }, [mode, _setResolvedTheme]);

  return <>{children}</>;
}
