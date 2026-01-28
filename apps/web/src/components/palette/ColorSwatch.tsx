import { type AssignedColor, oklchToRgb } from '@kulrs/shared';
import { useState } from 'react';
import './ColorSwatch.css';

interface ColorSwatchProps {
  color: AssignedColor;
  showControls?: boolean;
}

// Convert OKLCH to hex for display
function oklchToHex(color: AssignedColor): string {
  const rgb = oklchToRgb(color.color);

  // Convert to hex
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// Determine if we should use white or black text on the color
function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000' : '#fff';
}

export function ColorSwatch({ color, showControls = false }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);
  const hex = oklchToHex(color);
  const textColor = getTextColor(hex);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        console.error('Failed to copy to clipboard:', error);
      });
  };

  return (
    <div className="color-swatch">
      <div
        className="swatch-color"
        style={{ backgroundColor: hex, color: textColor }}
      >
        <div className="swatch-info">
          <div className="swatch-role">{color.role}</div>
          <div className="swatch-hex">{hex}</div>
        </div>
      </div>

      {showControls && (
        <div className="swatch-controls">
          <button onClick={handleCopy} className="copy-button">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
