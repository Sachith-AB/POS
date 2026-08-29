import { useEffect } from 'react';

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/** Section 2/4.1: whole-screen keyboard shortcuts (F1 search, F2 payment, F12 print, Esc cancel). */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const fn = shortcuts[e.key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
