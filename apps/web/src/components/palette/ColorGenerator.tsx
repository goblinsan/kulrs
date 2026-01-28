import { useState } from 'react';
import { type OKLCHColor } from '@kulrs/shared';
import './Generators.css';

interface ColorGeneratorProps {
  onGenerate: (color: OKLCHColor) => void;
  loading: boolean;
}

export function ColorGenerator({ onGenerate, loading }: ColorGeneratorProps) {
  const [hexColor, setHexColor] = useState('#646cff');

  const hexToOklch = (hex: string): OKLCHColor => {
    // Simple hex to RGB to OKLCH conversion (simplified for demo)
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    // This is a simplified conversion - in production, use the shared package conversions
    // For now, just create a reasonable OKLCH value from the hex
    const l = (r + g + b) / 3;
    const c = Math.sqrt((r - l) ** 2 + (g - l) ** 2 + (b - l) ** 2);
    const h = Math.atan2(b - l, r - l) * 180 / Math.PI;
    
    return {
      l: Math.max(0, Math.min(1, l)),
      c: Math.max(0, Math.min(0.4, c)),
      h: (h + 360) % 360,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const oklch = hexToOklch(hexColor);
    onGenerate(oklch);
  };

  return (
    <div className="generator-form">
      <h3>Generate from Base Color</h3>
      <p className="generator-description">
        Pick a base color to generate a harmonious palette
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="color-input-group">
          <input
            type="color"
            value={hexColor}
            onChange={(e) => setHexColor(e.target.value)}
            className="color-picker"
            disabled={loading}
          />
          <input
            type="text"
            value={hexColor}
            onChange={(e) => setHexColor(e.target.value)}
            placeholder="#646cff"
            className="hex-input"
            disabled={loading}
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
        <button type="submit" className="generate-button" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Palette'}
        </button>
      </form>
    </div>
  );
}
