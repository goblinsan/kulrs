import { useMemo, useState } from 'react';
import { type GeneratedPalette } from '@kulrs/shared';
import { oklchToHex, initialPalette } from './paletteUtils';
import './HeroPalette.css';

interface HeroPaletteProps {
  palette?: GeneratedPalette | null;
}

export function HeroPalette({ palette: externalPalette }: HeroPaletteProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Use external palette if provided, otherwise use the pre-generated one
  const displayPalette: GeneratedPalette = useMemo(() => {
    return externalPalette || initialPalette;
  }, [externalPalette]);

  // Get main colors (excluding background/text which are "derived" colors)
  // Main colors are the first colors in the array before any derived ones
  const heroColors = useMemo(() => {
    // Filter out background and text roles which are typically at the end
    const mainColors = displayPalette.colors.filter(
      c => c.role !== 'background' && c.role !== 'text'
    );
    // Take up to 5 main colors for hero display
    return mainColors.slice(0, 5);
  }, [displayPalette]);

  const handleCopyHex = async (hex: string, index: number) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="hero-palette">
      {heroColors.map((colorItem, index) => {
        // Convert OKLCH to CSS
        const { l, c, h } = colorItem.color;
        const cssColor = `oklch(${l} ${c} ${h})`;
        const hexColor = oklchToHex(colorItem.color);
        // Determine if text should be dark or light based on luminance
        const textColor = l > 0.6 ? '#000' : '#fff';

        return (
          <div
            key={index}
            className="hero-color-block"
            style={{ backgroundColor: cssColor }}
          >
            <div
              className="hero-hex-tooltip"
              style={{ color: textColor }}
              onClick={() => handleCopyHex(hexColor, index)}
            >
              {copiedIndex === index ? 'Copied!' : hexColor}
            </div>
          </div>
        );
      })}
    </div>
  );
}
