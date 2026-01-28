import { useState } from 'react';
import { type OKLCHColor, rgbToOklch } from '@kulrs/shared';
import './Generators.css';

interface ColorGeneratorProps {
  onGenerate: (color: OKLCHColor) => void;
  loading: boolean;
}

export function ColorGenerator({ onGenerate, loading }: ColorGeneratorProps) {
  const [hexColor, setHexColor] = useState('#646cff');

  const hexToOklch = (hex: string): OKLCHColor => {
    // Validate hex format
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      throw new Error('Invalid hex color format');
    }

    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Use the proper conversion from shared package
    return rgbToOklch({ r, g, b });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const oklch = hexToOklch(hexColor);
      onGenerate(oklch);
    } catch (error) {
      console.error('Invalid color:', error);
    }
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
            onChange={e => setHexColor(e.target.value)}
            className="color-picker"
            disabled={loading}
          />
          <input
            type="text"
            value={hexColor}
            onChange={e => setHexColor(e.target.value)}
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
