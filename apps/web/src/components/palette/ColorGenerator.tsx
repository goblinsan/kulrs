import { useState } from 'react';
import { type OKLCHColor, rgbToOklch } from '@kulrs/shared';
import './Generators.css';

interface ColorGeneratorProps {
  onGenerate: (colors: OKLCHColor[]) => void;
  loading: boolean;
}

const MAX_COLORS = 5;

export function ColorGenerator({ onGenerate, loading }: ColorGeneratorProps) {
  const [colors, setColors] = useState<string[]>(['#646cff']);
  const [hexInput, setHexInput] = useState('');

  const hexToOklch = (hex: string): OKLCHColor | null => {
    // Clean and validate hex format
    const cleanHex = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      return null;
    }

    // Convert hex to RGB
    const r = parseInt(cleanHex.slice(1, 3), 16);
    const g = parseInt(cleanHex.slice(3, 5), 16);
    const b = parseInt(cleanHex.slice(5, 7), 16);

    // Use the proper conversion from shared package
    return rgbToOklch({ r, g, b });
  };

  const parseHexInput = (input: string): string[] => {
    // Parse comma or space separated hex colors
    return input
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => (s.startsWith('#') ? s : `#${s}`))
      .filter(s => /^#[0-9A-Fa-f]{6}$/i.test(s))
      .slice(0, MAX_COLORS);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);

    // Auto-parse if we detect valid colors
    const parsed = parseHexInput(value);
    if (parsed.length > 0) {
      setColors(parsed);
    }
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
    setHexInput(newColors.join(', '));
  };

  const addColor = () => {
    if (colors.length < MAX_COLORS) {
      const newColors = [...colors, '#888888'];
      setColors(newColors);
      setHexInput(newColors.join(', '));
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      const newColors = colors.filter((_, i) => i !== index);
      setColors(newColors);
      setHexInput(newColors.join(', '));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const oklchColors = colors
        .map(hexToOklch)
        .filter((c): c is OKLCHColor => c !== null);

      if (oklchColors.length === 0) {
        alert('Please enter at least one valid hex color');
        return;
      }

      onGenerate(oklchColors);
    } catch (error) {
      console.error('Invalid color:', error);
    }
  };

  return (
    <div className="generator-form">
      <h3>Generate from Base Colors</h3>
      <p className="generator-description">
        Pick up to {MAX_COLORS} base colors to generate a harmonious palette
      </p>

      <form onSubmit={handleSubmit}>
        <div className="multi-color-input">
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            placeholder="#646cff, #ff6464, #64ff64"
            className="hex-input"
            disabled={loading}
          />
        </div>

        <div className="color-pickers-row">
          {colors.map((color, index) => (
            <div key={index} className="color-picker-item">
              <input
                type="color"
                value={color}
                onChange={e => handleColorChange(index, e.target.value)}
                className="color-picker"
                disabled={loading}
              />
              {colors.length > 1 && (
                <button
                  type="button"
                  className="remove-color-button"
                  onClick={() => removeColor(index)}
                  disabled={loading}
                  title="Remove color"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {colors.length < MAX_COLORS && (
            <button
              type="button"
              className="add-color-button"
              onClick={addColor}
              disabled={loading}
              title="Add another color"
            >
              +
            </button>
          )}
        </div>

        <button type="submit" className="generate-button" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Palette'}
        </button>
      </form>
    </div>
  );
}
