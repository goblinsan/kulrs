import { type AssignedColor } from '@kulrs/shared';
import { useState } from 'react';
import { oklchToHex, getTextColor } from '../../utils/colorUtils';
import './ColorSwatch.css';

interface ColorSwatchProps {
  color: AssignedColor;
}

export function ColorSwatch({ color }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);
  const hex = oklchToHex(color.color);
  const textColor = getTextColor(hex);

  const handleCopy = () => {
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

  return (
    <div className="color-swatch">
      <div
        className="swatch-color"
        style={{ backgroundColor: hex, color: textColor }}
        onClick={handleCopy}
      >
        <span className={`swatch-hex ${copied ? 'copied' : ''}`}>
          {copied ? '✓ Copied' : hex}
        </span>
      </div>
      <div className="swatch-label">{color.role}</div>
    </div>
  );
}
