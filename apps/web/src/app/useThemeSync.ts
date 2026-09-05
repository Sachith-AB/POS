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

/** Applies shop_settings' primaryColor/themeMode/logo as CSS variables, favicon, and tab title. */
export function useThemeSync() {
  const settings = useAppSelector((s) => s.settings.data);

  useEffect(() => {
    if (!settings) return;
    const primaryColor = settings.primaryColor;
    const mode = resolveMode(settings.themeMode);
    applyTokens(primaryColor, mode);

    // Sync browser tab Favicon dynamically with store's uploaded logo
    const fav =
      (document.getElementById('app-favicon') as HTMLLinkElement) ||
      (document.querySelector("link[rel*='icon']") as HTMLLinkElement);
    if (fav) {
      if (settings.logoUrl) {
        const fullLogoUrl = settings.logoUrl.startsWith('http')
          ? settings.logoUrl
          : `http://localhost:4000${settings.logoUrl}`;
        fav.href = fullLogoUrl;

        // Sync Desktop Electron Window & Taskbar Icon with company logo
        if ((window as any).electronApp?.setWindowIcon) {
          (window as any).electronApp.setWindowIcon(fullLogoUrl);
        }
      } else {
        fav.href = '/favicon.svg';
      }
    }

    if (settings.companyName) {
      document.title = `${settings.companyName} | POS`;
    }

    localStorage.setItem(
      'pos:theme',
      JSON.stringify({
        mode: settings.themeMode,
        primaryColor,
        logoUrl: settings.logoUrl,
        companyName: settings.companyName,
      })
    );

    if (settings.themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTokens(primaryColor, resolveMode('system'));
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [settings]);
}
