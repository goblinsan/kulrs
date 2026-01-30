import {
  generateFromMood,
  oklchToRgb,
  type GeneratedPalette,
  type OKLCHColor,
} from '@kulrs/shared';

// Convert OKLCH to hex string
export function oklchToHex(oklch: OKLCHColor): string {
  const rgb = oklchToRgb(oklch);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

// Moods to randomly pick from for generating palettes
export const MOODS = [
  'vibrant sunset',
  'ocean calm',
  'forest morning',
  'cosmic energy',
  'urban night',
  'tropical paradise',
  'desert warmth',
  'arctic aurora',
  'autumn leaves',
  'spring bloom',
];

// Generate a palette once at module load time for consistent SSR
const initialMood = MOODS[Math.floor(Math.random() * MOODS.length)];
export const initialPalette: GeneratedPalette = generateFromMood(initialMood);
