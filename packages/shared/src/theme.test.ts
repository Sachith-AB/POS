import { describe, expect, it } from 'vitest';
import { generateThemeTokens, getContrastTextColor } from './theme';

describe('getContrastTextColor', () => {
  it('returns dark text for white (very light) background', () => {
    expect(getContrastTextColor('#FFFFFF')).toBe('#0F172A');
  });

  it('returns light text for black (very dark) background', () => {
    expect(getContrastTextColor('#000000')).toBe('#FFFFFF');
  });

  it('returns light text for a dark blue primary', () => {
    expect(getContrastTextColor('#1E40AF')).toBe('#FFFFFF');
  });

  it('returns dark text for a light yellow primary', () => {
    expect(getContrastTextColor('#FDE047')).toBe('#0F172A');
  });

  it('accepts 3-digit hex shorthand', () => {
    expect(getContrastTextColor('#000')).toBe('#FFFFFF');
    expect(getContrastTextColor('#fff')).toBe('#0F172A');
  });

  it('throws on an invalid hex color', () => {
    expect(() => getContrastTextColor('not-a-color')).toThrow();
  });
});

describe('generateThemeTokens', () => {
  it('sets --color-primary and --on-primary from the input color', () => {
    const tokens = generateThemeTokens('#1E40AF', 'light');
    expect(tokens['--color-primary']).toBe('#1E40AF');
    expect(tokens['--on-primary']).toBe('#FFFFFF');
  });

  it('uses the fixed light palette for bg/surface/border/text, not the primary color', () => {
    const tokens = generateThemeTokens('#FF00FF', 'light');
    expect(tokens['--color-bg']).toBe('#F8FAFC');
    expect(tokens['--color-surface']).toBe('#FFFFFF');
    expect(tokens['--color-text-primary']).toBe('#0F172A');
  });

  it('uses the fixed dark palette for bg/surface/border/text, not the primary color', () => {
    const tokens = generateThemeTokens('#FF00FF', 'dark');
    expect(tokens['--color-bg']).toBe('#0F172A');
    expect(tokens['--color-surface']).toBe('#1E293B');
    expect(tokens['--color-text-primary']).toBe('#F1F5F9');
  });

  it('darkens primary-hover in light mode', () => {
    const tokens = generateThemeTokens('#1E40AF', 'light');
    expect(tokens['--color-primary-hover']).not.toBe(tokens['--color-primary']);
    // darker hover should have a lower luminance than the base primary
    const toLum = (hex: string) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(toLum(tokens['--color-primary-hover'])).toBeLessThan(toLum(tokens['--color-primary']));
  });

  it('lightens primary-hover in dark mode', () => {
    const tokens = generateThemeTokens('#1E40AF', 'dark');
    const toLum = (hex: string) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(toLum(tokens['--color-primary-hover'])).toBeGreaterThan(toLum(tokens['--color-primary']));
  });

  it('keeps status colors fixed per mode, independent of primary', () => {
    const a = generateThemeTokens('#1E40AF', 'light');
    const b = generateThemeTokens('#DC2626', 'light');
    expect(a['--color-success']).toBe(b['--color-success']);
    expect(a['--color-danger']).toBe(b['--color-danger']);
    expect(a['--color-warning']).toBe(b['--color-warning']);
  });
});
