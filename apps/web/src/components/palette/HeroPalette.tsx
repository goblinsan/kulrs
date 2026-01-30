import { useMemo } from 'react';
import { generateFromMood, type GeneratedPalette } from '@kulrs/shared';
import './HeroPalette.css';

// Moods to randomly pick from for generating palettes
const MOODS = [
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
const initialPalette = generateFromMood(initialMood);

export function HeroPalette() {
  // Use the pre-generated palette to avoid effects
  const palette: GeneratedPalette = useMemo(() => initialPalette, []);

  // Take first 5 colors for the hero display
  const heroColors = palette.colors.slice(0, 5);

  return (
    <div className="hero-palette">
      {heroColors.map((colorItem, index) => {
        // Convert OKLCH to CSS
        const { l, c, h } = colorItem.color;
        const cssColor = `oklch(${l} ${c} ${h})`;

        return (
          <div
            key={index}
            className="hero-color-block"
            style={{ backgroundColor: cssColor }}
          />
        );
      })}
    </div>
  );
}
