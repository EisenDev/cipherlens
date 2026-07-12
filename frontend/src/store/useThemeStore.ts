import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Supported display theme modes */
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolved theme based on mode + system preference */
  resolvedTheme: 'light' | 'dark';
  _setResolvedTheme: (resolved: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      resolvedTheme: 'light',
      setMode: (mode) => set({ mode }),
      _setResolvedTheme: (resolved) => set({ resolvedTheme: resolved }),
    }),
    {
      name: 'cipherlens-theme',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);
