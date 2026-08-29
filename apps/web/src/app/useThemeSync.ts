import { useEffect } from 'react';
import { generateThemeTokens, type ThemeMode } from '@pos/shared';
import { useAppSelector } from './hooks';

function resolveMode(mode: 'light' | 'dark' | 'system'): ThemeMode {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTokens(primaryColor: string, mode: ThemeMode) {
  const tokens = generateThemeTokens(primaryColor, mode);
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

/** Applies shop_settings' primaryColor/themeMode as CSS variables and keeps them live with OS theme changes. */
export function useThemeSync() {
  const settings = useAppSelector((s) => s.settings.data);

  useEffect(() => {
    if (!settings) return;
    const primaryColor = settings.primaryColor;
    const mode = resolveMode(settings.themeMode);
    applyTokens(primaryColor, mode);
    localStorage.setItem('pos:theme', JSON.stringify({ mode: settings.themeMode, primaryColor }));

    if (settings.themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTokens(primaryColor, resolveMode('system'));
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [settings]);
}
