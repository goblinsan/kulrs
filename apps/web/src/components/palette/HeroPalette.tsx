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

interface HeroPaletteProps {
  palette?: GeneratedPalette | null;
}

export function HeroPalette({ palette: externalPalette }: HeroPaletteProps) {
  // Use external palette if provided, otherwise use the pre-generated one
  const displayPalette: GeneratedPalette = useMemo(() => {
    return externalPalette || initialPalette;
  }, [externalPalette]);

  // Take first 5 colors for the hero display
  const heroColors = displayPalette.colors.slice(0, 5);

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
