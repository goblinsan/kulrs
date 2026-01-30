import { useMemo, useState } from 'react';
import {
  generateFromMood,
  oklchToRgb,
  type GeneratedPalette,
  type OKLCHColor,
} from '@kulrs/shared';
import './HeroPalette.css';

// Convert OKLCH to hex string
function oklchToHex(oklch: OKLCHColor): string {
  const rgb = oklchToRgb(oklch);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

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
  const [activePopup, setActivePopup] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Use external palette if provided, otherwise use the pre-generated one
  const displayPalette: GeneratedPalette = useMemo(() => {
    return externalPalette || initialPalette;
  }, [externalPalette]);

  // Take first 5 colors for the hero display
  const heroColors = displayPalette.colors.slice(0, 5);

  const handleColorClick = (index: number) => {
    setActivePopup(activePopup === index ? null : index);
    setCopied(false);
  };

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBackdropClick = () => {
    setActivePopup(null);
  };

  return (
    <>
      {activePopup !== null && (
        <div className="hero-popup-backdrop" onClick={handleBackdropClick} />
      )}
      <div className="hero-palette">
        {heroColors.map((colorItem, index) => {
          // Convert OKLCH to CSS
          const { l, c, h } = colorItem.color;
          const cssColor = `oklch(${l} ${c} ${h})`;
          const hexColor = oklchToHex(colorItem.color);

          return (
            <div
              key={index}
              className="hero-color-block"
              style={{ backgroundColor: cssColor }}
              onClick={() => handleColorClick(index)}
            >
              {activePopup === index && (
                <div
                  className="hero-color-popup"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="popup-hex-display">{hexColor}</div>
                  <button
                    className="popup-copy-button"
                    onClick={() => handleCopyHex(hexColor)}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
