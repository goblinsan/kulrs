import { useState } from 'react';
import { type AssignedColor, rgbToOklch } from '@kulrs/shared';
import { oklchToHex, getTextColor, hexToRgb } from '../../utils/colorUtils';
import './ColorSwatch.css';

interface EditableColorSwatchProps {
  color: AssignedColor;
  onColorChange: (color: AssignedColor) => void;
}

export function EditableColorSwatch({
  color,
  onColorChange,
}: EditableColorSwatchProps) {
  const [copied, setCopied] = useState(false);
  const hex = oklchToHex(color.color);
  const textColor = getTextColor(hex);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(error => {
        console.error('Failed to copy to clipboard:', error);
      });
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { r, g, b } = hexToRgb(e.target.value);
    const newOklch = rgbToOklch({ r, g, b });

    onColorChange({
      ...color,
      color: newOklch,
    });
  };

  return (
    <div className="color-swatch editable-swatch">
      <div
        className="swatch-color"
        style={{ backgroundColor: hex, color: textColor }}
        onClick={handleCopy}
      >
        <span className={`swatch-hex ${copied ? 'copied' : ''}`}>
          {copied ? '✓ Copied' : hex}
        </span>
        <label className="edit-color-label" onClick={e => e.stopPropagation()}>
          <span className="edit-indicator-visible">Edit</span>
          <input
            type="color"
            value={hex}
            onChange={handleColorPickerChange}
            className="swatch-color-picker"
          />
        </label>
      </div>
      <div className="swatch-label">{color.role}</div>
    </div>
  );
}
