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
  // Nature
  'vibrant sunset',
  'ocean calm',
  'forest morning',
  'tropical paradise',
  'desert warmth',
  'arctic aurora',
  'autumn leaves',
  'spring bloom',
  'mountain mist',
  'coral reef',
  'meadow fresh',
  'jungle wild',
  'coastal breeze',
  'rainforest lush',
  'cherry blossom',
  'lavender fields',
  'sunflower bright',
  // Moods & Emotions
  'cosmic energy',
  'urban night',
  'romantic evening',
  'mysterious depths',
  'peaceful zen',
  'playful carnival',
  'elegant luxury',
  'bold statement',
  'dreamy ethereal',
  'cozy fireplace',
  'serene meditation',
  'joyful celebration',
  // Styles
  'minimal modern',
  'vintage nostalgic',
  'neon cyberpunk',
  'synthwave retro',
  'scandinavian clean',
  'bohemian eclectic',
  'japanese aesthetic',
  'mediterranean blue',
  // Food & Drink
  'coffee mocha',
  'citrus fresh',
  'berry rich',
  'mint cool',
  'champagne gold',
  // Seasons & Time
  'summer vibrant',
  'winter frost',
  'golden hour',
  'midnight galaxy',
  'dawn hopeful',
  'twilight mysterious',
];

// Generate a palette once at module load time for consistent SSR
const initialMood = MOODS[Math.floor(Math.random() * MOODS.length)];
export const initialPalette: GeneratedPalette = generateFromMood(initialMood);
