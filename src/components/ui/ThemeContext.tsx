'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEYS = ['itsm_theme', 'theme'];

const fallbackContext: ThemeContextType = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(fallbackContext);

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage or system
  useEffect(() => {
    try {
      const stored = (localStorage.getItem('itsm_theme') || localStorage.getItem('theme')) as Theme | null;
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setThemeState(stored);
      }
    } catch (_) {
      // localStorage may be restricted in some environments
    }
    setMounted(true);
  }, []);

  // Update resolved theme and DOM classList whenever theme changes
  useEffect(() => {
    if (!mounted && typeof window === 'undefined') return;

    const computeResolvedTheme = (): ResolvedTheme => {
      if (theme === 'system') {
        return getSystemTheme();
      }
      return theme;
    };

    const resolved = computeResolvedTheme();
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Media query listener for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const nextResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(nextResolved);
        if (nextResolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      STORAGE_KEYS.forEach((k) => localStorage.setItem(k, newTheme));
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme: Theme = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
      try {
        STORAGE_KEYS.forEach((k) => localStorage.setItem(k, nextTheme));
      } catch (_) {}
      return nextTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  return context || fallbackContext;
}
