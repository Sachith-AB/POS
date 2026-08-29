export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  '--color-primary': string;
  '--color-primary-hover': string;
  '--on-primary': string;
  '--color-bg': string;
  '--color-surface': string;
  '--color-border': string;
  '--color-text-primary': string;
  '--color-text-secondary': string;
  '--color-success': string;
  '--color-danger': string;
  '--color-warning': string;
}

interface BasePalette {
  bg: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  danger: string;
  warning: string;
}

const BASE_PALETTES: Record<ThemeMode, BasePalette> = {
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    success: '#16A34A',
    danger: '#DC2626',
    warning: '#D97706',
  },
  dark: {
    bg: '#0F172A',
    surface: '#1E293B',
    border: '#334155',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
};

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function normalizeHex(hex: string): string {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${h.toUpperCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0 = black, 1 = white) */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Returns the text color to place on top of `hexColor` per the WCAG
 * relative-luminance formula: light backgrounds get dark text, dark
 * backgrounds get light text.
 */
export function getContrastTextColor(hexColor: string): '#FFFFFF' | '#0F172A' {
  const L = relativeLuminance(hexColor);
  return L > 0.5 ? '#0F172A' : '#FFFFFF';
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h /= 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(hn) * 255),
    b: Math.round(hue2rgb(hn - 1 / 3) * 255),
  };
}

/** Shifts a hex color's HSL lightness by `deltaPercent` (e.g. -8, +8), clamped to [0,100]. */
function shiftLightness(hex: string, deltaPercent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(1, l + deltaPercent / 100));
  const rgb = hslToRgb(h, s, newL);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Generates the full CSS-variable token set for a given primary color and
 * light/dark mode. Background/surface/border/text/status colors come from
 * the fixed base palette for that mode; only --color-primary,
 * --color-primary-hover, and --on-primary are derived from primaryColor.
 */
export function generateThemeTokens(primaryColor: string, mode: ThemeMode): ThemeTokens {
  const primary = normalizeHex(primaryColor);
  const palette = BASE_PALETTES[mode];
  // Light mode: darken on hover (users expect buttons to deepen).
  // Dark mode: lighten on hover (deepening would vanish into the dark bg).
  const hoverDelta = mode === 'light' ? -8 : 8;

  return {
    '--color-primary': primary,
    '--color-primary-hover': shiftLightness(primary, hoverDelta),
    '--on-primary': getContrastTextColor(primary),
    '--color-bg': palette.bg,
    '--color-surface': palette.surface,
    '--color-border': palette.border,
    '--color-text-primary': palette.textPrimary,
    '--color-text-secondary': palette.textSecondary,
    '--color-success': palette.success,
    '--color-danger': palette.danger,
    '--color-warning': palette.warning,
  };
}

/** Renders a token map as a CSS declaration block body (no selector wrapper). */
export function themeTokensToCss(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}
