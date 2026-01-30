import { useState, useRef } from 'react';
import { type AssignedColor, oklchToRgb, rgbToOklch } from '@kulrs/shared';
import './ColorSwatch.css';

interface EditableColorSwatchProps {
  color: AssignedColor;
  showControls?: boolean;
  onColorChange: (color: AssignedColor) => void;
}

// Convert OKLCH to hex for display
function oklchToHex(color: AssignedColor): string {
  const rgb = oklchToRgb(color.color);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// Determine if we should use white or black text on the color
function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

export function EditableColorSwatch({
  color,
  showControls = false,
  onColorChange,
}: EditableColorSwatchProps) {
  const [copied, setCopied] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const hex = oklchToHex(color);
  const textColor = getTextColor(hex);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(error => {
        console.error('Failed to copy to clipboard:', error);
      });
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    // Convert hex to OKLCH
    const r = parseInt(newHex.slice(1, 3), 16);
    const g = parseInt(newHex.slice(3, 5), 16);
    const b = parseInt(newHex.slice(5, 7), 16);
    const newOklch = rgbToOklch({ r, g, b });

    onColorChange({
      ...color,
      color: newOklch,
    });
  };

  const handleSwatchClick = () => {
    colorPickerRef.current?.click();
  };

  return (
    <div className="color-swatch editable-swatch">
      <input
        ref={colorPickerRef}
        type="color"
        value={hex}
        onChange={handleColorPickerChange}
        className="hidden-color-picker"
      />
      <div
        className="swatch-color"
        style={{ backgroundColor: hex, color: textColor }}
        onClick={handleSwatchClick}
      >
        <div className="swatch-info">
          <div className="swatch-role">{color.role}</div>
          <div className="swatch-hex">{hex}</div>
        </div>
        <div className="edit-indicator">✏️</div>
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
