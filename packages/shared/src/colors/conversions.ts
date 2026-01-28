import { OKLCHColor, HSLColor } from './types';
import { rgbToHsl, hslToRgb } from './hsl';
import { rgbToOklch, oklchToRgb } from './oklch';

/**
 * Converts OKLCH to HSL (via RGB)
 * @param oklch - OKLCH color
 * @returns HSL color
 */
export function oklchToHsl(oklch: OKLCHColor): HSLColor {
  const rgb = oklchToRgb(oklch);
  return rgbToHsl(rgb);
}

/**
 * Converts HSL to OKLCH (via RGB)
 * @param hsl - HSL color
 * @returns OKLCH color
 */
export function hslToOklch(hsl: HSLColor): OKLCHColor {
  const rgb = hslToRgb(hsl);
  return rgbToOklch(rgb);
}
