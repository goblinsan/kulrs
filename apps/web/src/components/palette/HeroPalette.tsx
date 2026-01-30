import { useEffect, useState } from 'react';
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

export function HeroPalette() {
  const [palette, setPalette] = useState<GeneratedPalette | null>(null);

  useEffect(() => {
    // Pick a random mood and generate a palette
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const generated = generateFromMood(randomMood);
    setPalette(generated);
  }, []);

  if (!palette) {
    return <div className="hero-palette hero-palette-loading" />;
  }

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
