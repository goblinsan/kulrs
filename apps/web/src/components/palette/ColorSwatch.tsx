import { type AssignedColor } from '@kulrs/shared';
import { useState } from 'react';
import './ColorSwatch.css';

interface ColorSwatchProps {
  color: AssignedColor;
  showControls?: boolean;
}

// Convert OKLCH to hex for display
function oklchToHex(color: AssignedColor): string {
  // This is a simplified conversion - in production, use proper color space conversion
  const { l, c, h } = color.color;
  
  // Convert OKLCH to linear RGB (simplified)
  const a = c * Math.cos(h * Math.PI / 180);
  const b = c * Math.sin(h * Math.PI / 180);
  
  // Convert to sRGB (very simplified - proper conversion is more complex)
  let r = l + 0.3963377774 * a + 0.2158037573 * b;
  let g = l - 0.1055613458 * a - 0.0638541728 * b;
  let bl = l - 0.0894841775 * a - 1.2914855480 * b;
  
  // Clamp and convert to 0-255
  r = Math.max(0, Math.min(1, r)) * 255;
  g = Math.max(0, Math.min(1, g)) * 255;
  bl = Math.max(0, Math.min(1, bl)) * 255;
  
  // Convert to hex
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
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
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
