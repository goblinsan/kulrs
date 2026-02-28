/**
 * Centralized color utility functions.
 *
 * Eliminates duplication of oklchToHex, hexToOklch, getTextColor, randomHex,
 * and parseColorsFromParams across page components.
 */

import { type OKLCHColor, type RGBColor, oklchToRgb, rgbToOklch } from '@kulrs/shared';

// ---------------------------------------------------------------------------
// Hex ↔ OKLCH conversions
// ---------------------------------------------------------------------------

/** Convert an OKLCH color to a hex string (e.g. `#FF9900`). */
export function oklchToHex(oklch: OKLCHColor): string {
  const rgb = oklchToRgb(oklch);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/** Convert a hex string (e.g. `#FF9900`) to an OKLCH color. */
export function hexToOklch(hex: string): OKLCHColor {
  const rgb = hexToRgb(hex);
  return rgbToOklch(rgb);
}

// ---------------------------------------------------------------------------
// Hex ↔ RGB conversions
// ---------------------------------------------------------------------------

/** Parse a hex string to {r, g, b} (0-255). */
export function hexToRgb(hex: string): RGBColor {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Convert {r, g, b} (0-255) to a hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Contrast / luminance
// ---------------------------------------------------------------------------

/**
 * Perceived luminance (0–1) of a hex color.
 * Uses the common weighted-average formula (BT.601).
 */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Return `'#000'` or `'#fff'` for readable text over `hex`. */
export function getTextColor(hex: string): string {
  return luminance(hex) > 0.5 ? '#000' : '#fff';
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/** Generate a random hex color string. */
export function randomHex(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()
  );
}

// ---------------------------------------------------------------------------
// URL / sessionStorage palette loading
// ---------------------------------------------------------------------------

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * Parse palette hex colors from URL search params or sessionStorage.
 *
 * Priority:
 * 1. `?colors=FF0000,00FF00,…` (comma-separated, with or without `#`)
 * 2. `?palette=<json>` with `{ colors: [{ hexValue }] }`
 * 3. `sessionStorage['kulrs_palette_colors']`
 */
export function parseColorsFromParams(sp: URLSearchParams): string[] | null {
  // 1. ?colors=
  const raw = sp.get('colors');
  if (raw) {
    return raw
      .split(',')
      .map(v => (v.startsWith('#') ? v : `#${v}`))
      .filter(v => HEX6.test(v));
  }

  // 2. ?palette=<json>
  const json = sp.get('palette');
  if (json) {
    try {
      const parsed = JSON.parse(decodeURIComponent(json));
      if (Array.isArray(parsed?.colors)) {
        return (parsed.colors as { hexValue: string }[]).map(c => c.hexValue);
      }
    } catch {
      /* ignore */
    }
  }

  // 3. sessionStorage fallback
  try {
    const stored = sessionStorage.getItem('kulrs_palette_colors');
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.filter(v => HEX6.test(v));
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Build a `?colors=` query-string from an array of OKLCH colors,
 * and navigate to the given route.
 */
export function buildPaletteColorsParam(
  oklchColors: OKLCHColor[]
): string {
  return oklchColors
    .map(c => {
      const rgb = oklchToRgb(c);
      const toHex = (n: number) =>
        Math.round(Math.max(0, Math.min(255, n)))
          .toString(16)
          .padStart(2, '0');
      return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    })
    .join(',');
}
